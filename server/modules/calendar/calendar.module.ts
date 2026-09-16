import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { CommonModule } from '@server/common/common.module';
import { AuthModule } from '@server/modules/auth/auth.module';

@Module({
  imports: [CommonModule, AuthModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
