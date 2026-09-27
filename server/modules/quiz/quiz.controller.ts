import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AdminGuard, AuthGuard } from '@server/common/guards/auth.guard';
import { QuizService } from './quiz.service';

@Controller('api/quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // ---------------- 玩家 ----------------

  @UseGuards(AuthGuard)
  @Get('questions')
  async getQuestions(
    @Query('mode') mode = 'timed',
    @Query('category') category?: string,
    @Query('count') count = '10',
  ) {
    const data = await this.quizService.getQuestions(
      mode,
      category,
      parseInt(count, 10),
    );
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard)
  @Post('answer-one')
  async answerOne(@Body() body: any) {
    const data = await this.quizService.answerOne(
      body.questionId,
      body.selectedIndex,
    );
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard)
  @Post('submit')
  async submit(@Req() req: any, @Body() body: any) {
    const data = await this.quizService.submit(req.user.userId, body);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard)
  @Get('leaderboard')
  async leaderboard(
    @Query('mode') mode = 'timed',
    @Query('period') period = 'day',
  ) {
    const p = period === 'week' ? 'week' : 'day';
    const data = await this.quizService.getLeaderboard(mode, p);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard)
  @Get('can-submit')
  async canSubmit(@Req() req: any) {
    const data = {
      canSubmit: await this.quizService.canSubmitQuestion(req.user.userId),
    };
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard)
  @Post('submit-question')
  async submitQuestion(@Req() req: any, @Body() body: any) {
    const data = await this.quizService.submitQuestion(req.user.userId, body);
    return { code:0, message: 'ok', data };
  }

  // ---------------- 玩家：在线对决 ----------------

  @UseGuards(AuthGuard)
  @Get('ably-token')
  async ablyToken(@Req() req: any) {
    const data = await this.quizService.createAblyToken(req.user.userId);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard)
  @Post('battle/start')
  async battleStart() {
    const data = await this.quizService.battleStart();
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard)
  @Post('battle/by-ids')
  async battleByIds(@Body() body: any) {
    const data = await this.quizService.getQuestionsByIds(body.ids || []);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard)
  @Post('battle/submit')
  async battleSubmit(@Req() req: any, @Body() body: any) {
    const data = await this.quizService.battleSubmit(req.user.userId, body);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard)
  @Post('battle/settle')
  async battleSettle(@Req() req: any, @Body() body: any) {
    const data = await this.quizService.battleSettle(
      req.user.userId,
      body.scoreId,
      body.opponentId,
    );
    return { code: 0, message: 'ok', data };
  }

  // ---------------- 管理员：题库管理 ----------------

  @UseGuards(AuthGuard, AdminGuard)
  @Get('admin/questions')
  async adminList(@Query() query: any) {
    const data = await this.quizService.adminList(query);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post('admin/questions')
  async adminCreate(@Body() body: any) {
    const data = await this.quizService.adminCreate(body);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch('admin/questions/:id')
  async adminUpdate(@Param('id') id: string, @Body() body: any) {
    const data = await this.quizService.adminUpdate(id, body);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Delete('admin/questions/:id')
  async adminDelete(@Param('id') id: string) {
    const data = await this.quizService.adminDelete(id);
    return { code: 0, message: 'ok', data };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post('admin/questions/:id/review')
  async review(@Param('id') id: string, @Body('status') status: string) {
    const s = status === 'disabled' ? 'disabled' : 'active';
    const data = await this.quizService.review(id, s);
    return { code: 0, message: 'ok', data };
  }
}
