import { Module } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { DiaryController } from './diary.controller';
import { CommonModule } from '@server/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [DiaryController],
  providers: [DiaryService],
})
export class DiaryModule {}
