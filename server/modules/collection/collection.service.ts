import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, desc, count, asc, and } from 'drizzle-orm';

import { collectionCards, siteUsers } from '@server/database/tables';
import type { CollectionCard, PagedResponse } from '@shared/api.interface';
import { AuthService } from '@server/modules/auth/auth.service';

interface CreateCollectionDto {
  title: string;
  description?: string;
  imageUrl: string;
  category?: string;
  sortOrder?: number;
  rotationDegree?: number;
}

interface UploaderInfo {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

interface UpdateCollectionDto {
  title?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  sortOrder?: number;
  rotationDegree?: number;
}

interface CollectionListParams {
  page: number;
  pageSize: number;
  category?: string;
}

type CollectionRow = typeof collectionCards.$inferSelect;

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly authService: AuthService,
  ) {}

  private toDto(row: CollectionRow): CollectionCard {
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      imageUrl: row.imageUrl,
      category: row.category ?? 'photocard',
      sortOrder: row.sortOrder ?? 0,
      rotationDegree: row.rotationDegree ?? 0,
      uploaderId: row.uploaderId ?? undefined,
      uploaderName: row.uploaderName ?? undefined,
      uploaderAvatarUrl: row.uploaderAvatarUrl ?? undefined,
    };
  }

  async getList(params: CollectionListParams): Promise<PagedResponse<CollectionCard>> {
    const { page, pageSize, category } = params;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (category) {
      conditions.push(eq(collectionCards.category, category));
    }

    const baseQuery = conditions.length > 0
      ? this.db.select().from(collectionCards).where(and(...conditions))
      : this.db.select().from(collectionCards);

    const [rows, countRows] = await Promise.all([
      baseQuery
        .orderBy(asc(collectionCards.sortOrder), desc(collectionCards.createdAt))
        .limit(pageSize)
        .offset(offset),
      conditions.length > 0
        ? this.db.select({ count: count() }).from(collectionCards).where(and(...conditions))
        : this.db.select({ count: count() }).from(collectionCards),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    const items: CollectionCard[] = rows.map((row: CollectionRow) => this.toDto(row));

    return { items, total, page, pageSize };
  }

  async getById(id: string): Promise<CollectionCard> {
    const rows: CollectionRow[] = await this.db
      .select()
      .from(collectionCards)
      .where(eq(collectionCards.id, id));

    if (rows.length === 0) {
      throw new NotFoundException('收集册卡片不存在');
    }

    return this.toDto(rows[0]);
  }

  async getCategories(): Promise<string[]> {
    const rows: { category: string | null }[] = await this.db
      .selectDistinct({ category: collectionCards.category })
      .from(collectionCards)
      .where(eq(collectionCards.category, collectionCards.category)) // 排除 null
      .orderBy(asc(collectionCards.category));

    return rows
      .filter((row: { category: string | null }) => row.category !== null)
      .map((row: { category: string | null }) => row.category as string);
  }

  async getFeatured(limit: number = 6): Promise<CollectionCard[]> {
    const rows: CollectionRow[] = await this.db
      .select()
      .from(collectionCards)
      .orderBy(asc(collectionCards.sortOrder), desc(collectionCards.createdAt))
      .limit(limit);

    return rows.map((row: CollectionRow) => this.toDto(row));
  }

  async create(
    dto: CreateCollectionDto,
    uploader?: UploaderInfo,
  ): Promise<CollectionCard> {
    const uploaderName: string | null = uploader
      ? uploader.displayName || uploader.username
      : null;

    const rows: CollectionRow[] = await this.db
      .insert(collectionCards)
      .values({
        title: dto.title,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl,
        category: dto.category ?? 'photocard',
        sortOrder: dto.sortOrder ?? 0,
        rotationDegree: dto.rotationDegree ?? 0,
        uploaderId: uploader ? uploader.id : null,
        uploaderName: uploaderName,
        uploaderAvatarUrl: uploader?.avatarUrl ?? null,
      })
      .returning();

    this.logger.log(`创建收集册卡片: ${rows[0].id}`);
    return this.toDto(rows[0]);
  }

  async createWithUploader(
    dto: CreateCollectionDto,
    userId: string,
  ): Promise<CollectionCard> {
    const userRows: { username: string; displayName: string | null; avatarUrl: string | null }[] =
      await this.db
        .select({
          username: siteUsers.username,
          displayName: siteUsers.displayName,
          avatarUrl: siteUsers.avatarUrl,
        })
        .from(siteUsers)
        .where(eq(siteUsers.id, userId))
        .limit(1);

    if (userRows.length === 0) {
      throw new BadRequestException('用户不存在');
    }

    const user: { username: string; displayName: string | null; avatarUrl: string | null } =
      userRows[0];
    const displayName: string = await this.authService.getUserDisplayName(userId);
    const uploader: UploaderInfo = {
      id: userId,
      username: user.username,
      displayName,
      avatarUrl: user.avatarUrl ?? undefined,
    };

    return this.create(dto, uploader);
  }

  async update(id: string, dto: UpdateCollectionDto): Promise<CollectionCard> {
    const patch: Partial<typeof collectionCards.$inferInsert> = {};

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description ?? null;
    if (dto.imageUrl !== undefined) patch.imageUrl = dto.imageUrl;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
    if (dto.rotationDegree !== undefined) patch.rotationDegree = dto.rotationDegree;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const rows: CollectionRow[] = await this.db
      .update(collectionCards)
      .set(patch)
      .where(eq(collectionCards.id, id))
      .returning();

    if (rows.length === 0) {
      throw new NotFoundException('收集册卡片不存在');
    }

    this.logger.log(`更新收集册卡片: ${id}`);
    return this.toDto(rows[0]);
  }

  async delete(id: string): Promise<void> {
    const rows: { id: string }[] = await this.db
      .delete(collectionCards)
      .where(eq(collectionCards.id, id))
      .returning({ id: collectionCards.id });

    if (rows.length === 0) {
      throw new NotFoundException('收集册卡片不存在');
    }

    this.logger.log(`删除收集册卡片: ${id}`);
  }
}
