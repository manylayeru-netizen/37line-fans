import { Module } from '@nestjs/common';
import { LiteratureService } from './literature.service';
import { LiteratureController } from './literature.controller';
import { CommonModule } from '@server/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [LiteratureController],
  providers: [LiteratureService],
})
export class LiteratureModule {}
