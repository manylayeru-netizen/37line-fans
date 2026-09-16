import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { GuestbookService } from './guestbook.service';
import { AuthGuard, AdminGuard } from '@server/common/guards/auth.guard';
import type {
  ApiResponse,
  GuestbookNote,
  CreateGuestbookNoteRequest,
  PagedResponse,
} from '@shared/api.interface';

@Controller('api/guestbook')
export class GuestbookController {
  constructor(private readonly guestbookService: GuestbookService) {}

  /** 已审核留言列表（公开） */
  @Get('notes')
  async getApprovedNotes(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ApiResponse<PagedResponse<GuestbookNote>>> {
    const pageNum: number = page ? parseInt(page, 10) : 1;
    const pageSizeNum: number = pageSize ? parseInt(pageSize, 10) : 12;
    const result = await this.guestbookService.getApprovedNotes(
      pageNum,
      pageSizeNum,
    );
    return { code: 0, message: 'ok', data: result };
  }

  /** 提交留言（公开） */
  @Post('notes')
  async createNote(
    @Body() body: CreateGuestbookNoteRequest,
  ): Promise<ApiResponse<GuestbookNote>> {
    const result = await this.guestbookService.createNote(body);
    return { code: 0, message: 'ok', data: result };
  }

  /** 用户删除自己的留言 / 管理员删除任意留言 */
  @Delete('notes/:id')
  @UseGuards(AuthGuard)
  async deleteMyNote(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<ApiResponse<null>> {
    const { userId, username, role, displayName } = req.user;
    await this.guestbookService.deleteNoteByUser(
      id,
      userId,
      role,
      displayName,
      username,
    );
    return { code: 0, message: 'ok', data: null };
  }

  /** 管理员列表 */
  @Get('admin')
  @UseGuards(AdminGuard)
  async getAdminNotes(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ): Promise<ApiResponse<PagedResponse<GuestbookNote>>> {
    const pageNum: number = page ? parseInt(page, 10) : 1;
    const pageSizeNum: number = pageSize ? parseInt(pageSize, 10) : 20;
    const result = await this.guestbookService.getAdminNotes(
      pageNum,
      pageSizeNum,
      status,
    );
    return { code: 0, message: 'ok', data: result };
  }

  /** 审核通过 */
  @Post('admin/:id/approve')
  @UseGuards(AdminGuard)
  async approveNote(
    @Param('id') id: string,
  ): Promise<ApiResponse<GuestbookNote>> {
    const result = await this.guestbookService.approveNote(id);
    return { code: 0, message: 'ok', data: result };
  }

  /** 审核拒绝 */
  @Post('admin/:id/reject')
  @UseGuards(AdminGuard)
  async rejectNote(
    @Param('id') id: string,
  ): Promise<ApiResponse<GuestbookNote>> {
    const result = await this.guestbookService.rejectNote(id);
    return { code: 0, message: 'ok', data: result };
  }

  /** 删除留言 */
  @Delete('admin/:id')
  @UseGuards(AdminGuard)
  async deleteNote(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.guestbookService.deleteNote(id);
    return { code: 0, message: 'ok', data: null };
  }
}
