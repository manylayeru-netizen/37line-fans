import { Module } from '@nestjs/common';

import { CommonModule } from '@server/common/common.module';
import { AuthModule } from '@server/modules/auth/auth.module';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

@Module({
  imports: [CommonModule, AuthModule],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
