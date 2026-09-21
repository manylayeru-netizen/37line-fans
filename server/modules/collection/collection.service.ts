import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { eq, desc, count, asc, and, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

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
  thumbX?: number;
  thumbY?: number;
  thumbW?: number;
  thumbH?: number;
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
  thumbX?: number;
  thumbY?: number;
  thumbW?: number;
  thumbH?: number;
  status?: 'published' | 'pending' | 'rejected';
}

interface CollectionListParams {
  page: number;
  pageSize: number;
  category?: string;
  status?: string;
}

type CollectionRow = typeof collectionCards.$inferSelect;

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: MySql2Database,
    private readonly authService: AuthService,
  ) {}

  private toDto(
    row: CollectionRow,
    uploader?: { username: string | null; displayName: string | null; avatarUrl: string | null } | null,
  ): CollectionCard {
    const resolvedName: string | undefined = uploader
      ? uploader.displayName ?? uploader.username ?? undefined
      : undefined;
    const resolvedAvatar: string | undefined = uploader?.avatarUrl ?? undefined;

    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      imageUrl: row.imageUrl,
      category: row.category ?? 'photocard',
      status: row.status as 'published' | 'pending' | 'rejected',
      sortOrder: row.sortOrder ?? 0,
      rotationDegree: row.rotationDegree ?? 0,
      thumbX: row.thumbX ?? undefined,
      thumbY: row.thumbY ?? undefined,
      thumbW: row.thumbW ?? undefined,
      thumbH: row.thumbH ?? undefined,
      uploaderId: row.uploaderId ?? undefined,
      uploaderName: resolvedName,
      uploaderAvatarUrl: resolvedAvatar,
    };
  }

  private toListDto(
    row: {
      id: string;
      title: string;
      imageUrl: string | null;
      category: string | null;
      status: string;
      sortOrder: number | null;
      rotationDegree: number | null;
      thumbX: number | null;
      thumbY: number | null;
      thumbW: number | null;
      thumbH: number | null;
      uploaderId: string | null;
      uploaderName: string | null;
      uploaderAvatarUrl: string | null;
      uploader_username: string | null;
      uploader_display_name: string | null;
      uploader_avatar_url: string | null;
    },
  ): CollectionCard {
    const uploader = row.uploader_username != null
      ? { username: row.uploader_username, displayName: row.uploader_display_name, avatarUrl: row.uploader_avatar_url }
      : null;
    const resolvedName: string | undefined = uploader
      ? uploader.displayName ?? uploader.username ?? undefined
      : undefined;
    const resolvedAvatar: string | undefined = uploader?.avatarUrl ?? undefined;

    return {
      id: row.id,
      title: row.title,
      imageUrl: row.imageUrl ?? '',
      category: row.category ?? 'photocard',
      status: row.status as 'published' | 'pending' | 'rejected',
      sortOrder: row.sortOrder ?? 0,
      rotationDegree: row.rotationDegree ?? 0,
      thumbX: row.thumbX ?? undefined,
      thumbY: row.thumbY ?? undefined,
      thumbW: row.thumbW ?? undefined,
      thumbH: row.thumbH ?? undefined,
      uploaderId: row.uploaderId ?? undefined,
      uploaderName: resolvedName,
      uploaderAvatarUrl: resolvedAvatar,
    };
  }

  private async findWithUploaderById(id: string): Promise<CollectionCard> {
    const rows = await this.db
      .select({
        card: collectionCards,
        uploader_username: siteUsers.username,
        uploader_display_name: siteUsers.displayName,
        uploader_avatar_url: siteUsers.avatarUrl,
      })
      .from(collectionCards)
      .leftJoin(siteUsers, eq(collectionCards.uploaderId, siteUsers.id))
      .where(eq(collectionCards.id, id));

    if (rows.length === 0) {
      throw new NotFoundException('收集册卡片不存在');
    }

    const row = rows[0];
    const uploader = row.uploader_username != null
      ? { username: row.uploader_username, displayName: row.uploader_display_name, avatarUrl: row.uploader_avatar_url }
      : null;
    return this.toDto(row.card, uploader);
  }

  async getList(params: CollectionListParams): Promise<PagedResponse<CollectionCard>> {
    const { page, pageSize, category, status } = params;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (category) {
      conditions.push(eq(collectionCards.category, category));
    }
    if (status && status !== 'all') {
      conditions.push(eq(collectionCards.status, status));
    }

    const selectColumns = {
      id: collectionCards.id,
      title: collectionCards.title,
      imageUrl: collectionCards.imageUrl,
      category: collectionCards.category,
      status: collectionCards.status,
      sortOrder: collectionCards.sortOrder,
      rotationDegree: collectionCards.rotationDegree,
      thumbX: collectionCards.thumbX,
      thumbY: collectionCards.thumbY,
      thumbW: collectionCards.thumbW,
      thumbH: collectionCards.thumbH,
      uploaderId: collectionCards.uploaderId,
      uploaderName: collectionCards.uploaderName,
      uploaderAvatarUrl: collectionCards.uploaderAvatarUrl,
      uploader_username: siteUsers.username,
      uploader_display_name: siteUsers.displayName,
      uploader_avatar_url: siteUsers.avatarUrl,
    };

    const baseQuery = conditions.length > 0
      ? this.db
          .select(selectColumns)
          .from(collectionCards)
          .leftJoin(siteUsers, eq(collectionCards.uploaderId, siteUsers.id))
          .where(and(...conditions))
      : this.db
          .select(selectColumns)
          .from(collectionCards)
          .leftJoin(siteUsers, eq(collectionCards.uploaderId, siteUsers.id));

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
    const items: CollectionCard[] = rows.map((row) => this.toListDto(row));

    return { items, total, page, pageSize };
  }

  async getById(id: string): Promise<CollectionCard> {
    return this.findWithUploaderById(id);
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
    const rows = await this.db
      .select({
        id: collectionCards.id,
        title: collectionCards.title,
        imageUrl: collectionCards.imageUrl,
        category: collectionCards.category,
        sortOrder: collectionCards.sortOrder,
        rotationDegree: collectionCards.rotationDegree,
        thumbX: collectionCards.thumbX,
        thumbY: collectionCards.thumbY,
        thumbW: collectionCards.thumbW,
        thumbH: collectionCards.thumbH,
        uploaderId: collectionCards.uploaderId,
        uploader_username: siteUsers.username,
        uploader_display_name: siteUsers.displayName,
        uploader_avatar_url: siteUsers.avatarUrl,
      })
      .from(collectionCards)
      .leftJoin(siteUsers, eq(collectionCards.uploaderId, siteUsers.id))
      .where(and(
        sql`TRIM(${collectionCards.category}) = ${'官图'}`,
        eq(collectionCards.status, 'published'),
      ))
      .orderBy(asc(collectionCards.sortOrder), desc(collectionCards.createdAt))
      .limit(limit);

    return rows.map((row) => {
      const uploader = row.uploader_username != null
        ? { username: row.uploader_username, displayName: row.uploader_display_name, avatarUrl: row.uploader_avatar_url }
        : null;
      const resolvedName: string | undefined = uploader
        ? uploader.displayName ?? uploader.username ?? undefined
        : undefined;
      const resolvedAvatar: string | undefined = uploader?.avatarUrl ?? undefined;
      return {
        id: row.id,
        title: row.title,
        imageUrl: row.imageUrl,
        category: row.category ?? 'photocard',
        status: 'published' as const,
        sortOrder: row.sortOrder ?? 0,
        rotationDegree: row.rotationDegree ?? 0,
        thumbX: row.thumbX ?? undefined,
        thumbY: row.thumbY ?? undefined,
        thumbW: row.thumbW ?? undefined,
        thumbH: row.thumbH ?? undefined,
        uploaderId: row.uploaderId ?? undefined,
        uploaderName: resolvedName,
        uploaderAvatarUrl: resolvedAvatar,
      };
    });
  }

  async create(
    dto: CreateCollectionDto,
    uploader?: UploaderInfo,
    options: { isAdmin: boolean; reviewEnabled: boolean } = { isAdmin: false, reviewEnabled: true },
  ): Promise<CollectionCard> {
    const uploaderName: string | null = uploader
      ? uploader.displayName || uploader.username
      : null;

    // TODO: 接入审核设置（从 settings 表或配置中读取 collectionEnabled 开关）
    const { isAdmin, reviewEnabled } = options;
    const status: 'published' | 'pending' = isAdmin
      ? 'published'
      : (reviewEnabled ? 'pending' : 'published');

    const id: string = randomUUID();
    await this.db
      .insert(collectionCards)
      .values({
        id,
        title: dto.title,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl,
        category: (dto.category ?? 'photocard').trim() || 'photocard',
        status,
        sortOrder: dto.sortOrder ?? 0,
        rotationDegree: dto.rotationDegree ?? 0,
        thumbX: dto.thumbX ?? null,
        thumbY: dto.thumbY ?? null,
        thumbW: dto.thumbW ?? null,
        thumbH: dto.thumbH ?? null,
        uploaderId: uploader ? uploader.id : null,
        uploaderName: uploaderName,
        uploaderAvatarUrl: uploader?.avatarUrl ?? null,
      });

    this.logger.log(`创建收集册卡片: ${id}, status: ${status}`);
    return this.findWithUploaderById(id);
  }

  async createWithUploader(
    dto: CreateCollectionDto,
    userId: string,
    options: { isAdmin: boolean; reviewEnabled: boolean } = { isAdmin: false, reviewEnabled: true },
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

    return this.create(dto, uploader, options);
  }

  async update(id: string, dto: UpdateCollectionDto): Promise<CollectionCard> {
    const patch: Partial<typeof collectionCards.$inferInsert> = {};

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description ?? null;
    if (dto.imageUrl !== undefined) patch.imageUrl = dto.imageUrl;
    if (dto.category !== undefined) patch.category = dto.category.trim() || null;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
    if (dto.rotationDegree !== undefined) patch.rotationDegree = dto.rotationDegree;
    if (dto.thumbX !== undefined) patch.thumbX = dto.thumbX;
    if (dto.thumbY !== undefined) patch.thumbY = dto.thumbY;
    if (dto.thumbW !== undefined) patch.thumbW = dto.thumbW;
    if (dto.thumbH !== undefined) patch.thumbH = dto.thumbH;
    if (dto.status !== undefined) patch.status = dto.status;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    patch.updatedAt = new Date();

    const result = await this.db
      .update(collectionCards)
      .set(patch)
      .where(eq(collectionCards.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('收集册卡片不存在');
    }

    this.logger.log(`更新收集册卡片: ${id}`);
    return this.findWithUploaderById(id);
  }

  async reviewCard(
    id: string,
    status: 'published' | 'rejected',
  ): Promise<CollectionCard> {
    const result = await this.db
      .update(collectionCards)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(collectionCards.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('收集册卡片不存在');
    }

    this.logger.log(`审核收集册卡片: ${id}, status: ${status}`);
    return this.findWithUploaderById(id);
  }

  async delete(id: string): Promise<void> {
    const result = await this.db
      .delete(collectionCards)
      .where(eq(collectionCards.id, id));

    if (result[0].affectedRows === 0) {
      throw new NotFoundException('收集册卡片不存在');
    }

    this.logger.log(`删除收集册卡片: ${id}`);
  }
}
