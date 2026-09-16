import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, asc, sql, gte, and } from 'drizzle-orm';

import { calendarEvents, siteUsers } from '@server/database/tables';
import type { CalendarEvent } from '@shared/api.interface';
import { AuthService } from '@server/modules/auth/auth.service';

interface CreateCalendarDto {
  title: string;
  eventDate: string;
  description?: string;
  hasCrown?: boolean;
  eventType?: string;
}

interface UpdateCalendarDto {
  title?: string;
  eventDate?: string;
  description?: string;
  hasCrown?: boolean;
  eventType?: string;
}

type CalendarRow = typeof calendarEvents.$inferSelect;

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly authService: AuthService,
  ) {}

  private toDto(row: CalendarRow): CalendarEvent {
    return {
      id: row.id,
      title: row.title,
      eventDate: row.eventDate,
      description: row.description ?? undefined,
      hasCrown: row.hasCrown ?? false,
      eventType: row.eventType ?? 'anniversary',
      uploaderId: row.uploaderId ?? undefined,
      uploaderName: row.uploaderName ?? undefined,
      uploaderAvatarUrl: row.uploaderAvatarUrl ?? undefined,
    };
  }

  async getList(year?: string): Promise<CalendarEvent[]> {
    const rows: CalendarRow[] = year
      ? await this.db
          .select()
          .from(calendarEvents)
          .where(
            and(
              sql`${calendarEvents.eventDate} >= ${`${year}-01-01`}`,
              sql`${calendarEvents.eventDate} < ${`${Number(year) + 1}-01-01`}`,
            ),
          )
          .orderBy(asc(calendarEvents.eventDate))
      : await this.db
          .select()
          .from(calendarEvents)
          .orderBy(asc(calendarEvents.eventDate));

    return rows.map((row: CalendarRow) => this.toDto(row));
  }

  async getUpcoming(limit: number = 5): Promise<CalendarEvent[]> {
    // 取距离今天最近的未来事件；若不足 limit 个，补充已过的最近事件
    const today: string = new Date().toISOString().split('T')[0];

    const futureRows: CalendarRow[] = await this.db
      .select()
      .from(calendarEvents)
      .where(gte(calendarEvents.eventDate, today))
      .orderBy(asc(calendarEvents.eventDate))
      .limit(limit);

    if (futureRows.length >= limit) {
      return futureRows.map((row: CalendarRow) => this.toDto(row));
    }

    // 不足时补充已过的最近事件（从近到远）
    const remaining: number = limit - futureRows.length;
    const pastRows: CalendarRow[] = await this.db
      .select()
      .from(calendarEvents)
      .where(sql`${calendarEvents.eventDate} < ${today}`)
      .orderBy(sql`${calendarEvents.eventDate} DESC`)
      .limit(remaining);

    const combined: CalendarRow[] = [...futureRows, ...pastRows];
    return combined
      .sort((a: CalendarRow, b: CalendarRow) => a.eventDate.localeCompare(b.eventDate))
      .map((row: CalendarRow) => this.toDto(row));
  }

  async getById(id: string): Promise<CalendarEvent> {
    const rows: CalendarRow[] = await this.db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, id));

    if (rows.length === 0) {
      throw new NotFoundException('日历事件不存在');
    }

    return this.toDto(rows[0]);
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
      })
      .returning();

    this.logger.log(`创建日历事件: ${rows[0].id}`);
    return this.toDto(rows[0]);
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
      })
      .returning();

    this.logger.log(`创建日历事件(用户上传): ${rows[0].id}, 用户: ${userId}`);
    return this.toDto(rows[0]);
  }

  async update(id: string, dto: UpdateCalendarDto): Promise<CalendarEvent> {
    const patch: Partial<typeof calendarEvents.$inferInsert> = {};

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.eventDate !== undefined) patch.eventDate = dto.eventDate;
    if (dto.description !== undefined) patch.description = dto.description ?? null;
    if (dto.hasCrown !== undefined) patch.hasCrown = dto.hasCrown;
    if (dto.eventType !== undefined) patch.eventType = dto.eventType;

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
    return this.toDto(rows[0]);
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
}
