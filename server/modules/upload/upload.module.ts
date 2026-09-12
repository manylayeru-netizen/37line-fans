import { Module } from '@nestjs/common';

import { UploadController } from './upload.controller';
import { CommonModule } from '@server/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [UploadController],
})
export class UploadModule {}
