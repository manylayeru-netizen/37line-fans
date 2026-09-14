import {
  Controller,
  Post,
  UseGuards,
  Req,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthGuard } from '@server/common/guards/auth.guard';
import {
  uploadToBlob,
  isBlobStorageAvailable,
} from '@server/common/services/blob-storage.service';
import type { ApiResponse } from '@shared/api.interface';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('api/upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  private readFileBuffer(req: Request): Buffer {
    const raw = req.body;
    if (raw && Buffer.isBuffer(raw)) {
      return raw;
    }
    if (typeof raw === 'string') {
      return Buffer.from(raw, 'base64');
    }
    throw new BadRequestException('无法读取上传文件，请检查请求体格式');
  }

  private async uploadWithFallback(
    pathname: string,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<{ url: string; mode: 'blob' | 'base64' }> {
    if (isBlobStorageAvailable()) {
      try {
        const result = await uploadToBlob(pathname, fileBuffer, contentType);
        return { url: result.url, mode: 'blob' };
      } catch (error: unknown) {
        this.logger.error(
          `Vercel Blob 上传失败，降级到 base64: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const base64 = fileBuffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;
    this.logger.warn(`Blob 不可用，使用 base64 降级存储 (${fileBuffer.length} bytes)`);
    return { url: dataUrl, mode: 'base64' };
  }

  @UseGuards(AuthGuard)
  @Post('avatar')
  async uploadAvatar(@Req() req: Request): Promise<ApiResponse<{ url: string; mode: string }>> {
    try {
      const contentType = req.headers['content-type'] || '';
      if (!contentType.startsWith('image/')) {
        throw new BadRequestException('仅支持图片文件');
      }

      const contentLength = Number(req.headers['content-length'] || 0);
      if (contentLength > MAX_FILE_SIZE) {
        throw new BadRequestException('文件大小不能超过 5MB');
      }

      const fileBuffer = this.readFileBuffer(req);
      if (fileBuffer.length === 0) {
        throw new BadRequestException('文件为空');
      }
      if (fileBuffer.length > MAX_FILE_SIZE) {
        throw new BadRequestException('文件大小不能超过 5MB');
      }

      const userId = (req as { user?: { userId?: string } }).user?.userId || 'unknown';
      const timestamp = Date.now();
      const pathname = `avatars/${userId}/${timestamp}`;

      const result = await this.uploadWithFallback(pathname, fileBuffer, contentType);

      this.logger.log(`头像上传成功 (mode=${result.mode}, size=${fileBuffer.length})`);
      return { code: 0, message: 'ok', data: { url: result.url, mode: result.mode } };
    } catch (error: unknown) {
      this.logger.error(
        `头像上传失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack || '' : '',
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `上传失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @UseGuards(AuthGuard)
  @Post('collection')
  async uploadCollection(
    @Req() req: Request,
  ): Promise<ApiResponse<{ url: string; mode: string }>> {
    try {
      const contentType = req.headers['content-type'] || '';
      if (!contentType.startsWith('image/')) {
        throw new BadRequestException('仅支持图片文件');
      }

      const contentLength = Number(req.headers['content-length'] || 0);
      if (contentLength > MAX_FILE_SIZE) {
        throw new BadRequestException('文件大小不能超过 5MB');
      }

      const fileBuffer = this.readFileBuffer(req);
      if (fileBuffer.length === 0) {
        throw new BadRequestException('文件为空');
      }
      if (fileBuffer.length > MAX_FILE_SIZE) {
        throw new BadRequestException('文件大小不能超过 5MB');
      }

      const userId = (req as { user?: { userId?: string } }).user?.userId || 'unknown';
      const timestamp = Date.now();
      const pathname = `collection/${userId}/${timestamp}`;

      const result = await this.uploadWithFallback(pathname, fileBuffer, contentType);

      this.logger.log(`收集册图片上传成功 (mode=${result.mode}, size=${fileBuffer.length})`);
      return { code: 0, message: 'ok', data: { url: result.url, mode: result.mode } };
    } catch (error: unknown) {
      this.logger.error(
        `收集册上传失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack || '' : '',
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `上传失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
