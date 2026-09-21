import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { eq, desc, count } from 'drizzle-orm';
import { guestbookNotes, reviewSettings } from '@server/database/tables';
import type {
  GuestbookNote,
  CreateGuestbookNoteRequest,
  PagedResponse,
} from '@shared/api.interface';
import { ContentFilterService } from '@server/common/services/content-filter.service';
import { toIsoStringRequired } from '@server/common/utils/date';
import { randomUUID } from 'crypto';

type NoteStatus = 'pending' | 'approved' | 'rejected';

@Injectable()
export class GuestbookService {
  private readonly logger = new Logger(GuestbookService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: MySql2Database,
    private readonly contentFilter: ContentFilterService,
  ) {}

  /** 已审核留言列表（公开） */
  async getApprovedNotes(
    page: number,
    pageSize: number,
  ): Promise<PagedResponse<GuestbookNote>> {
    const offset: number = (page - 1) * pageSize;

    const [totalResult, notes] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(guestbookNotes)
        .where(eq(guestbookNotes.status, 'approved')),
      this.db
        .select()
        .from(guestbookNotes)
        .where(eq(guestbookNotes.status, 'approved'))
        .orderBy(desc(guestbookNotes.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: notes.map((n) => this.mapNote(n)),
      total,
      page,
      pageSize,
    };
  }

  /** 提交留言（公开/匿名） */
  async createNote(dto: CreateGuestbookNoteRequest): Promise<GuestbookNote> {
    const filterResult = this.contentFilter.filter(dto.content);
    if (!filterResult.clean) {
      throw new BadRequestException(
        `留言包含敏感词：${filterResult.foundWords.join('、')}`,
      );
    }

    if (dto.authorName) {
      const nameFilter = this.contentFilter.filter(dto.authorName);
      if (!nameFilter.clean) {
        throw new BadRequestException(
          `昵称包含敏感词：${nameFilter.foundWords.join('、')}`,
        );
      }
    }

    const reviewEnabled = await this.getReviewEnabled('guestbook');
    const status: NoteStatus = reviewEnabled ? 'pending' : 'approved';

    const noteId: string = randomUUID();
    const authorName: string = dto.authorName || '匿名访客';
    const noteShape: string = dto.noteShape?.trim() || '🐕';
    const noteColor: string = dto.noteColor || '#FFE4B5';
    const now: Date = new Date();

    await this.db.insert(guestbookNotes).values({
      id: noteId,
      authorName,
      content: dto.content,
      noteShape,
      noteColor,
      status,
    });

    this.logger.log(`留言提交成功，id=${noteId}，status=${status}`);
    return {
      id: noteId,
      authorName,
      content: dto.content,
      noteShape,
      noteColor,
      positionX: 0,
      positionY: 0,
      status,
      createdAt: now.toISOString(),
    };
  }

  /** 管理员列表 */
  async getAdminNotes(
    page: number,
    pageSize: number,
    status?: string,
  ): Promise<PagedResponse<GuestbookNote>> {
    const offset: number = (page - 1) * pageSize;
    const filterStatus: NoteStatus | undefined =
      status && status !== 'all' ? (status as NoteStatus) : undefined;

    const whereCondition = filterStatus
      ? eq(guestbookNotes.status, filterStatus)
      : undefined;

    const baseQuery = whereCondition
      ? this.db.select().from(guestbookNotes).where(whereCondition)
      : this.db.select().from(guestbookNotes);

    const [totalResult, notes] = await Promise.all([
      whereCondition
        ? this.db
            .select({ count: count() })
            .from(guestbookNotes)
            .where(whereCondition)
        : this.db.select({ count: count() }).from(guestbookNotes),
      baseQuery.orderBy(desc(guestbookNotes.createdAt)).limit(pageSize).offset(offset),
    ]);

    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: notes.map((n) => this.mapNote(n)),
      total,
      page,
      pageSize,
    };
  }

  /** 审核通过 */
  async approveNote(id: string): Promise<GuestbookNote> {
    const result = await this.db
      .update(guestbookNotes)
      .set({ status: 'approved' })
      .where(eq(guestbookNotes.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('留言不存在');
    }

    const updated = await this.db
      .select()
      .from(guestbookNotes)
      .where(eq(guestbookNotes.id, id));

    this.logger.log(`留言审核通过，id=${id}`);
    return this.mapNote(updated[0]);
  }

  /** 审核拒绝 */
  async rejectNote(id: string): Promise<GuestbookNote> {
    const result = await this.db
      .update(guestbookNotes)
      .set({ status: 'rejected' })
      .where(eq(guestbookNotes.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('留言不存在');
    }

    const updated = await this.db
      .select()
      .from(guestbookNotes)
      .where(eq(guestbookNotes.id, id));

    this.logger.log(`留言审核拒绝，id=${id}`);
    return this.mapNote(updated[0]);
  }

  /** 用户删除自己的留言 / 管理员删除任意留言 */
  async deleteNoteByUser(
    id: string,
    userId: string,
    userRole: string,
    userDisplayName?: string | null,
    userName?: string,
  ): Promise<void> {
    const existing = await this.db
      .select()
      .from(guestbookNotes)
      .where(eq(guestbookNotes.id, id));

    if (existing.length === 0) {
      throw new NotFoundException('留言不存在');
    }

    const note = existing[0];
    const isAdmin: boolean = userRole === 'admin';
    const isOwnNoteByName: boolean =
      (userDisplayName != null && userDisplayName !== '' && note.authorName === userDisplayName) ||
      (userName != null && userName !== '' && note.authorName === userName);

    if (!isAdmin && !isOwnNoteByName) {
      throw new ForbiddenException('无权删除该留言');
    }

    const result = await this.db
      .delete(guestbookNotes)
      .where(eq(guestbookNotes.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('留言不存在');
    }

    this.logger.log(`留言已删除，id=${id}, userId=${userId}`);
  }

  /** 物理删除 */
  async deleteNote(id: string): Promise<void> {
    const result = await this.db
      .delete(guestbookNotes)
      .where(eq(guestbookNotes.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('留言不存在');
    }

    this.logger.log(`留言已删除，id=${id}`);
  }

  private async getReviewEnabled(
    module: 'diary' | 'literature' | 'collection' | 'calendar' | 'guestbook',
  ): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(reviewSettings)
      .where(eq(reviewSettings.id, 1))
      .limit(1);
    if (rows.length === 0) return true;
    const row = rows[0];
    switch (module) {
      case 'diary':
        return row.diaryEnabled;
      case 'literature':
        return row.literatureEnabled;
      case 'collection':
        return row.collectionEnabled;
      case 'calendar':
        return row.calendarEnabled;
      case 'guestbook':
        return row.guestbookEnabled;
      default:
        return true;
    }
  }

  private mapNote(
    row: typeof guestbookNotes.$inferSelect,
  ): GuestbookNote {
    return {
      id: row.id,
      authorName: row.authorName,
      content: row.content,
      noteShape: row.noteShape as GuestbookNote['noteShape'],
      noteColor: row.noteColor ?? '#FFE4B5',
      positionX: row.positionX ?? 0,
      positionY: row.positionY ?? 0,
      status: row.status as GuestbookNote['status'],
      createdAt: toIsoStringRequired(row.createdAt),
    };
  }
}
