import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { eq, desc, count, and } from 'drizzle-orm';

import { diaryEntries, siteUsers } from '@server/database/tables';

interface DiaryWithSubmitter {
  entry: typeof diaryEntries.$inferSelect;
  submitter_username: string | null;
  submitter_display_name: string | null;
  submitter_avatar_url: string | null;
}
import type { DiaryEntry, PagedResponse } from '@shared/api.interface';
import { AuthService } from '@server/modules/auth/auth.service';

interface CreateDiaryDto {
  title: string;
  content: string;
  weather?: string;
  entryDate: string;
  illustrationUrl?: string;
  status?: 'published' | 'draft' | 'offline';
  sortOrder?: number;
  author?: string;
  sourcePlatform?: string;
  sourceUrl?: string;
  completionStatus?: 'completed' | 'ongoing';
  contentWarnings?: string[];
  characterBackground?: string;
  recommendationReason?: string;
}

interface UpdateDiaryDto {
  title?: string;
  content?: string;
  weather?: string;
  entryDate?: string;
  illustrationUrl?: string;
  status?: 'published' | 'draft' | 'offline';
  sortOrder?: number;
  author?: string;
  sourcePlatform?: string;
  sourceUrl?: string;
  completionStatus?: 'completed' | 'ongoing';
  contentWarnings?: string[];
  characterBackground?: string;
  recommendationReason?: string;
}

interface DiaryListParams {
  page: number;
  pageSize: number;
  status?: string;
}

type DiaryRow = typeof diaryEntries.$inferSelect;

@Injectable()
export class DiaryService {
  private readonly logger = new Logger(DiaryService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: MySql2Database,
    private readonly authService: AuthService,
  ) {}

