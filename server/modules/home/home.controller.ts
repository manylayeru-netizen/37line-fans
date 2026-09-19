import { Controller, Get, Query } from '@nestjs/common';
import { HomeService } from './home.service';
import type { OnThisDayResponse } from '@shared/api.interface';

@Controller('api/home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('on-this-day')
  async getOnThisDay(
    @Query('month') month?: string,
    @Query('day') day?: string,
  ): Promise<{ code: number; message: string; data: OnThisDayResponse }> {
    const monthNum = month !== undefined ? parseInt(month, 10) : undefined;
    const dayNum = day !== undefined ? parseInt(day, 10) : undefined;
    const data = await this.homeService.getOnThisDay(monthNum, dayNum);
    return { code: 0, message: 'ok', data };
  }
}
