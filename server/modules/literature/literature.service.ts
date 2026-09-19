import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  eq,
  desc,
  asc,
  count,
  and,
  or,
  ilike,
  inArray,
  type SQL,
} from 'drizzle-orm';
import {
  literaturePosts,
  literatureTags,
  literaturePostTags,
  literatureComments,
  siteUsers,
} from '@server/database/tables';
import type {
  LiteraturePost,
  LiteratureTag,
  LiteratureComment,
  CreateLiteraturePostRequest,
  CreateLiteratureCommentRequest,
  ReviewPostRequest,
  PagedResponse,
} from '@shared/api.interface';
import { ContentFilterService } from '@server/common/services/content-filter.service';

type PostStatus = 'pending' | 'published' | 'rejected';
type CommentStatus = 'approved' | 'pending' | 'rejected';

interface PostWithAuthor {
  post: typeof literaturePosts.$inferSelect;
  author_username: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
}

interface CommentWithUser {
  comment: typeof literatureComments.$inferSelect;
  user_username: string | null;
  user_display_name: string | null;
  user_avatar_url: string | null;
}

@Injectable()
export class LiteratureService {
  private readonly logger = new Logger(LiteratureService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly contentFilter: ContentFilterService,
  ) {}

  // ==================== 标签管理 ====================

  async getTags(): Promise<LiteratureTag[]> {
    const tags = await this.db
      .select()
      .from(literatureTags)
      .orderBy(asc(literatureTags.name));
    return tags.map((t) => this.mapTag(t));
  }

  async createTag(
    name: string,
    slug: string,
    color: string,
  ): Promise<LiteratureTag> {
    // slug 唯一检查
    const existing = await this.db
      .select()
      .from(literatureTags)
      .where(
        or(eq(literatureTags.slug, slug), eq(literatureTags.name, name)),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('标签名称或 slug 已存在');
    }

    const inserted = await this.db
      .insert(literatureTags)
      .values({ name, slug, color })
      .returning();

    if (inserted.length === 0) {
      throw new BadRequestException('创建标签失败');
    }

    this.logger.log(`标签创建成功：${name}`);
    return this.mapTag(inserted[0]);
  }

  async updateTag(
    id: string,
    name?: string,
    slug?: string,
    color?: string,
  ): Promise<LiteratureTag> {
    const patch: Partial<typeof literatureTags.$inferInsert> = {};
    if (name !== undefined) patch.name = name;
    if (slug !== undefined) patch.slug = slug;
    if (color !== undefined) patch.color = color;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const updated = await this.db
      .update(literatureTags)
      .set(patch)
      .where(eq(literatureTags.id, id))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('标签不存在');
    }

