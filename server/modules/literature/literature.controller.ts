import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { LiteratureService } from './literature.service';
import {
  AuthGuard,
  AdminGuard,
} from '@server/common/guards/auth.guard';
import { JwtService } from '@server/common/services/jwt.service';
import type {
  ApiResponse,
  LiteraturePost,
  LiteratureTag,
  LiteratureComment,
  CreateLiteraturePostRequest,
  CreateLiteratureCommentRequest,
  ReviewPostRequest,
  PagedResponse,
} from '@shared/api.interface';

@Controller('api/literature')
export class LiteratureController {
  constructor(
    private readonly literatureService: LiteratureService,
    private readonly jwtService: JwtService,
  ) {}

  // ==================== 公开 / 前台 ====================

  /** 标签列表 */
  @Get('tags')
  async getTags(): Promise<ApiResponse<LiteratureTag[]>> {
    const result = await this.literatureService.getTags();
    return { code: 0, message: 'ok', data: result };
  }

  /** 已发布帖子列表 */
  @Get('posts')
  async getPublishedPosts(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('tagId') tagId?: string,
    @Query('keyword') keyword?: string,
  ): Promise<ApiResponse<PagedResponse<LiteraturePost>>> {
    const pageNum: number = page ? parseInt(page, 10) : 1;
    const pageSizeNum: number = pageSize ? parseInt(pageSize, 10) : 10;
    const result = await this.literatureService.getPublishedPosts(
      pageNum,
      pageSizeNum,
      tagId,
      keyword,
    );
    return { code: 0, message: 'ok', data: result };
  }

  /** 帖子详情 */
  @Get('posts/:id')
  async getPostDetail(
    @Param('id') id: string,
  ): Promise<ApiResponse<LiteraturePost>> {
    const result = await this.literatureService.getPostDetail(id);
    return { code: 0, message: 'ok', data: result };
  }

  /** 帖子评论列表 */
  @Get('posts/:id/comments')
  async getPostComments(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ApiResponse<PagedResponse<LiteratureComment>>> {
    const pageNum: number = page ? parseInt(page, 10) : 1;
    const pageSizeNum: number = pageSize ? parseInt(pageSize, 10) : 20;
    const result = await this.literatureService.getPostComments(
      id,
      pageNum,
      pageSizeNum,
    );
    return { code: 0, message: 'ok', data: result };
  }

  /** 发表评论（登录/匿名都可） */
  @Post('posts/:id/comments')
  async createComment(
    @Param('id') postId: string,
    @Body() body: CreateLiteratureCommentRequest,
    @Req() req: Request,
  ): Promise<ApiResponse<LiteratureComment>> {
    // 尝试解析 token（不强制登录）
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = this.jwtService.verify(token);
      if (payload && typeof payload.userId === 'string') {
        userId = payload.userId;
      }
    }

    const result = await this.literatureService.createComment(
      postId,
      body.content,
      body.guestName,
      userId,
    );
    return { code: 0, message: 'ok', data: result };
  }

  // ==================== 登录用户 ====================

  /** 提交帖子（登录用户） */
  @Post('posts')
  @UseGuards(AuthGuard)
  async createPost(
    @Body() body: CreateLiteraturePostRequest,
    @Req() req: Request & { user: { userId: string } },
  ): Promise<ApiResponse<LiteraturePost>> {
    const { userId } = req.user;
    const result = await this.literatureService.createPost(body, userId);
    return { code: 0, message: 'ok', data: result };
  }

  // ==================== 管理员 ====================

  /** 管理帖子列表 */
  @Get('admin/posts')
  @UseGuards(AdminGuard)
  async getAdminPosts(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ): Promise<ApiResponse<PagedResponse<LiteraturePost>>> {
    const pageNum: number = page ? parseInt(page, 10) : 1;
    const pageSizeNum: number = pageSize ? parseInt(pageSize, 10) : 20;
    const result = await this.literatureService.getAdminPosts(
      pageNum,
      pageSizeNum,
      status,
      keyword,
    );
    return { code: 0, message: 'ok', data: result };
  }

  /** 审核帖子 */
  @Post('admin/posts/:id/review')
  @UseGuards(AdminGuard)
  async reviewPost(
    @Param('id') id: string,
    @Body() body: ReviewPostRequest,
  ): Promise<ApiResponse<LiteraturePost>> {
    const result = await this.literatureService.reviewPost(id, body);
    return { code: 0, message: 'ok', data: result };
  }

  /** 编辑帖子 */
  @Patch('admin/posts/:id')
  @UseGuards(AdminGuard)
  async updatePostByAdmin(
    @Param('id') id: string,
    @Body()
    body: Partial<CreateLiteraturePostRequest> & { status?: string },
  ): Promise<ApiResponse<LiteraturePost>> {
    const result = await this.literatureService.updatePostByAdmin(id, body);
    return { code: 0, message: 'ok', data: result };
  }

  /** 删除帖子 */
  @Delete('admin/posts/:id')
  @UseGuards(AdminGuard)
  async deletePost(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.literatureService.deletePost(id, undefined, true);
    return { code: 0, message: 'ok', data: null };
  }

  /** 评论管理列表 */
  @Get('admin/comments')
  @UseGuards(AdminGuard)
  async getAdminComments(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ): Promise<ApiResponse<PagedResponse<LiteratureComment>>> {
    const pageNum: number = page ? parseInt(page, 10) : 1;
    const pageSizeNum: number = pageSize ? parseInt(pageSize, 10) : 20;
    const result = await this.literatureService.getAdminComments(
      pageNum,
      pageSizeNum,
      status,
    );
    return { code: 0, message: 'ok', data: result };
  }

  /** 删除评论 */
  @Delete('admin/comments/:id')
  @UseGuards(AdminGuard)
  async deleteComment(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.literatureService.deleteComment(id);
    return { code: 0, message: 'ok', data: null };
  }

  /** 创建标签 */
  @Post('admin/tags')
  @UseGuards(AdminGuard)
  async createTag(
    @Body() body: { name: string; slug: string; color?: string },
  ): Promise<ApiResponse<LiteratureTag>> {
    const result = await this.literatureService.createTag(
      body.name,
      body.slug,
      body.color ?? '#F4A261',
    );
    return { code: 0, message: 'ok', data: result };
  }

  /** 更新标签 */
  @Patch('admin/tags/:id')
  @UseGuards(AdminGuard)
  async updateTag(
    @Param('id') id: string,
    @Body() body: { name?: string; slug?: string; color?: string },
  ): Promise<ApiResponse<LiteratureTag>> {
    const result = await this.literatureService.updateTag(
      id,
      body.name,
      body.slug,
      body.color,
    );
    return { code: 0, message: 'ok', data: result };
  }

  /** 删除标签 */
  @Delete('admin/tags/:id')
  @UseGuards(AdminGuard)
  async deleteTag(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.literatureService.deleteTag(id);
    return { code: 0, message: 'ok', data: null };
  }
}
