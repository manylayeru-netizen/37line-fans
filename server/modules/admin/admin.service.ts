import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, or, like, count, desc, gte, type SQL } from 'drizzle-orm';
import * as crypto from 'crypto';

import {
  siteUsers,
  registerApplications,
  guestbookNotes,
  literaturePosts,
} from '@server/database/tables';
import type {
  SiteUser,
  RegisterApplication,
  PagedResponse,
  ReviewApplicationRequest,
  AdminStats,
} from '@shared/api.interface';
import { hashPassword } from '../auth/auth.service';

type SiteUserRow = typeof siteUsers.$inferSelect;
type RegisterApplicationRow = typeof registerApplications.$inferSelect;

function mapSiteUser(row: SiteUserRow): SiteUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName ?? undefined,
    email: row.email ?? undefined,
    role: row.role as 'admin' | 'user',
    status: row.status as 'active' | 'disabled',
    avatarUrl: row.avatarUrl ?? undefined,
    bio: row.bio ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapRegisterApplication(row: RegisterApplicationRow): RegisterApplication {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName ?? undefined,
    email: row.email ?? undefined,
    applicationReason: row.applicationReason,
    status: row.status as 'pending' | 'approved' | 'rejected',
    rejectReason: row.rejectReason ?? undefined,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : undefined,
  };
}

