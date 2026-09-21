import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';

import { AdminService } from './admin.service';
import { AdminGuard } from '@server/common/guards/auth.guard';
import type {
  ApiResponse,
  PagedResponse,
  SiteUser,
  RegisterApplication,
  ReviewApplicationRequest,
  AdminStats,
  ReviewSettings,
  UpdateReviewSettingsRequest,
} from '@shared/api.interface';

@UseGuards(AdminGuard)
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('applications')
  async getApplications(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ): Promise<ApiResponse<PagedResponse<RegisterApplication>>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const size = pageSize ? parseInt(pageSize, 10) : 20;
    const result = await this.adminService.getApplications(pageNum, size, status);
    return { code: 0, message: 'ok', data: result };
  }

  @Post('applications/:id/review')
  async reviewApplication(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: ReviewApplicationRequest,
  ): Promise<ApiResponse<RegisterApplication>> {
    const userPayload = (req as { user?: { userId?: string } }).user;
    if (!userPayload?.userId) {
      throw new BadRequestException('用户信息无效');
    }
    const result = await this.adminService.reviewApplication(id, body, userPayload.userId);
    return { code: 0, message: 'ok', data: result };
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('role') role?: string,
  ): Promise<ApiResponse<PagedResponse<SiteUser>>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const size = pageSize ? parseInt(pageSize, 10) : 20;
    const result = await this.adminService.getUsers(pageNum, size, keyword, role);
    return { code: 0, message: 'ok', data: result };
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: string },
  ): Promise<ApiResponse<SiteUser>> {
    const { role } = body;
    const result = await this.adminService.updateUserRole(id, role);
    return { code: 0, message: 'ok', data: result };
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ): Promise<ApiResponse<SiteUser>> {
    const { status } = body;
    const result = await this.adminService.updateUserStatus(id, status);
    return { code: 0, message: 'ok', data: result };
  }

  @Post('users/:id/reset-password')
  async resetPassword(
    @Param('id') id: string,
  ): Promise<ApiResponse<{ newPassword: string }>> {
    const result = await this.adminService.resetUserPassword(id);
    return { code: 0, message: 'ok', data: result };
  }

  @Get('stats')
  async getStats(): Promise<ApiResponse<AdminStats>> {
    const stats = await this.adminService.getStats();
    return { code: 0, message: 'ok', data: stats };
  }

  @Get('review-settings')
  async getReviewSettings(): Promise<ApiResponse<ReviewSettings>> {
    const settings = await this.adminService.getReviewSettings();
    return { code: 0, message: 'ok', data: settings };
  }

  @Patch('review-settings')
  async updateReviewSettings(
    @Body() body: UpdateReviewSettingsRequest,
  ): Promise<ApiResponse<ReviewSettings>> {
    const settings = await this.adminService.updateReviewSettings(body);
    return { code: 0, message: 'ok', data: settings };
  }
}