    this.logger.log(`标签更新成功，id=${id}`);
    return this.mapTag(updated[0]);
  }

  async deleteTag(id: string): Promise<void> {
    const deleted = await this.db
      .delete(literatureTags)
      .where(eq(literatureTags.id, id))
      .returning({ id: literatureTags.id });

    if (deleted.length === 0) {
      throw new NotFoundException('标签不存在');
    }

    this.logger.log(`标签已删除，id=${id}`);
  }

  // ==================== 帖子（前台） ====================

  async getPublishedPosts(
    page: number,
    pageSize: number,
    tagId?: string,
    keyword?: string,
  ): Promise<PagedResponse<LiteraturePost>> {
    const offset: number = (page - 1) * pageSize;

    const statusCondition = eq(literaturePosts.status, 'published');
    const keywordCondition = keyword
      ? or(
          ilike(literaturePosts.title, `%${keyword}%`),
          ilike(literaturePosts.author, `%${keyword}%`),
        )
      : undefined;

    let postIds: string[] | undefined;

    // 如果有 tagId，先查关联表
    if (tagId) {
      const relations = await this.db
        .select({ postId: literaturePostTags.postId })
        .from(literaturePostTags)
        .where(eq(literaturePostTags.tagId, tagId));
      postIds = relations.map((r) => r.postId);

      // 如果标签下没有帖子，直接返回空
      if (postIds.length === 0) {
        return { items: [], total: 0, page, pageSize };
      }
    }

    const whereConditions: SQL[] = [statusCondition as SQL];
    if (keywordCondition) whereConditions.push(keywordCondition as SQL);
    if (postIds) whereConditions.push(inArray(literaturePosts.id, postIds) as SQL);

    const whereClause = and(...whereConditions);

    const [totalResult, posts] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(literaturePosts)
        .where(whereClause),
      this.db
        .select({
          post: literaturePosts,
          author_username: siteUsers.username,
          author_display_name: siteUsers.displayName,
          author_avatar_url: siteUsers.avatarUrl,
        })
        .from(literaturePosts)
        .leftJoin(siteUsers, eq(literaturePosts.authorUserId, siteUsers.id))
        .where(whereClause)
        .orderBy(desc(literaturePosts.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total: number = Number(totalResult[0]?.count ?? 0);
    const items = await this.attachTagsToPosts(
      posts.map((p) => this.mapPostJoined(p)),
    );

    return { items, total, page, pageSize };
  }

  async getPostDetail(id: string): Promise<LiteraturePost> {
    const posts = await this.db
      .select({
        post: literaturePosts,
        author_username: siteUsers.username,
        author_display_name: siteUsers.displayName,
        author_avatar_url: siteUsers.avatarUrl,
      })
      .from(literaturePosts)
      .leftJoin(siteUsers, eq(literaturePosts.authorUserId, siteUsers.id))
      .where(
        and(
          eq(literaturePosts.id, id),
          eq(literaturePosts.status, 'published'),
        ),
      )
      .limit(1);

    if (posts.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    const items = await this.attachTagsToPosts([this.mapPostJoined(posts[0])]);
    return items[0];
  }

  // ==================== 帖子（登录用户提交） ====================

  async createPost(
    dto: CreateLiteraturePostRequest,
    authorUserId: string,
    userRole?: string,
  ): Promise<LiteraturePost> {
    const isAdmin: boolean = userRole === 'admin';
    // 敏感词检测
    const contentCheck = this.contentFilter.filter(dto.content);
    if (!contentCheck.clean) {
      throw new BadRequestException(
        `内容包含敏感词：${contentCheck.foundWords.join('、')}`,
      );
    }

    const titleCheck = this.contentFilter.filter(dto.title);
    if (!titleCheck.clean) {
      throw new BadRequestException(
        `标题包含敏感词：${titleCheck.foundWords.join('、')}`,
      );
    }

    if (dto.recommendationReason) {
      const reasonCheck = this.contentFilter.filter(dto.recommendationReason);
      if (!reasonCheck.clean) {
        throw new BadRequestException(
          `推荐理由包含敏感词：${reasonCheck.foundWords.join('、')}`,
        );
      }
    }

    // 验证标签存在
    if (dto.tagIds && dto.tagIds.length > 0) {
      const tags = await this.db
        .select({ id: literatureTags.id })
        .from(literatureTags)
        .where(inArray(literatureTags.id, dto.tagIds));
      if (tags.length !== dto.tagIds.length) {
        throw new BadRequestException('部分标签不存在');
      }
    }

    const result = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(literaturePosts)
        .values({
          title: dto.title,
          author: dto.author,
          sourcePlatform: dto.sourcePlatform,
          content: dto.content,
          recommendationReason: dto.recommendationReason,
          authorUserId,
          status: isAdmin ? 'published' : 'pending',
        })
        .returning();

      if (inserted.length === 0) {
        throw new BadRequestException('帖子创建失败');
      }

      const postId: string = inserted[0].id;

      // 关联标签
      if (dto.tagIds && dto.tagIds.length > 0) {
        const tagRelations = dto.tagIds.map((tagId: string) => ({
          postId,
          tagId,
        }));
        await tx.insert(literaturePostTags).values(tagRelations);
      }

      return inserted[0];
    });

    this.logger.log(
      `帖子提交成功，id=${result.id}，作者=${authorUserId}，status=${isAdmin ? 'published' : 'pending'}`,
    );
    const items = await this.attachTagsToPosts([await this.findPostWithAuthorById(result.id)]);
    return items[0];
  }

  // ==================== 帖子（管理员） ====================

  async getAdminPosts(
    page: number,
    pageSize: number,
    status?: string,
    keyword?: string,
  ): Promise<PagedResponse<LiteraturePost>> {
    const offset: number = (page - 1) * pageSize;

    const statusCondition =
      status && status !== 'all'
        ? eq(literaturePosts.status, status as PostStatus)
        : undefined;

    const keywordCondition = keyword
      ? or(
          ilike(literaturePosts.title, `%${keyword}%`),
          ilike(literaturePosts.author, `%${keyword}%`),
        )
      : undefined;

    const conditions: SQL[] = [];
    if (statusCondition) conditions.push(statusCondition as SQL);
    if (keywordCondition) conditions.push(keywordCondition as SQL);

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, posts] = await Promise.all([
      whereClause
        ? this.db
            .select({ count: count() })
            .from(literaturePosts)
            .where(whereClause)
        : this.db.select({ count: count() }).from(literaturePosts),
      (whereClause
        ? this.db
            .select({
              post: literaturePosts,
              author_username: siteUsers.username,
              author_display_name: siteUsers.displayName,
              author_avatar_url: siteUsers.avatarUrl,
            })
            .from(literaturePosts)
            .leftJoin(siteUsers, eq(literaturePosts.authorUserId, siteUsers.id))
            .where(whereClause)
        : this.db
            .select({
              post: literaturePosts,
              author_username: siteUsers.username,
              author_display_name: siteUsers.displayName,
              author_avatar_url: siteUsers.avatarUrl,
            })
            .from(literaturePosts)
            .leftJoin(siteUsers, eq(literaturePosts.authorUserId, siteUsers.id))
      )
        .orderBy(desc(literaturePosts.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total: number = Number(totalResult[0]?.count ?? 0);
    const items = await this.attachTagsToPosts(
      posts.map((p) => this.mapPostJoined(p)),
    );

    return { items, total, page, pageSize };
  }

  async reviewPost(
    id: string,
    dto: ReviewPostRequest,
  ): Promise<LiteraturePost> {
    if (dto.status !== 'published' && dto.status !== 'rejected') {
      throw new BadRequestException('无效的审核状态');
    }

    const patch: Partial<typeof literaturePosts.$inferInsert> = {
      status: dto.status,
      reviewedAt: new Date(),
    };

    if (dto.status === 'rejected') {
      patch.rejectReason = dto.rejectReason ?? '';
    }

    const updated = await this.db
      .update(literaturePosts)
      .set(patch)
      .where(eq(literaturePosts.id, id))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    this.logger.log(
      `帖子审核完成，id=${id}，status=${dto.status}`,
    );
    const items = await this.attachTagsToPosts([await this.findPostWithAuthorById(id)]);
    return items[0];
  }

  async updatePostByAdmin(
    id: string,
    dto: Partial<CreateLiteraturePostRequest> & { status?: string },
  ): Promise<LiteraturePost> {
    const patch: Partial<typeof literaturePosts.$inferInsert> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.author !== undefined) patch.author = dto.author;
    if (dto.sourcePlatform !== undefined)
      patch.sourcePlatform = dto.sourcePlatform;
    if (dto.content !== undefined) patch.content = dto.content;
    if (dto.recommendationReason !== undefined)
      patch.recommendationReason = dto.recommendationReason;
    if (dto.status !== undefined) patch.status = dto.status as PostStatus;

    const hasPostUpdate = Object.keys(patch).length > 0;
    const hasTagUpdate = dto.tagIds !== undefined;

    if (!hasPostUpdate && !hasTagUpdate) {
      throw new BadRequestException('未提供可更新字段');
    }

    const result = await this.db.transaction(async (tx) => {
      let postRow: typeof literaturePosts.$inferSelect | undefined;

      if (hasPostUpdate) {
        const updated = await tx
          .update(literaturePosts)
          .set(patch)
          .where(eq(literaturePosts.id, id))
          .returning();

        if (updated.length === 0) {
          throw new NotFoundException('帖子不存在');
        }
        postRow = updated[0];
      } else {
        const existing = await tx
          .select()
          .from(literaturePosts)
          .where(eq(literaturePosts.id, id))
          .limit(1);
        if (existing.length === 0) {
          throw new NotFoundException('帖子不存在');
        }
        postRow = existing[0];
      }

      if (hasTagUpdate && dto.tagIds) {
        // 先删除旧关联
        await tx
          .delete(literaturePostTags)
          .where(eq(literaturePostTags.postId, id));

        // 验证标签
        if (dto.tagIds.length > 0) {
          const tags = await tx
            .select({ id: literatureTags.id })
            .from(literatureTags)
            .where(inArray(literatureTags.id, dto.tagIds));
          if (tags.length !== dto.tagIds.length) {
            throw new BadRequestException('部分标签不存在');
          }

          const tagRelations = dto.tagIds.map((tagId: string) => ({
            postId: id,
            tagId,
          }));
          await tx.insert(literaturePostTags).values(tagRelations);
        }
      }

      return postRow;
    });

    this.logger.log(`帖子已更新，id=${id}`);
    const items = await this.attachTagsToPosts([await this.findPostWithAuthorById(id)]);
    return items[0];
  }

  async deletePost(id: string, userId?: string, isAdmin: boolean = false): Promise<void> {
    // 如果不是管理员，验证是否是作者本人
    if (!isAdmin && userId) {
      const existing = await this.db
        .select({ authorUserId: literaturePosts.authorUserId })
        .from(literaturePosts)
        .where(eq(literaturePosts.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw new NotFoundException('帖子不存在');
      }

      if (existing[0].authorUserId !== userId) {
        throw new ForbiddenException('无权限删除他人帖子');
      }
    }

    const deleted = await this.db
      .delete(literaturePosts)
      .where(eq(literaturePosts.id, id))
      .returning({ id: literaturePosts.id });

    if (deleted.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    this.logger.log(`帖子已删除，id=${id}`);
  }

  // ==================== 评论 ====================

  async getPostComments(
    postId: string,
    page: number,
    pageSize: number,
  ): Promise<PagedResponse<LiteratureComment>> {
    const offset: number = (page - 1) * pageSize;

    // 验证帖子存在且已发布
    const post = await this.db
      .select({ id: literaturePosts.id })
      .from(literaturePosts)
      .where(
        and(
          eq(literaturePosts.id, postId),
          eq(literaturePosts.status, 'published'),
        ),
      )
      .limit(1);

    if (post.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    const [totalResult, comments] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(literatureComments)
        .where(
          and(
            eq(literatureComments.postId, postId),
            eq(literatureComments.status, 'approved'),
          ),
        ),
      this.db
        .select({
          comment: literatureComments,
          user_username: siteUsers.username,
          user_display_name: siteUsers.displayName,
          user_avatar_url: siteUsers.avatarUrl,
        })
        .from(literatureComments)
        .leftJoin(siteUsers, eq(literatureComments.userId, siteUsers.id))
        .where(
          and(
            eq(literatureComments.postId, postId),
            eq(literatureComments.status, 'approved'),
          ),
        )
        .orderBy(asc(literatureComments.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: comments.map((c) => this.mapCommentJoined(c)),
      total,
      page,
      pageSize,
    };
  }

  async createComment(
    postId: string,
    content: string,
    guestName?: string,
    userId?: string,
  ): Promise<LiteratureComment> {
    // 验证帖子存在且已发布
    const post = await this.db
      .select({ id: literaturePosts.id })
      .from(literaturePosts)
      .where(
        and(
          eq(literaturePosts.id, postId),
          eq(literaturePosts.status, 'published'),
        ),
      )
      .limit(1);

    if (post.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    // 敏感词检测
    const contentCheck = this.contentFilter.filter(content);
    if (!contentCheck.clean) {
      throw new BadRequestException(
        `评论包含敏感词：${contentCheck.foundWords.join('、')}`,
      );
    }

    if (guestName) {
      const nameCheck = this.contentFilter.filter(guestName);
      if (!nameCheck.clean) {
        throw new BadRequestException(
          `昵称包含敏感词：${nameCheck.foundWords.join('、')}`,
        );
      }
    }

    // 匿名必须填昵称
    if (!userId && !guestName) {
      throw new BadRequestException('匿名评论请填写昵称');
    }

    const inserted = await this.db
      .insert(literatureComments)
      .values({
        postId,
        content,
        userId: userId ?? undefined,
        guestName: guestName ?? undefined,
        status: 'approved',
      })
      .returning();

    if (inserted.length === 0) {
      throw new BadRequestException('评论发表失败');
    }

    this.logger.log(`评论发表成功，id=${inserted[0].id}`);
    return this.findCommentWithUserById(inserted[0].id);
  }

  async getAdminComments(
    page: number,
    pageSize: number,
    status?: string,
  ): Promise<PagedResponse<LiteratureComment>> {
    const offset: number = (page - 1) * pageSize;

    const statusCondition =
      status && status !== 'all'
        ? eq(literatureComments.status, status as CommentStatus)
        : undefined;

    const [totalResult, comments] = await Promise.all([
      statusCondition
        ? this.db
            .select({ count: count() })
            .from(literatureComments)
            .where(statusCondition)
        : this.db.select({ count: count() }).from(literatureComments),
      (statusCondition
        ? this.db
            .select({
              comment: literatureComments,
              user_username: siteUsers.username,
              user_display_name: siteUsers.displayName,
              user_avatar_url: siteUsers.avatarUrl,
            })
            .from(literatureComments)
            .leftJoin(siteUsers, eq(literatureComments.userId, siteUsers.id))
            .where(statusCondition)
        : this.db
            .select({
              comment: literatureComments,
              user_username: siteUsers.username,
              user_display_name: siteUsers.displayName,
              user_avatar_url: siteUsers.avatarUrl,
            })
            .from(literatureComments)
            .leftJoin(siteUsers, eq(literatureComments.userId, siteUsers.id))
      )
        .orderBy(desc(literatureComments.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: comments.map((c) => this.mapCommentJoined(c)),
      total,
      page,
      pageSize,
    };
  }

  async deleteComment(id: string): Promise<void> {
    const deleted = await this.db
      .delete(literatureComments)
      .where(eq(literatureComments.id, id))
      .returning({ id: literatureComments.id });

    if (deleted.length === 0) {
      throw new NotFoundException('评论不存在');
    }

    this.logger.log(`评论已删除，id=${id}`);
  }

  // ==================== 辅助方法 ====================

  /** 为帖子批量附加标签信息 */
  private async attachTagsToPosts(
    posts: LiteraturePost[],
  ): Promise<LiteraturePost[]> {
    if (posts.length === 0) return posts;

    const postIds: string[] = posts.map((p) => p.id);

    const relations = await this.db
      .select()
      .from(literaturePostTags)
      .where(inArray(literaturePostTags.postId, postIds));

    if (relations.length === 0) {
      return posts.map((p) => ({ ...p, tags: [] }));
    }

    const tagIds: string[] = relations.map((r) => r.tagId);
    const uniqueTagIds = [...new Set(tagIds)];

    const tagRows = await this.db
      .select()
      .from(literatureTags)
      .where(inArray(literatureTags.id, uniqueTagIds));

    const tagMap = new Map<string, LiteratureTag>();
    for (const tag of tagRows) {
      tagMap.set(tag.id, this.mapTag(tag));
    }

    const tagsByPost = new Map<string, LiteratureTag[]>();
    for (const rel of relations) {
      const tag = tagMap.get(rel.tagId);
      if (tag) {
        const arr = tagsByPost.get(rel.postId) ?? [];
        arr.push(tag);
        tagsByPost.set(rel.postId, arr);
      }
    }

    return posts.map((p) => ({
      ...p,
      tags: tagsByPost.get(p.id) ?? [],
    }));
  }

  private mapTag(row: typeof literatureTags.$inferSelect): LiteratureTag {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      color: row.color ?? '#F4A261',
    };
  }

  private mapPost(
    row: typeof literaturePosts.$inferSelect,
  ): LiteraturePost {
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      sourcePlatform: row.sourcePlatform ?? undefined,
      content: row.content,
      recommendationReason: row.recommendationReason ?? undefined,
      status: row.status as LiteraturePost['status'],
      rejectReason: row.rejectReason ?? undefined,
      authorUserId: row.authorUserId ?? undefined,
      tags: [], // 由 attachTagsToPosts 填充
      reviewAt: row.reviewedAt ? row.reviewedAt.toISOString() : undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapPostJoined(row: PostWithAuthor): LiteraturePost {
    const author = row.author_username != null
      ? { username: row.author_username, displayName: row.author_display_name, avatarUrl: row.author_avatar_url }
      : null;
    const displayName: string | undefined = author
      ? author.displayName ?? author.username ?? undefined
      : undefined;
    return {
      id: row.post.id,
      title: row.post.title,
      author: row.post.author,
      sourcePlatform: row.post.sourcePlatform ?? undefined,
      content: row.post.content,
      recommendationReason: row.post.recommendationReason ?? undefined,
      status: row.post.status as LiteraturePost['status'],
      rejectReason: row.post.rejectReason ?? undefined,
      authorUserId: row.post.authorUserId ?? undefined,
      authorDisplayName: displayName,
      authorAvatarUrl: author?.avatarUrl ?? undefined,
      tags: [], // 由 attachTagsToPosts 填充
      reviewAt: row.post.reviewedAt ? row.post.reviewedAt.toISOString() : undefined,
      createdAt: row.post.createdAt.toISOString(),
      updatedAt: row.post.updatedAt.toISOString(),
    };
  }

  private async findPostWithAuthorById(id: string): Promise<LiteraturePost> {
    const rows = await this.db
      .select({
        post: literaturePosts,
        author_username: siteUsers.username,
        author_display_name: siteUsers.displayName,
        author_avatar_url: siteUsers.avatarUrl,
      })
      .from(literaturePosts)
      .leftJoin(siteUsers, eq(literaturePosts.authorUserId, siteUsers.id))
      .where(eq(literaturePosts.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    return this.mapPostJoined(rows[0]);
  }

  private mapComment(
    row: typeof literatureComments.$inferSelect,
  ): LiteratureComment {
    return {
      id: row.id,
      postId: row.postId,
      content: row.content,
      userId: row.userId ?? undefined,
      guestName: row.guestName ?? undefined,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapCommentJoined(row: CommentWithUser): LiteratureComment {
    const user = row.user_username != null
      ? { username: row.user_username, displayName: row.user_display_name, avatarUrl: row.user_avatar_url }
      : null;
    // 登录用户：displayName = displayName ?? username
    const displayName: string | undefined = user
      ? user.displayName ?? user.username ?? undefined
      : undefined;
    // 游客：displayName = guestName
    const finalDisplayName: string | undefined = user ? displayName : (row.comment.guestName ?? undefined);

    return {
      id: row.comment.id,
      postId: row.comment.postId,
      content: row.comment.content,
      userId: row.comment.userId ?? undefined,
      guestName: row.comment.guestName ?? undefined,
      displayName: finalDisplayName,
      avatarUrl: user?.avatarUrl ?? undefined,
      status: row.comment.status,
      createdAt: row.comment.createdAt.toISOString(),
    };
  }

  private async findCommentWithUserById(id: string): Promise<LiteratureComment> {
    const rows = await this.db
      .select({
        comment: literatureComments,
        user_username: siteUsers.username,
        user_display_name: siteUsers.displayName,
        user_avatar_url: siteUsers.avatarUrl,
      })
      .from(literatureComments)
      .leftJoin(siteUsers, eq(literatureComments.userId, siteUsers.id))
      .where(eq(literatureComments.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('评论不存在');
    }

    return this.mapCommentJoined(rows[0]);
  }
}
