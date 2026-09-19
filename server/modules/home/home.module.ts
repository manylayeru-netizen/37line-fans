import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { CommonModule } from '@server/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