  private toDto(
    row: DiaryRow,
    submitter?: { username: string | null; displayName: string | null; avatarUrl: string | null } | null,
  ): DiaryEntry {
    const resolvedName: string | undefined = submitter
      ? submitter.displayName ?? submitter.username ?? undefined
      : undefined;
    const resolvedAvatar: string | undefined = submitter?.avatarUrl ?? undefined;

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      weather: row.weather ?? 'sunny',
      entryDate: row.entryDate.toISOString().split('T')[0],
      illustrationUrl: row.illustrationUrl ?? undefined,
      status: row.status as 'published' | 'draft' | 'offline' | 'pending' | 'rejected',
      sortOrder: row.sortOrder ?? 0,
      author: row.author ?? '',
      sourcePlatform: row.sourcePlatform ?? undefined,
      sourceUrl: row.sourceUrl ?? undefined,
      completionStatus: (row.completionStatus as 'completed' | 'ongoing') ?? 'completed',
      contentWarnings: row.contentWarnings ?? [],
      characterBackground: row.characterBackground ?? undefined,
      recommendationReason: row.recommendationReason ?? undefined,
      rejectReason: row.rejectReason ?? undefined,
      reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : undefined,
      submitterId: row.submitterId ?? undefined,
      submitterName: resolvedName,
      submitterAvatarUrl: resolvedAvatar,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async findWithSubmitterById(id: string): Promise<DiaryEntry> {
    const rows = await this.db
      .select({
        entry: diaryEntries,
        submitter_username: siteUsers.username,
        submitter_display_name: siteUsers.displayName,
        submitter_avatar_url: siteUsers.avatarUrl,
      })
      .from(diaryEntries)
      .leftJoin(siteUsers, eq(diaryEntries.submitterId, siteUsers.id))
      .where(eq(diaryEntries.id, id));

    if (rows.length === 0) {
      throw new NotFoundException('日记不存在');
    }

    const row = rows[0];
    const submitter = row.submitter_username != null
      ? { username: row.submitter_username, displayName: row.submitter_display_name, avatarUrl: row.submitter_avatar_url }
      : null;
    return this.toDto(row.entry, submitter);
  }

  private mapJoinedRow(row: DiaryWithSubmitter): DiaryEntry {
    const submitter = row.submitter_username != null
      ? { username: row.submitter_username, displayName: row.submitter_display_name, avatarUrl: row.submitter_avatar_url }
      : null;
    return this.toDto(row.entry, submitter);
  }

  async getList(params: DiaryListParams): Promise<PagedResponse<DiaryEntry>> {
    const { page, pageSize, status } = params;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (status) {
      conditions.push(eq(diaryEntries.status, status));
    }

    const baseQuery = conditions.length > 0
      ? this.db
          .select({
            entry: diaryEntries,
            submitter_username: siteUsers.username,
            submitter_display_name: siteUsers.displayName,
            submitter_avatar_url: siteUsers.avatarUrl,
          })
          .from(diaryEntries)
          .leftJoin(siteUsers, eq(diaryEntries.submitterId, siteUsers.id))
          .where(and(...conditions))
      : this.db
          .select({
            entry: diaryEntries,
            submitter_username: siteUsers.username,
            submitter_display_name: siteUsers.displayName,
            submitter_avatar_url: siteUsers.avatarUrl,
          })
          .from(diaryEntries)
          .leftJoin(siteUsers, eq(diaryEntries.submitterId, siteUsers.id));

    const [rows, countRows] = await Promise.all([
      baseQuery
        .orderBy(desc(diaryEntries.entryDate), desc(diaryEntries.sortOrder))
        .limit(pageSize)
        .offset(offset),
      conditions.length > 0
        ? this.db.select({ count: count() }).from(diaryEntries).where(and(...conditions))
        : this.db.select({ count: count() }).from(diaryEntries),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    const items: DiaryEntry[] = rows.map((row: DiaryWithSubmitter) => this.mapJoinedRow(row));

    return { items, total, page, pageSize };
  }

  async getById(id: string): Promise<DiaryEntry> {
    return this.findWithSubmitterById(id);
  }

  async getLatest(limit: number = 3): Promise<DiaryEntry[]> {
    const rows: DiaryWithSubmitter[] = await this.db
      .select({
        entry: diaryEntries,
        submitter_username: siteUsers.username,
        submitter_display_name: siteUsers.displayName,
        submitter_avatar_url: siteUsers.avatarUrl,
      })
      .from(diaryEntries)
      .leftJoin(siteUsers, eq(diaryEntries.submitterId, siteUsers.id))
      .where(eq(diaryEntries.status, 'published'))
      .orderBy(desc(diaryEntries.entryDate), desc(diaryEntries.sortOrder))
      .limit(limit);

    return rows.map((row: DiaryWithSubmitter) => this.mapJoinedRow(row));
  }

  async create(dto: CreateDiaryDto): Promise<DiaryEntry> {
    const newId = crypto.randomUUID();
    await this.db
      .insert(diaryEntries)
      .values({
        id: newId,
        title: dto.title,
        content: dto.content,
        weather: dto.weather ?? 'sunny',
        entryDate: new Date(dto.entryDate),
        illustrationUrl: dto.illustrationUrl ?? null,
        status: dto.status ?? 'published',
        sortOrder: dto.sortOrder ?? 0,
        author: dto.author ?? '',
        sourcePlatform: dto.sourcePlatform ?? null,
        sourceUrl: dto.sourceUrl ?? null,
        completionStatus: dto.completionStatus ?? 'completed',
        contentWarnings: dto.contentWarnings ?? [],
        characterBackground: dto.characterBackground ?? null,
        recommendationReason: dto.recommendationReason ?? null,
      });

    this.logger.log(`创建日记: ${newId}`);
    return this.findWithSubmitterById(newId);
  }

  async submit(
    dto: CreateDiaryDto & { submitterId?: string; submitterName?: string; userRole?: string },
  ): Promise<DiaryEntry> {
    const isAdmin: boolean = dto.userRole === 'admin';
    const status: 'published' | 'pending' = isAdmin ? 'published' : 'pending';

    let resolvedSubmitterName: string | null = null;
    if (dto.submitterId) {
      resolvedSubmitterName = await this.authService.getUserDisplayName(dto.submitterId);
    }

    const newId = crypto.randomUUID();
    await this.db
      .insert(diaryEntries)
      .values({
        id: newId,
        title: dto.title,
        content: dto.content,
        weather: dto.weather ?? 'sunny',
        entryDate: new Date(dto.entryDate),
        illustrationUrl: dto.illustrationUrl ?? null,
        status,
        sortOrder: dto.sortOrder ?? 0,
        author: dto.author ?? '',
        sourcePlatform: dto.sourcePlatform ?? null,
        sourceUrl: dto.sourceUrl ?? null,
        completionStatus: dto.completionStatus ?? 'completed',
        contentWarnings: dto.contentWarnings ?? [],
        characterBackground: dto.characterBackground ?? null,
        recommendationReason: dto.recommendationReason ?? null,
        submitterId: dto.submitterId ?? null,
        submitterName: resolvedSubmitterName,
      });

    this.logger.log(
      `用户提交推文: ${newId}，角色=${dto.userRole || 'unknown'}，状态=${status}`,
    );
    return this.findWithSubmitterById(newId);
  }

  async update(id: string, dto: UpdateDiaryDto): Promise<DiaryEntry> {
    const patch: Partial<typeof diaryEntries.$inferInsert> = {};

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.content !== undefined) patch.content = dto.content;
    if (dto.weather !== undefined) patch.weather = dto.weather;
    if (dto.entryDate !== undefined) patch.entryDate = new Date(dto.entryDate);
    if (dto.illustrationUrl !== undefined) patch.illustrationUrl = dto.illustrationUrl ?? null;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
    if (dto.author !== undefined) patch.author = dto.author;
     if (dto.sourcePlatform !== undefined) patch.sourcePlatform = dto.sourcePlatform ?? null;
     if (dto.sourceUrl !== undefined) patch.sourceUrl = dto.sourceUrl ?? null;
     if (dto.completionStatus !== undefined) patch.completionStatus = dto.completionStatus;
    if (dto.contentWarnings !== undefined) patch.contentWarnings = dto.contentWarnings;
    if (dto.characterBackground !== undefined) patch.characterBackground = dto.characterBackground ?? null;
    if (dto.recommendationReason !== undefined) patch.recommendationReason = dto.recommendationReason ?? null;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const result = await this.db
      .update(diaryEntries)
      .set(patch)
      .where(eq(diaryEntries.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('日记不存在');
    }

    this.logger.log(`更新日记: ${id}`);
    return this.findWithSubmitterById(id);
  }

  async updateStatus(id: string, status: 'published' | 'draft' | 'offline'): Promise<DiaryEntry> {
    if (!status) {
      throw new BadRequestException('status 不能为空');
    }

    const result = await this.db
      .update(diaryEntries)
      .set({ status })
      .where(eq(diaryEntries.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('日记不存在');
    }

    this.logger.log(`更新日记状态: ${id} -> ${status}`);
    return this.findWithSubmitterById(id);
  }

  async review(
    id: string,
    status: 'published' | 'rejected',
    rejectReason?: string,
  ): Promise<DiaryEntry> {
    const result = await this.db
      .update(diaryEntries)
      .set({
        status,
        rejectReason: status === 'rejected' ? (rejectReason ?? null) : null,
        reviewedAt: new Date(),
      })
      .where(eq(diaryEntries.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('推文不存在');
    }

    this.logger.log(`审核推文: ${id} -> ${status}`);
    return this.findWithSubmitterById(id);
  }

  async delete(id: string): Promise<void> {
    const result = await this.db
      .delete(diaryEntries)
      .where(eq(diaryEntries.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('日记不存在');
    }

    this.logger.log(`删除日记: ${id}`);
  }
}
