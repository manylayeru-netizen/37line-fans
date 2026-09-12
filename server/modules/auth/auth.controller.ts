import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { AuthGuard } from '@server/common/guards/auth.guard';
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  SiteUser,
  UpdateAvatarRequest,
} from '@shared/api.interface';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const { username, password } = body;
    const result = await this.authService.login(username, password);
    return { code: 0, message: 'ok', data: result };
  }

  @Post('register')
  async register(@Body() body: RegisterRequest): Promise<ApiResponse<{ id: string }>> {
    const result = await this.authService.submitApplication(body);
    return { code: 0, message: 'ok', data: result };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req: Request): Promise<ApiResponse<SiteUser>> {
    const userPayload = (req as { user?: { userId?: string } }).user;
    if (!userPayload?.userId) {
      throw new BadRequestException('用户信息无效');
    }
    const user = await this.authService.getCurrentUser(userPayload.userId);
    return { code: 0, message: 'ok', data: user };
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: Request,
    @Body() body: { oldPassword: string; newPassword: string },
  ): Promise<ApiResponse<null>> {
    const userPayload = (req as { user?: { userId?: string } }).user;
    if (!userPayload?.userId) {
      throw new BadRequestException('用户信息无效');
    }
    const { oldPassword, newPassword } = body;
    await this.authService.changePassword(userPayload.userId, oldPassword, newPassword);
    return { code: 0, message: 'ok', data: null };
  }

  @UseGuards(AuthGuard)
  @Patch('avatar')
  async updateAvatar(
    @Req() req: Request,
    @Body() body: UpdateAvatarRequest,
  ): Promise<ApiResponse<SiteUser>> {
    const userPayload = (req as { user?: { userId?: string } }).user;
    if (!userPayload?.userId) {
      throw new BadRequestException('用户信息无效');
    }
    const user = await this.authService.updateAvatar(userPayload.userId, body.avatarUrl);
    return { code: 0, message: 'ok', data: user };
  }
}
