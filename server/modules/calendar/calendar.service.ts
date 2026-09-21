import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { eq, asc, sql, gte, and, inArray, count, lt } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { calendarEvents, siteUsers } from '@server/database/tables';

interface CalendarWithUploader {
  event: typeof calendarEvents.$inferSelect;
  uploader_username: string | null;
  uploader_display_name: string | null;
  uploader_avatar_url: string | null;
}
import type { CalendarEvent, PagedResponse } from '@shared/api.interface';
import { AuthService } from '@server/modules/auth/auth.service';
import { toDateStringRequired, getTime } from '@server/common/utils/date';

interface CreateCalendarDto {
  title: string;
  eventDate: string;
  description?: string;
  hasCrown?: boolean;
  eventType?: string;
  sourceUrl?: string;
}

interface UpdateCalendarDto {
  title?: string;
  eventDate?: string;
  description?: string;
  hasCrown?: boolean;
  eventType?: string;
  sourceUrl?: string;
}

type CalendarRow = typeof calendarEvents.$inferSelect;

interface CalendarListRow {
  id: string;
  title: string;
  eventDate: Date | string;
  hasCrown: boolean | null;
  eventType: string | null;
  status: string;
  uploaderId: string | null;
  sourceUrl: string | null;
  uploader_username: string | null;
  uploader_display_name: string | null;
  uploader_avatar_url: string | null;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: MySql2Database,
    private readonly authService: AuthService,
  ) {}

  private toDto(
    row: CalendarRow,
    uploader?: { username: string | null; displayName: string | null; avatarUrl: string | null } | null,
  ): CalendarEvent {
    const resolvedName: string | undefined = uploader
      ? uploader.displayName ?? uploader.username ?? undefined
      : undefined;
    const resolvedAvatar: string | undefined = uploader?.avatarUrl ?? undefined;

    return {
      id: row.id,
      title: row.title,
      eventDate: toDateStringRequired(row.eventDate),
      description: row.description ?? undefined,
      hasCrown: row.hasCrown ?? false,
      eventType: row.eventType ?? 'anniversary',
      status: row.status as 'published' | 'pending' | 'rejected',
      uploaderId: row.uploaderId ?? undefined,
      uploaderName: resolvedName,
      uploaderAvatarUrl: resolvedAvatar,
      sourceUrl: row.sourceUrl ?? undefined,
    };
  }

  private mapListRow(row: CalendarListRow): CalendarEvent {
    const resolvedName: string | undefined = row.uploader_username != null
      ? (row.uploader_display_name ?? row.uploader_username ?? undefined)
      : undefined;
    const resolvedAvatar: string | undefined = row.uploader_avatar_url ?? undefined;

    return {
      id: row.id,
      title: row.title,
      eventDate: toDateStringRequired(row.eventDate),
      hasCrown: row.hasCrown ?? false,
      eventType: row.eventType ?? 'anniversary',
      status: row.status as 'published' | 'pending' | 'rejected',
      uploaderId: row.uploaderId ?? undefined,
      uploaderName: resolvedName,
      uploaderAvatarUrl: resolvedAvatar,
      sourceUrl: row.sourceUrl ?? undefined,
    };
  }

  private async findWithUploaderById(id: string): Promise<CalendarEvent> {
    const rows = await this.db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        eventDate: calendarEvents.eventDate,
        description: calendarEvents.description,
        hasCrown: calendarEvents.hasCrown,
        eventType: calendarEvents.eventType,
        status: calendarEvents.status,
        uploaderId: calendarEvents.uploaderId,
        sourceUrl: calendarEvents.sourceUrl,
        createdAt: calendarEvents.createdAt,
        uploader_username: siteUsers.username,
        uploader_display_name: siteUsers.displayName,
        uploader_avatar_url: siteUsers.avatarUrl,
      })
      .from(calendarEvents)
      .leftJoin(siteUsers, eq(calendarEvents.uploaderId, siteUsers.id))
      .where(eq(calendarEvents.id, id));

    if (rows.length === 0) {
      throw new NotFoundException('日历事件不存在');
    }

    const row = rows[0];
    const resolvedName: string | undefined = row.uploader_username != null
      ? (row.uploader_display_name ?? row.uploader_username ?? undefined)
      : undefined;
    const resolvedAvatar: string | undefined = row.uploader_avatar_url ?? undefined;

    return {
      id: row.id,
      title: row.title,
      eventDate: toDateStringRequired(row.eventDate),
      description: row.description ?? undefined,
      hasCrown: row.hasCrown ?? false,
      eventType: row.eventType ?? 'anniversary',
      status: row.status as 'published' | 'pending' | 'rejected',
      uploaderId: row.uploaderId ?? undefined,
      uploaderName: resolvedName,
      uploaderAvatarUrl: resolvedAvatar,
      sourceUrl: row.sourceUrl ?? undefined,
    };
  }

  private mapJoinedRow(row: CalendarWithUploader): CalendarEvent {
    const uploader = row.uploader_username != null
      ? { username: row.uploader_username, displayName: row.uploader_display_name, avatarUrl: row.uploader_avatar_url }
      : null;
    return this.toDto(row.event, uploader);
  }

  async getList(params: {
    year?: number;
    page: number;
    pageSize: number;
    status?: string;
  }): Promise<PagedResponse<CalendarEvent>> {
    const { year, page, pageSize, status } = params;

    const conditions = [];

    if (year !== undefined) {
      const startDate: string = `${year}-01-01`;
      const endDate: string = `${year + 1}-01-01`;
      conditions.push(sql`${calendarEvents.eventDate} >= ${startDate}`);
      conditions.push(sql`${calendarEvents.eventDate} < ${endDate}`);
    }

    if (status && status !== 'all') {
      conditions.push(eq(calendarEvents.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = this.db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        eventDate: calendarEvents.eventDate,
        hasCrown: calendarEvents.hasCrown,
        eventType: calendarEvents.eventType,
        status: calendarEvents.status,
        uploaderId: calendarEvents.uploaderId,
        sourceUrl: calendarEvents.sourceUrl,
        uploader_username: siteUsers.username,
        uploader_display_name: siteUsers.displayName,
        uploader_avatar_url: siteUsers.avatarUrl,
      })
      .from(calendarEvents)
      .leftJoin(siteUsers, eq(calendarEvents.uploaderId, siteUsers.id))
      .$dynamic();

    const countQuery = this.db
      .select({ total: count() })
      .from(calendarEvents)
      .$dynamic();

    if (whereClause) {
      baseQuery.where(whereClause);
      countQuery.where(whereClause);
    }

    const offset: number = (page - 1) * pageSize;
    baseQuery
      .orderBy(asc(calendarEvents.eventDate))
      .limit(pageSize)
      .offset(offset);

    const [rows, countResult] = await Promise.all([baseQuery, countQuery]);

    const items: CalendarEvent[] = (rows as CalendarListRow[]).map((row: CalendarListRow) =>
      this.mapListRow(row),
    );
    const total: number = countResult[0]?.total ?? 0;

    return { items, total, page, pageSize };
  }

  async getUpcoming(limit: number = 5): Promise<CalendarEvent[]> {
    const todayStr: string = new Date().toISOString().split('T')[0];

    const futureRows: CalendarWithUploader[] = await this.db
      .select({
        event: calendarEvents,
        uploader_username: siteUsers.username,
        uploader_display_name: siteUsers.displayName,
        uploader_avatar_url: siteUsers.avatarUrl,
      })
      .from(calendarEvents)
      .leftJoin(siteUsers, eq(calendarEvents.uploaderId, siteUsers.id))
      .where(and(sql`${calendarEvents.eventDate} >= ${todayStr}`, eq(calendarEvents.status, 'published')))
      .orderBy(asc(calendarEvents.eventDate))
      .limit(limit);

    if (futureRows.length >= limit) {
      return futureRows.map((row: CalendarWithUploader) => this.mapJoinedRow(row));
    }

    // 不足时补充已过的最近事件（从近到远）
    const remaining: number = limit - futureRows.length;
    const pastRows: CalendarWithUploader[] = await this.db
      .select({
        event: calendarEvents,
        uploader_username: siteUsers.username,
        uploader_display_name: siteUsers.displayName,
        uploader_avatar_url: siteUsers.avatarUrl,
      })
      .from(calendarEvents)
      .leftJoin(siteUsers, eq(calendarEvents.uploaderId, siteUsers.id))
      .where(and(sql`${calendarEvents.eventDate} < ${todayStr}`, eq(calendarEvents.status, 'published')))
      .orderBy(sql`${calendarEvents.eventDate} DESC`)
      .limit(remaining);

    const combined: CalendarWithUploader[] = [...futureRows, ...pastRows];
    return combined
      .sort((a: CalendarWithUploader, b: CalendarWithUploader) =>
        getTime(a.event.eventDate) - getTime(b.event.eventDate),
      )
      .map((row: CalendarWithUploader) => this.mapJoinedRow(row));
  }

  async getById(id: string): Promise<CalendarEvent> {
    return this.findWithUploaderById(id);
  }

  async create(dto: CreateCalendarDto): Promise<CalendarEvent> {
    const id: string = randomUUID();
    await this.db
      .insert(calendarEvents)
      .values({
        id,
        title: dto.title,
        eventDate: new Date(dto.eventDate),
        description: dto.description ?? null,
        hasCrown: dto.hasCrown ?? false,
        eventType: dto.eventType ?? 'anniversary',
        sourceUrl: dto.sourceUrl ?? null,
      });

    this.logger.log(`创建日历事件: ${id}`);
    return this.findWithUploaderById(id);
  }

  async createWithUploader(
    dto: CreateCalendarDto,
    userId: string,
    isAdmin: boolean,
    reviewEnabled: boolean,
  ): Promise<CalendarEvent> {
    const userRows: { username: string; displayName: string | null; avatarUrl: string | null }[] =
      await this.db
        .select({
          username: siteUsers.username,
          displayName: siteUsers.displayName,
          avatarUrl: siteUsers.avatarUrl,
        })
        .from(siteUsers)
        .where(eq(siteUsers.id, userId));

    const uploaderName: string | null =
      userRows.length > 0
        ? await this.authService.getUserDisplayName(userId)
        : null;
    const uploaderAvatarUrl: string | null =
      userRows.length > 0 ? userRows[0].avatarUrl : null;

    const eventStatus: 'published' | 'pending' = isAdmin
      ? 'published'
      : reviewEnabled
        ? 'pending'
        : 'published';

    const id: string = randomUUID();
    await this.db
      .insert(calendarEvents)
      .values({
        id,
        title: dto.title,
        eventDate: new Date(dto.eventDate),
        description: dto.description ?? null,
        hasCrown: dto.hasCrown ?? false,
        eventType: dto.eventType ?? 'anniversary',
        uploaderId: userId,
        uploaderName,
        uploaderAvatarUrl,
        sourceUrl: dto.sourceUrl ?? null,
        status: eventStatus,
      });

    this.logger.log(`创建日历事件(用户上传): ${id}, 用户: ${userId}, 状态: ${eventStatus}`);
    return this.findWithUploaderById(id);
  }

  async reviewEvent(
    id: string,
    status: 'published' | 'rejected',
  ): Promise<CalendarEvent> {
    const result = await this.db
      .update(calendarEvents)
      .set({ status })
      .where(eq(calendarEvents.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('日历事件不存在');
    }

    this.logger.log(`审核日历事件: ${id}, 状态: ${status}`);
    return this.findWithUploaderById(id);
  }

  async update(id: string, dto: UpdateCalendarDto): Promise<CalendarEvent> {
    const patch: Partial<typeof calendarEvents.$inferInsert> = {};

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.eventDate !== undefined) patch.eventDate = new Date(dto.eventDate);
    if (dto.description !== undefined) patch.description = dto.description ?? null;
    if (dto.hasCrown !== undefined) patch.hasCrown = dto.hasCrown;
    if (dto.eventType !== undefined) patch.eventType = dto.eventType;
    if (dto.sourceUrl !== undefined) patch.sourceUrl = dto.sourceUrl ?? null;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const result = await this.db
      .update(calendarEvents)
      .set(patch)
      .where(eq(calendarEvents.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('日历事件不存在');
    }

    this.logger.log(`更新日历事件: ${id}`);
    return this.findWithUploaderById(id);
  }

  async delete(id: string): Promise<void> {
    const result = await this.db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('日历事件不存在');
    }

    this.logger.log(`删除日历事件: ${id}`);
  }

  async batchCreate(dtos: CreateCalendarDto[]): Promise<{ items: CalendarEvent[]; createdCount: number }> {
    if (dtos.length === 0) {
      return { items: [], createdCount: 0 };
    }

    const ids: string[] = dtos.map(() => randomUUID());
    const values = dtos.map((dto: CreateCalendarDto, index: number) => ({
      id: ids[index],
      title: dto.title,
      eventDate: new Date(dto.eventDate),
      description: dto.description ?? null,
      hasCrown: dto.hasCrown ?? false,
      eventType: dto.eventType ?? 'anniversary',
      sourceUrl: dto.sourceUrl ?? null,
    }));

    await this.db
      .insert(calendarEvents)
      .values(values);

    // 批量创建后逐个 join 返回最新数据（数量通常不大）
    const joined = await this.db
      .select({
        event: calendarEvents,
        uploader_username: siteUsers.username,
        uploader_display_name: siteUsers.displayName,
        uploader_avatar_url: siteUsers.avatarUrl,
      })
      .from(calendarEvents)
      .leftJoin(siteUsers, eq(calendarEvents.uploaderId, siteUsers.id))
      .where(inArray(calendarEvents.id, ids));

    const items: CalendarEvent[] = joined.map((row: CalendarWithUploader) => this.mapJoinedRow(row));
    this.logger.log(`批量创建日历事件: ${ids.length} 条`);
    return { items, createdCount: ids.length };
  }
}
