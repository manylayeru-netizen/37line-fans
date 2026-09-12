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

import { CalendarService } from './calendar.service';
import { AuthGuard, AdminGuard } from '@server/common/guards/auth.guard';
import type { ApiResponse, CalendarEvent } from '@shared/api.interface';

@Controller('api/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  async getList(
    @Query('year') year?: string,
  ): Promise<ApiResponse<CalendarEvent[]>> {
    const data: CalendarEvent[] = await this.calendarService.getList(year);
    return { code: 0, message: 'ok', data };
  }

  @Get('upcoming')
  async getUpcoming(): Promise<ApiResponse<CalendarEvent[]>> {
    const data: CalendarEvent[] = await this.calendarService.getUpcoming(5);
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
    @Req() req: Request & { user: { userId: string } },
    @Body() body: {
      title: string;
      eventDate: string;
      description?: string;
      hasCrown?: boolean;
      eventType?: string;
    },
  ): Promise<ApiResponse<CalendarEvent>> {
    const { userId } = req.user;
    const data: CalendarEvent = await this.calendarService.createWithUploader(
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
      eventDate?: string;
      description?: string;
      hasCrown?: boolean;
      eventType?: string;
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
