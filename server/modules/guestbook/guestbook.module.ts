import { Module } from '@nestjs/common';
import { GuestbookService } from './guestbook.service';
import { GuestbookController } from './guestbook.controller';
import { CommonModule } from '@server/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [GuestbookController],
  providers: [GuestbookService],
})
export class GuestbookModule {}