function generateRandomPassword(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ===== 注册申请 =====

  async getApplications(
    page: number,
    pageSize: number,
    status?: string,
  ): Promise<PagedResponse<RegisterApplication>> {
    const pageNum = Math.max(1, page);
    const size = Math.min(100, Math.max(1, pageSize));
    const offset = (pageNum - 1) * size;

    const whereClause = status ? eq(registerApplications.status, status) : undefined;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(registerApplications)
        .where(whereClause ? whereClause : undefined),
      this.db
        .select()
        .from(registerApplications)
        .where(whereClause ? whereClause : undefined)
        .orderBy(desc(registerApplications.createdAt))
        .limit(size)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items: RegisterApplication[] = rows.map((row: RegisterApplicationRow) =>
      mapRegisterApplication(row),
    );

    return { items, total, page: pageNum, pageSize: size };
  }

  async reviewApplication(
    id: string,
    body: ReviewApplicationRequest,
    reviewerUserId: string,
  ): Promise<RegisterApplication> {
    const { status, rejectReason } = body;

    if (status !== 'approved' && status !== 'rejected') {
      throw new BadRequestException('审核状态非法');
    }

    if (status === 'rejected' && !rejectReason) {
      throw new BadRequestException('拒绝时必须填写拒绝原因');
    }

    const apps: RegisterApplicationRow[] = await this.db
      .select()
      .from(registerApplications)
      .where(eq(registerApplications.id, id))
      .limit(1);

    if (apps.length === 0) {
      throw new NotFoundException('注册申请不存在');
    }

    const app: RegisterApplicationRow = apps[0];

    if (app.status !== 'pending') {
      throw new ConflictException('该申请已审核，请勿重复操作');
    }

    const reviewedAt = new Date();

    if (status === 'approved') {
      await this.db.transaction(async (tx) => {
        // 检查用户名是否已被占用（理论上提交时已检查，但并发下再确认）
        const existingUsers: { username: string }[] = await tx
          .select({ username: siteUsers.username })
          .from(siteUsers)
          .where(eq(siteUsers.username, app.username))
          .limit(1);

        if (existingUsers.length > 0) {
          throw new ConflictException('该用户名已被注册');
        }

        // 写入 site_users
        await tx.insert(siteUsers).values({
          username: app.username,
          passwordHash: app.passwordHash,
          displayName: app.displayName ?? null,
          email: app.email ?? null,
          role: 'user',
          status: 'active',
        });

        // 更新申请状态
        await tx
          .update(registerApplications)
          .set({
            status: 'approved',
            reviewedAt,
          })
          .where(eq(registerApplications.id, id));
      });

      this.logger.log(`注册申请已通过: ${app.username} (审核人: ${reviewerUserId})`);
    } else {
      await this.db
        .update(registerApplications)
        .set({
          status: 'rejected',
          rejectReason: rejectReason ?? null,
          reviewedAt,
        })
        .where(eq(registerApplications.id, id));

      this.logger.log(`注册申请已拒绝: ${app.username} (审核人: ${reviewerUserId})`);
    }

    // 重新查询并返回
    const updated: RegisterApplicationRow[] = await this.db
      .select()
      .from(registerApplications)
      .where(eq(registerApplications.id, id))
      .limit(1);

    return mapRegisterApplication(updated[0]);
  }

  // ===== 用户管理 =====

  async getUsers(
    page: number,
    pageSize: number,
    keyword?: string,
    role?: string,
  ): Promise<PagedResponse<SiteUser>> {
    const pageNum = Math.max(1, page);
    const size = Math.min(100, Math.max(1, pageSize));
    const offset = (pageNum - 1) * size;

    const conditions: SQL[] = [];
    if (role) {
      conditions.push(eq(siteUsers.role, role));
    }
    if (keyword) {
      const searchTerm = `%${keyword}%`;
      conditions.push(
        or(
          like(siteUsers.username, searchTerm),
          like(siteUsers.displayName, searchTerm),
          like(siteUsers.email, searchTerm),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(siteUsers)
        .where(whereClause ? whereClause : undefined),
      this.db
        .select()
        .from(siteUsers)
        .where(whereClause ? whereClause : undefined)
        .orderBy(desc(siteUsers.createdAt))
        .limit(size)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items: SiteUser[] = rows.map((row: SiteUserRow) => mapSiteUser(row));

    return { items, total, page: pageNum, pageSize: size };
  }

  async updateUserRole(id: string, role: string): Promise<SiteUser> {
    if (role !== 'admin' && role !== 'user') {
      throw new BadRequestException('角色非法');
    }

    const updated = await this.db
      .update(siteUsers)
      .set({ role })
      .where(eq(siteUsers.id, id))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    this.logger.log(`用户角色已更新: ${updated[0].username} -> ${role}`);
    return mapSiteUser(updated[0]);
  }

  async updateUserStatus(id: string, status: string): Promise<SiteUser> {
    if (status !== 'active' && status !== 'disabled') {
      throw new BadRequestException('状态非法');
    }

    const updated = await this.db
      .update(siteUsers)
      .set({ status })
      .where(eq(siteUsers.id, id))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    this.logger.log(`用户状态已更新: ${updated[0].username} -> ${status}`);
    return mapSiteUser(updated[0]);
  }

  async resetUserPassword(id: string): Promise<{ newPassword: string }> {
    const users: SiteUserRow[] = await this.db
      .select()
      .from(siteUsers)
      .where(eq(siteUsers.id, id))
      .limit(1);

    if (users.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const newPassword = generateRandomPassword(8);
    const passwordHash = hashPassword(newPassword);

    await this.db
      .update(siteUsers)
      .set({ passwordHash })
      .where(eq(siteUsers.id, id));

    this.logger.log(`用户密码已重置: ${users[0].username}`);
    return { newPassword };
  }

  // ===== 统计 =====

  async getStats(): Promise<AdminStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsersResult,
      todayNewResult,
      pendingAppsResult,
      totalAppsResult,
      activeUsersResult,
      disabledUsersResult,
      pendingGuestbookResult,
      publishedLitResult,
      pendingLitResult,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(siteUsers),
      this.db
        .select({ count: count() })
        .from(siteUsers)
        .where(gte(siteUsers.createdAt, today)),
      this.db
        .select({ count: count() })
        .from(registerApplications)
        .where(eq(registerApplications.status, 'pending')),
      this.db.select({ count: count() }).from(registerApplications),
      this.db
        .select({ count: count() })
        .from(siteUsers)
        .where(eq(siteUsers.status, 'active')),
      this.db
        .select({ count: count() })
        .from(siteUsers)
        .where(eq(siteUsers.status, 'disabled')),
      this.db
        .select({ count: count() })
        .from(guestbookNotes)
        .where(eq(guestbookNotes.status, 'pending')),
      this.db
        .select({ count: count() })
        .from(literaturePosts)
        .where(eq(literaturePosts.status, 'published')),
      this.db
        .select({ count: count() })
        .from(literaturePosts)
        .where(eq(literaturePosts.status, 'pending')),
    ]);

    return {
      totalUsers: Number(totalUsersResult[0]?.count ?? 0),
      todayNewUsers: Number(todayNewResult[0]?.count ?? 0),
      pendingApplications: Number(pendingAppsResult[0]?.count ?? 0),
      totalApplications: Number(totalAppsResult[0]?.count ?? 0),
      activeUsers: Number(activeUsersResult[0]?.count ?? 0),
      disabledUsers: Number(disabledUsersResult[0]?.count ?? 0),
      pendingGuestbookCount: Number(pendingGuestbookResult[0]?.count ?? 0),
      publishedLiteratureCount: Number(publishedLitResult[0]?.count ?? 0),
      pendingLiteratureCount: Number(pendingLitResult[0]?.count ?? 0),
    };
  }
}
