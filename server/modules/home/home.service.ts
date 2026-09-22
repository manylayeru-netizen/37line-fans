import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { eq, desc, and, sql } from 'drizzle-orm';

import { calendarEvents, collectionCards, diaryEntries, reviewSettings } from '@server/database/tables';
import type {
  OnThisDayResponse,
  OnThisDayCalendarEvent,
  OnThisDayPhoto,
  OnThisDayDiaryEntry,
  ReviewSettings,
} from '@shared/api.interface';
import { toDateStringRequired } from '@server/common/utils/date';

type CalendarRow = typeof calendarEvents.$inferSelect;
type CollectionRow = typeof collectionCards.$inferSelect;
type DiaryRow = typeof diaryEntries.$inferSelect;

function getShanghaiDate(month?: number, day?: number): { month: number; day: number } {
  if (month !== undefined && day !== undefined) {
    return { month, day };
  }
  // Asia/Shanghai offset: UTC+8
  const now = new Date();
  const shanghaiTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return {
    month: shanghaiTime.getUTCMonth() + 1,
    day: shanghaiTime.getUTCDate(),
  };
}

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: MySql2Database,
  ) {}

  async getOnThisDay(monthParam?: number, dayParam?: number): Promise<OnThisDayResponse> {
    const { month, day } = getShanghaiDate(monthParam, dayParam);
    const monthNum = month;
    const dayNum = day;

    const [eventRows, photoRows, diaryRows] = await Promise.all([
      this.fetchCalendarEvents(monthNum, dayNum),
      this.fetchCollectionPhotos(monthNum, dayNum),
      this.fetchDiaryEntries(monthNum, dayNum),
    ]);

    const events: OnThisDayCalendarEvent[] = eventRows.map((row: CalendarRow) => ({
      id: row.id,
      title: row.title,
      eventDate: toDateStringRequired(row.eventDate),
      description: row.description ?? undefined,
      sourceUrl: row.sourceUrl ?? undefined,
      type: 'calendar' as const,
    }));

    const photos: OnThisDayPhoto[] = photoRows.map((row: CollectionRow) => ({
      id: row.id,
      title: row.title,
      imageUrl: row.imageUrl,
      category: row.category ?? 'photocard',
      type: 'photo' as const,
    }));

    const diaryEntriesList: OnThisDayDiaryEntry[] = diaryRows.map((row: DiaryRow) => ({
      id: row.id,
      title: row.title,
      entryDate: toDateStringRequired(row.entryDate),
      weather: row.weather ?? 'sunny',
      type: 'diary' as const,
    }));

    const hasContent = events.length > 0 || photos.length > 0 || diaryEntriesList.length > 0;

    return {
      hasContent,
      month: monthNum,
      day: dayNum,
      events,
      photos,
      diaryEntries: diaryEntriesList,
    };
  }

  async getReviewSettings(): Promise<ReviewSettings> {
    const rows = await this.db
      .select()
      .from(reviewSettings)
      .where(eq(reviewSettings.id, 1))
      .limit(1);

    if (rows.length === 0) {
      return {
        diaryEnabled: true,
        literatureEnabled: true,
        collectionEnabled: true,
        calendarEnabled: true,
        guestbookEnabled: true,
      };
    }

    const row = rows[0];
    return {
      diaryEnabled: Boolean(row.diaryEnabled),
      literatureEnabled: Boolean(row.literatureEnabled),
      collectionEnabled: Boolean(row.collectionEnabled),
      calendarEnabled: Boolean(row.calendarEnabled),
      guestbookEnabled: Boolean(row.guestbookEnabled),
    };
  }

  private async fetchCalendarEvents(month: number, day: number): Promise<CalendarRow[]> {
    const rows: CalendarRow[] = await this.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          sql`EXTRACT(MONTH FROM ${calendarEvents.eventDate}) = ${month}`,
          sql`EXTRACT(DAY FROM ${calendarEvents.eventDate}) = ${day}`,
        ),
      )
      .orderBy(desc(calendarEvents.eventDate))
      .limit(10);

    return rows;
  }

  private async fetchCollectionPhotos(month: number, day: number): Promise<CollectionRow[]> {
    const rows: CollectionRow[] = await this.db
      .select()
      .from(collectionCards)
      .where(
        and(
          sql`EXTRACT(MONTH FROM ${collectionCards.createdAt}) = ${month}`,
          sql`EXTRACT(DAY FROM ${collectionCards.createdAt}) = ${day}`,
        ),
      )
      .orderBy(desc(collectionCards.createdAt))
      .limit(6);

    return rows;
  }

  private async fetchDiaryEntries(month: number, day: number): Promise<DiaryRow[]> {
    const rows: DiaryRow[] = await this.db
      .select()
      .from(diaryEntries)
      .where(
        and(
          eq(diaryEntries.status, 'published'),
          sql`EXTRACT(MONTH FROM ${diaryEntries.entryDate}) = ${month}`,
          sql`EXTRACT(DAY FROM ${diaryEntries.entryDate}) = ${day}`,
        ),
      )
      .orderBy(desc(diaryEntries.entryDate))
      .limit(5);

    return rows;
  }
}
