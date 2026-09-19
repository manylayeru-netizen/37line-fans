import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, asc, sql, gte, and, inArray } from 'drizzle-orm';

import { calendarEvents, siteUsers } from '@server/database/tables';

interface CalendarWithUploader {
  event: typeof calendarEvents.$inferSelect;
  uploader_username: string | null;
  uploader_display_name: string | null;
  uploader_avatar_url: string | null;
}
import type { CalendarEvent } from '@shared/api.interface';
import { AuthService } from '@server/modules/auth/auth.service';

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

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
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
      eventDate: row.eventDate,
      description: row.description ?? undefined,
      hasCrown: row.hasCrown ?? false,
      eventType: row.eventType ?? 'anniversary',
      uploaderId: row.uploaderId ?? undefined,
      uploaderName: resolvedName,
      uploaderAvatarUrl: resolvedAvatar,
      sourceUrl: row.sourceUrl ?? undefined,
    };
  }

  private async findWithUploaderById(id: string): Promise<CalendarEvent> {
    const rows = await this.db
      .select({
        event: calendarEvents,
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
    const uploader = row.uploader_username != null
      ? { username: row.uploader_username, displayName: row.uploader_display_name, avatarUrl: row.uploader_avatar_url }
      : null;
    return this.toDto(row.event, uploader);
  }

  private mapJoinedRow(row: CalendarWithUploader): CalendarEvent {
    const uploader = row.uploader_username != null
      ? { username: row.uploader_username, displayName: row.uploader_display_name, avatarUrl: row.uploader_avatar_url }
      : null;
    return this.toDto(row.event, uploader);
  }

  async getList(year?: string): Promise<CalendarEvent[]> {
    const baseSelect = this.db
      .select({
        event: calendarEvents,
        uploader_username: siteUsers.username,
        uploader_display_name: siteUsers.displayName,
        uploader_avatar_url: siteUsers.avatarUrl,
      })
      .from(calendarEvents)
      .leftJoin(siteUsers, eq(calendarEvents.uploaderId, siteUsers.id));

    const rows: CalendarWithUploader[] = year
      ? await baseSelect
          .where(
            and(
              sql`${calendarEvents.eventDate} >= ${`${year}-01-01`}`,
              sql`${calendarEvents.eventDate} < ${`${Number(year) + 1}-01-01`}`,
            ),
          )
          .orderBy(asc(calendarEvents.eventDate))
      : await baseSelect.orderBy(asc(calendarEvents.eventDate));

    return rows.map((row: CalendarWithUploader) => this.mapJoinedRow(row));
  }

  async getUpcoming(limit: number = 5): Promise<CalendarEvent[]> {
    // 取距离今天最近的未来事件；若不足 limit 个，补充已过的最近事件
    const today: string = new Date().toISOString().split('T')[0];

    const futureRows: CalendarWithUploader[] = await this.db
      .select({
        event: calendarEvents,
        uploader_username: siteUsers.username,
        uploader_display_name: siteUsers.displayName,
        uploader_avatar_url: siteUsers.avatarUrl,
      })
      .from(calendarEvents)
      .leftJoin(siteUsers, eq(calendarEvents.uploaderId, siteUsers.id))
      .where(gte(calendarEvents.eventDate, today))
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
      .where(sql`${calendarEvents.eventDate} < ${today}`)
      .orderBy(sql`${calendarEvents.eventDate} DESC`)
      .limit(remaining);

    const combined: CalendarWithUploader[] = [...futureRows, ...pastRows];
    return combined
      .sort((a: CalendarWithUploader, b: CalendarWithUploader) =>
        a.event.eventDate.localeCompare(b.event.eventDate),
      )
      .map((row: CalendarWithUploader) => this.mapJoinedRow(row));
  }

  async getById(id: string): Promise<CalendarEvent> {
    return this.findWithUploaderById(id);
  }

  async create(dto: CreateCalendarDto): Promise<CalendarEvent> {
    const rows: CalendarRow[] = await this.db
      .insert(calendarEvents)
      .values({
        title: dto.title,
        eventDate: dto.eventDate,
        description: dto.description ?? null,
        hasCrown: dto.hasCrown ?? false,
        eventType: dto.eventType ?? 'anniversary',
        sourceUrl: dto.sourceUrl ?? null,
      })
      .returning();

    this.logger.log(`创建日历事件: ${rows[0].id}`);
    return this.findWithUploaderById(rows[0].id);
  }

  async createWithUploader(
    dto: CreateCalendarDto,
    userId: string,
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

    const rows: CalendarRow[] = await this.db
      .insert(calendarEvents)
      .values({
        title: dto.title,
        eventDate: dto.eventDate,
        description: dto.description ?? null,
        hasCrown: dto.hasCrown ?? false,
        eventType: dto.eventType ?? 'anniversary',
        uploaderId: userId,
        uploaderName,
        uploaderAvatarUrl,
        sourceUrl: dto.sourceUrl ?? null,
      })
      .returning();

    this.logger.log(`创建日历事件(用户上传): ${rows[0].id}, 用户: ${userId}`);
    return this.findWithUploaderById(rows[0].id);
  }

  async update(id: string, dto: UpdateCalendarDto): Promise<CalendarEvent> {
    const patch: Partial<typeof calendarEvents.$inferInsert> = {};

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.eventDate !== undefined) patch.eventDate = dto.eventDate;
    if (dto.description !== undefined) patch.description = dto.description ?? null;
    if (dto.hasCrown !== undefined) patch.hasCrown = dto.hasCrown;
    if (dto.eventType !== undefined) patch.eventType = dto.eventType;
    if (dto.sourceUrl !== undefined) patch.sourceUrl = dto.sourceUrl ?? null;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const rows: CalendarRow[] = await this.db
      .update(calendarEvents)
      .set(patch)
      .where(eq(calendarEvents.id, id))
      .returning();

    if (rows.length === 0) {
      throw new NotFoundException('日历事件不存在');
    }

    this.logger.log(`更新日历事件: ${id}`);
    return this.findWithUploaderById(id);
  }

  async delete(id: string): Promise<void> {
    const rows: { id: string }[] = await this.db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, id))
      .returning({ id: calendarEvents.id });

    if (rows.length === 0) {
      throw new NotFoundException('日历事件不存在');
    }

    this.logger.log(`删除日历事件: ${id}`);
  }

  async batchCreate(dtos: CreateCalendarDto[]): Promise<{ items: CalendarEvent[]; createdCount: number }> {
    if (dtos.length === 0) {
      return { items: [], createdCount: 0 };
    }

    const values = dtos.map((dto: CreateCalendarDto) => ({
      title: dto.title,
      eventDate: dto.eventDate,
      description: dto.description ?? null,
      hasCrown: dto.hasCrown ?? false,
      eventType: dto.eventType ?? 'anniversary',
      sourceUrl: dto.sourceUrl ?? null,
    }));

    const rows: CalendarRow[] = await this.db
      .insert(calendarEvents)
      .values(values)
      .returning();

    // 批量创建后逐个 join 返回最新数据（数量通常不大）
    const ids: string[] = rows.map((row: CalendarRow) => row.id);
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
    this.logger.log(`批量创建日历事件: ${rows.length} 条`);
    return { items, createdCount: rows.length };
  }
}
