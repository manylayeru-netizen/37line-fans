import { Module } from '@nestjs/common';
import { JwtService } from './services/jwt.service';
import { ContentFilterService } from './services/content-filter.service';

@Module({
  providers: [JwtService, ContentFilterService],
  exports: [JwtService, ContentFilterService],
})
export class CommonModule {}
