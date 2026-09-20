import { Module } from '@nestjs/common';
import { JwtService } from './services/jwt.service';
import { ContentFilterService } from './services/content-filter.service';
import { EmailService } from './services/email.service';

@Module({
  providers: [JwtService, ContentFilterService, EmailService],
  exports: [JwtService, ContentFilterService, EmailService],
})
export class CommonModule {}
