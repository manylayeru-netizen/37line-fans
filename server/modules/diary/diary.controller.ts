import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { DiaryService } from './diary.service';
import { AuthGuard, AdminGuard } from '@server/common/guards/auth.guard';
import type {
  ApiResponse,
  DiaryEntry,
  PagedResponse,
} from '@shared/api.interface';

@Controller('api/dailyfics')
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @Get()
  async getList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ): Promise<ApiResponse<PagedResponse<DiaryEntry>>> {
    const pageNum: number = page ? parseInt(page, 10) : 1;
    const pageSizeNum: number = pageSize ? parseInt(pageSize, 10) : 10;

    const filterStatus = status || 'published';

    const data: PagedResponse<DiaryEntry> = await this.diaryService.getList({
      page: pageNum,
      pageSize: pageSizeNum,
      status: filterStatus,
    });

    return { code: 0, message: 'ok', data };
  }

  @Get('latest')
  async getLatest(): Promise<ApiResponse<DiaryEntry[]>> {
    const data: DiaryEntry[] = await this.diaryService.getLatest(3);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  async getDetail(@Param('id') id: string): Promise<ApiResponse<DiaryEntry>> {
    const data: DiaryEntry = await this.diaryService.getById(id);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard)
  @Post('submit')
  async submit(
    @Req() req: { user: { userId: string; username: string } },
    @Body() body: {
      title: string;
      content: string;
      weather?: string;
      entryDate: string;
      illustrationUrl?: string;
      author?: string;
      sourcePlatform?: string;
      completionStatus?: 'completed' | 'ongoing';
      contentWarnings?: string[];
      characterBackground?: string;
      recommendationReason?: string;
    },
  ): Promise<ApiResponse<DiaryEntry>> {
    const data: DiaryEntry = await this.diaryService.submit({
      ...body,
      submitterId: req.user.userId,
      submitterName: req.user.username,
    });
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Post()
  async create(
    @Body() body: {
      title: string;
      content: string;
      weather?: string;
      entryDate: string;
      illustrationUrl?: string;
      status?: 'published' | 'draft' | 'offline';
      sortOrder?: number;
      author?: string;
      sourcePlatform?: string;
      completionStatus?: 'completed' | 'ongoing';
      contentWarnings?: string[];
      characterBackground?: string;
      recommendationReason?: string;
    },
  ): Promise<ApiResponse<DiaryEntry>> {
    const data: DiaryEntry = await this.diaryService.create(body);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      content?: string;
      weather?: string;
      entryDate?: string;
      illustrationUrl?: string;
      status?: 'published' | 'draft' | 'offline';
      sortOrder?: number;
      author?: string;
      sourcePlatform?: string;
      completionStatus?: 'completed' | 'ongoing';
      contentWarnings?: string[];
      characterBackground?: string;
      recommendationReason?: string;
    },
  ): Promise<ApiResponse<DiaryEntry>> {
    const data: DiaryEntry = await this.diaryService.update(id, body);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'published' | 'draft' | 'offline' },
  ): Promise<ApiResponse<DiaryEntry>> {
    const data: DiaryEntry = await this.diaryService.updateStatus(id, body.status);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.diaryService.delete(id);
    return { code: 0, message: 'ok', data: null };
  }
}
