import { Module } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { DiaryController } from './diary.controller';
import { CommonModule } from '@server/common/common.module';
import { AuthModule } from '@server/modules/auth/auth.module';

@Module({
  imports: [CommonModule, AuthModule],
  controllers: [DiaryController],
  providers: [DiaryService],
})
export class DiaryModule {}
