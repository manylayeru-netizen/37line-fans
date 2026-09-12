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
import type {
  ApiResponse,
  CollectionCard,
  PagedResponse,
} from '@shared/api.interface';

interface AuthenticatedRequest {
  user: { userId: string; username: string; role: string };
}

@Controller('api/collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  async getList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string,
  ): Promise<ApiResponse<PagedResponse<CollectionCard>>> {
    const pageNum: number = page ? parseInt(page, 10) : 1;
    const pageSizeNum: number = pageSize ? parseInt(pageSize, 10) : 12;

    const data: PagedResponse<CollectionCard> = await this.collectionService.getList({
      page: pageNum,
      pageSize: pageSizeNum,
      category,
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
    },
  ): Promise<ApiResponse<CollectionCard>> {
    const { userId } = (req as unknown as AuthenticatedRequest).user;
    const data: CollectionCard = await this.collectionService.createWithUploader(
      body,
      userId,
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
    },
  ): Promise<ApiResponse<CollectionCard>> {
    const data: CollectionCard = await this.collectionService.update(id, body);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.collectionService.delete(id);
    return { code: 0, message: 'ok', data: null };
  }
}
