import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { CollectionService } from './collection.service';
import { AuthGuard, AdminGuard } from '@server/common/guards/auth.guard';
import {
  ApiResponse,
  CollectionCard,
  PagedResponse,
} from '@shared/api.interface';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { reviewSettings } from '@server/database/tables';
import { eq } from 'drizzle-orm';
import { Inject } from '@nestjs/common';

interface AuthenticatedRequest {
  user: { userId: string; username: string; role: string };
}

@Controller('api/collection')
export class CollectionController {
  constructor(
    private readonly collectionService: CollectionService,
    @Inject(DRIZZLE_DATABASE) private readonly db: MySql2Database,
  ) {}

  private async getCollectionReviewEnabled(): Promise<boolean> {
    const rows = await this.db
      .select({ collectionEnabled: reviewSettings.collectionEnabled })
      .from(reviewSettings)
      .where(eq(reviewSettings.id, 1))
      .limit(1);
    return rows[0]?.collectionEnabled ?? true;
  }

  @Get()
  async getList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ): Promise<ApiResponse<PagedResponse<CollectionCard>>> {
    const pageNum: number = page ? parseInt(page, 10) : 1;
    const pageSizeNum: number = pageSize ? parseInt(pageSize, 10) : 12;
    const statusFilter: string = status ?? 'published';

    const data: PagedResponse<CollectionCard> = await this.collectionService.getList({
      page: pageNum,
      pageSize: pageSizeNum,
      category,
      status: statusFilter,
    });

    return { code: 0, message: 'ok', data };
  }

  @Get('categories')
  async getCategories(): Promise<ApiResponse<string[]>> {
    const data: string[] = await this.collectionService.getCategories();
    return { code: 0, message: 'ok', data };
  }

  @Get('featured')
  async getFeatured(): Promise<ApiResponse<CollectionCard[]>> {
    const data: CollectionCard[] = await this.collectionService.getFeatured(6);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Get('admin')
  async getAdminList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ): Promise<ApiResponse<PagedResponse<CollectionCard>>> {
    const pageNum: number = page ? parseInt(page, 10) : 1;
    const pageSizeNum: number = pageSize ? parseInt(pageSize, 10) : 20;

    const data: PagedResponse<CollectionCard> = await this.collectionService.getList({
      page: pageNum,
      pageSize: pageSizeNum,
      category,
      status: status ?? 'all',
    });

    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  async getDetail(@Param('id') id: string): Promise<ApiResponse<CollectionCard>> {
    const data: CollectionCard = await this.collectionService.getById(id);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard)
  @Post()
  async create(
    @Req() req: Request,
    @Body() body: {
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
    },
  ): Promise<ApiResponse<CollectionCard>> {
    const { userId, role } = (req as unknown as AuthenticatedRequest).user;
    const isAdmin: boolean = role === 'admin';
    const reviewEnabled: boolean = isAdmin ? true : await this.getCollectionReviewEnabled();
    const data: CollectionCard = await this.collectionService.createWithUploader(
      body,
      userId,
      { isAdmin, reviewEnabled },
    );
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
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
    },
  ): Promise<ApiResponse<CollectionCard>> {
    const data: CollectionCard = await this.collectionService.update(id, body);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Post('admin/:id/review')
  async review(
    @Param('id') id: string,
    @Body() body: { status: 'published' | 'rejected' },
  ): Promise<ApiResponse<CollectionCard>> {
    const data: CollectionCard = await this.collectionService.reviewCard(id, body.status);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.collectionService.delete(id);
    return { code: 0, message: 'ok', data: null };
  }
}
