import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, inArray } from 'drizzle-orm';
import * as crypto from 'crypto';

import { siteUsers, registerApplications } from '@server/database/tables';
import type { SiteUser, RegisterRequest } from '@shared/api.interface';
import { JwtService } from '@server/common/services/jwt.service';
import { ContentFilterService } from '@server/common/services/content-filter.service';

const PASSWORD_SALT = '37line_salt';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + PASSWORD_SALT).digest('hex');
}

type SiteUserRow = typeof siteUsers.$inferSelect;

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

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly jwtService: JwtService,
    private readonly contentFilter: ContentFilterService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.initDefaultAdmin();
    } catch (error: unknown) {
      this.logger.error('初始化默认管理员失败', JSON.stringify(error));
    }
  }

  async login(username: string, password: string): Promise<{ token: string; user: SiteUser }> {
    if (!username || !password) {
      throw new BadRequestException('用户名和密码不能为空');
    }

    const users: SiteUserRow[] = await this.db
      .select()
      .from(siteUsers)
      .where(eq(siteUsers.username, username))
      .limit(1);

    if (users.length === 0) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const user: SiteUserRow = users[0];
    const hashedInput: string = hashPassword(password);

    if (user.passwordHash !== hashedInput) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('账号已被停用，请联系管理员');
    }

    const token: string = this.jwtService.sign({
      userId: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName ?? null,
    });

    return {
      token,
      user: mapSiteUser(user),
    };
  }

  async submitApplication(data: RegisterRequest): Promise<{ id: string }> {
    const { username, password, displayName, email, applicationReason } = data;

    if (!username || !password || !applicationReason) {
      throw new BadRequestException('用户名、密码和申请理由不能为空');
    }

    if (password.length < 6) {
      throw new BadRequestException('密码长度不能少于 6 位');
    }

    const filterResult = this.contentFilter.filter(applicationReason);
    if (!filterResult.clean) {
      throw new BadRequestException('申请理由包含敏感内容，请修改后重新提交');
    }

    // 用户名唯一性检查：site_users 全量 + register_applications 中 pending/approved
    const existingUsers: { username: string }[] = await this.db
      .select({ username: siteUsers.username })
      .from(siteUsers)
      .where(eq(siteUsers.username, username));

    if (existingUsers.length > 0) {
      throw new ConflictException('该用户名已被注册');
    }

    const existingApps: { username: string }[] = await this.db
      .select({ username: registerApplications.username })
      .from(registerApplications)
      .where(
        and(
          eq(registerApplications.username, username),
          inArray(registerApplications.status, ['pending', 'approved']),
        ),
      );

    if (existingApps.length > 0) {
      throw new ConflictException('该用户名已提交注册申请，请耐心等待审核');
    }

    const passwordHash: string = hashPassword(password);

    const inserted = await this.db
      .insert(registerApplications)
      .values({
        username,
        passwordHash,
        displayName: displayName ?? null,
        email: email ?? null,
        applicationReason,
        status: 'pending',
      })
      .returning({ id: registerApplications.id });

    this.logger.log(`注册申请已提交: ${username}`);
    return { id: inserted[0].id };
  }

  async getCurrentUser(userId: string): Promise<SiteUser> {
    const users: SiteUserRow[] = await this.db
      .select()
      .from(siteUsers)
      .where(eq(siteUsers.id, userId))
      .limit(1);

    if (users.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return mapSiteUser(users[0]);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    if (!oldPassword || !newPassword) {
      throw new BadRequestException('旧密码和新密码不能为空');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('新密码长度不能少于 6 位');
    }

    if (oldPassword === newPassword) {
      throw new BadRequestException('新密码不能与旧密码相同');
    }

    const users: SiteUserRow[] = await this.db
      .select()
      .from(siteUsers)
      .where(eq(siteUsers.id, userId))
      .limit(1);

    if (users.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const user: SiteUserRow = users[0];
    const oldHashed: string = hashPassword(oldPassword);

    if (user.passwordHash !== oldHashed) {
      throw new BadRequestException('旧密码错误');
    }

    const newHashed: string = hashPassword(newPassword);

    await this.db
      .update(siteUsers)
      .set({ passwordHash: newHashed })
      .where(eq(siteUsers.id, userId));

    this.logger.log(`用户 ${user.username} 修改密码成功`);
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<SiteUser> {
    if (!avatarUrl) {
      throw new BadRequestException('头像地址不能为空');
    }

    const updated = await this.db
      .update(siteUsers)
      .set({ avatarUrl })
      .where(eq(siteUsers.id, userId))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return mapSiteUser(updated[0]);
  }

  async updateDisplayName(userId: string, displayName: string): Promise<SiteUser> {
    const trimmed: string = displayName.trim();
    if (trimmed.length < 1 || trimmed.length > 20) {
      throw new BadRequestException('昵称长度需在 1-20 个字符之间');
    }

    const filterResult = this.contentFilter.filter(trimmed);
    if (!filterResult.clean) {
      throw new BadRequestException('昵称包含敏感内容，请修改后重新提交');
    }

    const updated = await this.db
      .update(siteUsers)
      .set({ displayName: trimmed })
      .where(eq(siteUsers.id, userId))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return mapSiteUser(updated[0]);
  }

  async getUserDisplayName(userId: string): Promise<string> {
    const users: SiteUserRow[] = await this.db
      .select()
      .from(siteUsers)
      .where(eq(siteUsers.id, userId))
      .limit(1);

    if (users.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return users[0].displayName ?? users[0].username;
  }

  async initDefaultAdmin(): Promise<void> {
    const existingAdmins: { id: string }[] = await this.db
      .select({ id: siteUsers.id })
      .from(siteUsers)
      .where(eq(siteUsers.role, 'admin'))
      .limit(1);

    if (existingAdmins.length > 0) {
      this.logger.log('已存在管理员账号，跳过初始化默认管理员');
      return;
    }

    const passwordHash: string = hashPassword('admin123');

    await this.db.insert(siteUsers).values({
      username: 'admin',
      passwordHash,
      role: 'admin',
      displayName: '站长',
      status: 'active',
    });

    this.logger.log('默认管理员账号已创建: admin / admin123');
  }
}

export { hashPassword };
