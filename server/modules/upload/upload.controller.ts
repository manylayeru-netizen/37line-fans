import {
  Controller,
  Post,
  UseGuards,
  Req,
  BadRequestException,
  Logger,
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

  @UseGuards(AuthGuard)
  @Post('avatar')
  async uploadAvatar(@Req() req: Request): Promise<ApiResponse<{ url: string }>> {
    if (!isBlobStorageAvailable()) {
      throw new BadRequestException(
        '文件上传服务未配置，请先配置 BLOB_READ_WRITE_TOKEN 环境变量',
      );
    }

    const contentType = req.headers['content-type'] || '';
    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('仅支持图片文件');
    }

    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > MAX_FILE_SIZE) {
      throw new BadRequestException('文件大小不能超过 5MB');
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;

    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
      totalSize += (chunk as Buffer).length;
      if (totalSize > MAX_FILE_SIZE) {
        throw new BadRequestException('文件大小不能超过 5MB');
      }
    }

    const fileBuffer = Buffer.concat(chunks);
    if (fileBuffer.length === 0) {
      throw new BadRequestException('文件为空');
    }

    const userId = (req as { user?: { userId?: string } }).user?.userId || 'unknown';
    const timestamp = Date.now();
    const pathname = `avatars/${userId}/${timestamp}.jpg`;

    const result = await uploadToBlob(pathname, fileBuffer, contentType);

    this.logger.log(`头像上传成功: ${result.url}`);
    return { code: 0, message: 'ok', data: { url: result.url } };
  }

  @UseGuards(AuthGuard)
  @Post('collection')
  async uploadCollection(@Req() req: Request): Promise<ApiResponse<{ url: string }>> {
    if (!isBlobStorageAvailable()) {
      throw new BadRequestException(
        '文件上传服务未配置，请先配置 BLOB_READ_WRITE_TOKEN 环境变量',
      );
    }

    const contentType = req.headers['content-type'] || '';
    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('仅支持图片文件');
    }

    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > MAX_FILE_SIZE) {
      throw new BadRequestException('文件大小不能超过 5MB');
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;

    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
      totalSize += (chunk as Buffer).length;
      if (totalSize > MAX_FILE_SIZE) {
        throw new BadRequestException('文件大小不能超过 5MB');
      }
    }

    const fileBuffer = Buffer.concat(chunks);
    if (fileBuffer.length === 0) {
      throw new BadRequestException('文件为空');
    }

    const userId = (req as { user?: { userId?: string } }).user?.userId || 'unknown';
    const timestamp = Date.now();
    const pathname = `collection/${userId}/${timestamp}.jpg`;

    const result = await uploadToBlob(pathname, fileBuffer, contentType);

    this.logger.log(`收集册图片上传成功: ${result.url}`);
    return { code: 0, message: 'ok', data: { url: result.url } };
  }
}
