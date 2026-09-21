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
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';

import { CalendarService } from './calendar.service';
import { AuthGuard, AdminGuard } from '@server/common/guards/auth.guard';
import type { ApiResponse, CalendarEvent, BatchCreateCalendarEventsRequest, BatchCreateCalendarEventsResponse, PagedResponse } from '@shared/api.interface';
import { reviewSettings } from '@server/database/tables';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { MySql2Database } from 'drizzle-orm/mysql2';

@Controller('api/calendar')
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    @Inject(DRIZZLE_DATABASE) private readonly db: MySql2Database,
  ) {}

  private async getCalendarReviewEnabled(): Promise<boolean> {
    const rows = await this.db
      .select({ calendarEnabled: reviewSettings.calendarEnabled })
      .from(reviewSettings)
      .where(eq(reviewSettings.id, 1))
      .limit(1);
    return rows[0]?.calendarEnabled ?? true;
  }

  @Get()
  async getList(
    @Query('year') year?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ): Promise<ApiResponse<PagedResponse<CalendarEvent>>> {
    const parsedYear: number | undefined = year ? Number(year) : undefined;
    const parsedPage: number = page ? Math.max(1, parseInt(page, 10)) : 1;
    const parsedPageSize: number = pageSize ? Math.max(1, parseInt(pageSize, 10)) : 20;

    const data: PagedResponse<CalendarEvent> = await this.calendarService.getList({
      year: parsedYear,
      page: parsedPage,
      pageSize: parsedPageSize,
      status,
    });
    return { code: 0, message: 'ok', data };
  }

  @Get('upcoming')
  async getUpcoming(): Promise<ApiResponse<CalendarEvent[]>> {
    const data: CalendarEvent[] = await this.calendarService.getUpcoming(5);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Get('admin/events')
  async getAdminList(
    @Query('year') year?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ): Promise<ApiResponse<PagedResponse<CalendarEvent>>> {
    const parsedYear: number | undefined = year ? Number(year) : undefined;
    const parsedPage: number = page ? Math.max(1, parseInt(page, 10)) : 1;
    const parsedPageSize: number = pageSize ? Math.max(1, parseInt(pageSize, 10)) : 20;

    const data: PagedResponse<CalendarEvent> = await this.calendarService.getList({
      year: parsedYear,
      page: parsedPage,
      pageSize: parsedPageSize,
      status,
    });
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  async getDetail(@Param('id') id: string): Promise<ApiResponse<CalendarEvent>> {
    const data: CalendarEvent = await this.calendarService.getById(id);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard)
  @Post()
  async create(
    @Req() req: Request & { user: { userId: string; role?: string } },
    @Body() body: {
      title: string;
      eventDate: string;
      description?: string;
      hasCrown?: boolean;
      eventType?: string;
      sourceUrl?: string;
    },
  ): Promise<ApiResponse<CalendarEvent>> {
    const { userId, role } = req.user;
    const isAdmin: boolean = role === 'admin';
    const reviewEnabled: boolean = isAdmin ? true : await this.getCalendarReviewEnabled();
    const data: CalendarEvent = await this.calendarService.createWithUploader(
      body,
      userId,
      isAdmin,
      reviewEnabled,
    );
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Post('events/batch')
  async batchCreate(
    @Body() body: BatchCreateCalendarEventsRequest,
  ): Promise<ApiResponse<BatchCreateCalendarEventsResponse>> {
    const data: BatchCreateCalendarEventsResponse = await this.calendarService.batchCreate(
      body.items,
    );
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Post('admin/events/:id/review')
  async reviewEvent(
    @Param('id') id: string,
    @Body() body: { status: 'published' | 'rejected' },
  ): Promise<ApiResponse<CalendarEvent>> {
    const data: CalendarEvent = await this.calendarService.reviewEvent(id, body.status);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      eventDate?: string;
      description?: string;
      hasCrown?: boolean;
      eventType?: string;
      sourceUrl?: string;
    },
  ): Promise<ApiResponse<CalendarEvent>> {
    const data: CalendarEvent = await this.calendarService.update(id, body);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.calendarService.delete(id);
    return { code: 0, message: 'ok', data: null };
  }
}
