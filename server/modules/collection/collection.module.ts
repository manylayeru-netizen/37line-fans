import { Module } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CollectionController } from './collection.controller';
import { CommonModule } from '@server/common/common.module';
import { AuthModule } from '@server/modules/auth/auth.module';

@Module({
  imports: [CommonModule, AuthModule],
  controllers: [CollectionController],
  providers: [CollectionService],
})
export class CollectionModule {}
