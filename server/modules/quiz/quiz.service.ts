import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, like, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { quizQuestions, quizScores, siteUsers } from '@server/database/tables';
import * as Ably from 'ably';

export interface PublicQuestion {
  id: string;
  stem: string;
  options: string[];
  category: string;
  difficulty: string;
}

export interface SubmitAnswerItem {
  questionId: string;
  selectedIndex: number;
}

interface QuestionInput {
  stem: string;
  options: string[];
  answerIndex: number;
  category?: string;
  difficulty?: string;
  sourceUrl?: string;
  sourceNote?: string;
}

/** 北京(+8) 日榜 / 周榜的 UTC 时间窗，返回可直接与 datetime(UTC) 比较的字符串 */
function periodRange(period: 'day' | 'week'): { start: string; end: string } {
  const now = Date.now();
  const bjClock = new Date(now + 8 * 3600 * 1000); // 钟面 = 北京时间
  const bjMid = Date.UTC(
    bjClock.getUTCFullYear(),
    bjClock.getUTCMonth(),
    bjClock.getUTCDate(),
  ); // 北京当天 00:00 的钟面毫秒
  let startBj = bjMid;
  if (period === 'week') {
    const dow = new Date(bjMid).getUTCDay(); // 0=日 … 6=六，周一为始
    const diff = (dow + 6) % 7;
    startBj = bjMid - diff * 86400000;
  }
  const span = (period === 'week' ? 7 : 1) * 86400000;
  const fmt = (ms: number): string =>
    new Date(ms - 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  return { start: fmt(startBj), end: fmt(startBj + span) };
}

@Injectable()
export class QuizService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: MySql2Database,
  ) {}

  // ---------------- 玩家：取题（不含正确答案）----------------

  async getQuestions(
    mode: string,
    category?: string,
    count = 10,
  ): Promise<PublicQuestion[]> {
    const conditions = [eq(quizQuestions.status, 'active')];
    if (category === 'basic' || category === 'sugar') {
      conditions.push(eq(quizQuestions.category, category));
    }
    const limit = Math.min(Math.max(Number(count) || 10, 1), 30);
    const rows = await this.db
      .select({
        id: quizQuestions.id,
        stem: quizQuestions.stem,
        options: quizQuestions.options,
        category: quizQuestions.category,
        difficulty: quizQuestions.difficulty,
      })
      .from(quizQuestions)
      .where(and(...conditions))
      .orderBy(sql`RAND()`)
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      stem: r.stem,
      options: r.options,
      category: r.category,
      difficulty: r.difficulty,
    }));
  }

  // ---------------- 玩家：单题轻判（连胜赛用，不回答案 / 不写库）----------------

  async answerOne(questionId: string, selectedIndex: number) {
    const rows = await this.db
      .select({
        correct: quizQuestions.correctOption,
        status: quizQuestions.status,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.id, questionId))
      .limit(1);
    const q = rows[0];
    if (!q || q.status !== 'active') return { isCorrect: false };
    return { isCorrect: Number(selectedIndex) === q.correct };
  }

  // ---------------- 玩家：提交（服务端判分 + 写一条成绩）----------------

  async submit(
    userId: string,
    body: {
      mode: string;
      answers: SubmitAnswerItem[];
      durationSec?: number;
      maxStreak?: number;
    },
  ) {
    const mode = ['timed', 'streak', 'battle'].includes(body.mode) ? body.mode : 'timed';
    const answers = Array.isArray(body.answers) ? body.answers : [];
    if (answers.length === 0) throw new BadRequestException('没有作答记录');

    const ids = answers.map((a) => a.questionId);
    const qrows = await this.db
      .select({
        id: quizQuestions.id,
        correct: quizQuestions.correctOption,
        stem: quizQuestions.stem,
        options: quizQuestions.options,
        sourceUrl: quizQuestions.sourceUrl,
        sourceNote: quizQuestions.sourceNote,
      })
      .from(quizQuestions)
      .where(inArray(quizQuestions.id, ids));
    const qmap = new Map(qrows.map((q) => [q.id, q]));

    let correctCount = 0;
    const detail = answers.map((a) => {
      const q = qmap.get(a.questionId);
      const correct = q?.correct;
      const isCorrect = correct != null && a.selectedIndex === correct;
      if (isCorrect) correctCount += 1;
      return {
        questionId: a.questionId,
        selected: a.selectedIndex,
        correct,
        isCorrect,
        stem: q?.stem,
        options: q?.options,
        sourceUrl: q?.sourceUrl ?? null,
        sourceNote: q?.sourceNote ?? null,
      };
    });

    let maxStreak = 0;
    if (mode === 'streak') {
      for (const d of detail) {
        if (d.isCorrect) maxStreak += 1;
        else break; // 答错即止
      }
    } else {
      for (const d of detail) {
        if (d.isCorrect) maxStreak += 1;
        else maxStreak = 0;
      }
    }
    const score = mode === 'streak' ? maxStreak : correctCount;

    const urows = await this.db
      .select({
        username: siteUsers.username,
        displayName: siteUsers.displayName,
        avatarUrl: siteUsers.avatarUrl,
      })
      .from(siteUsers)
      .where(eq(siteUsers.id, userId))
      .limit(1);
    const u = urows[0];
    const name = u?.displayName || u?.username || '用户';

    await this.db.insert(quizScores).values({
      id: randomUUID(),
      userId,
      userDisplayName: name,
      userAvatarUrl: u?.avatarUrl ?? null,
      mode,
      score,
      correctCount,
      totalQuestions: answers.length,
      durationSec: body.durationSec ?? null,
      maxStreak,
    });

    return { mode, score, correctCount, total: answers.length, maxStreak, detail };
  }

  // ---------------- 玩家：在线对决 ----------------

  async battleStart(count?: number): Promise<PublicQuestion[]> {
    return this.getQuestions('battle', undefined, count || 10);
  }

  async getQuestionsByIds(ids: string[]): Promise<PublicQuestion[]> {
    const list = Array.isArray(ids) ? ids.slice(0, 30) : [];
    if (!list.length) return [];
    const rows = await this.db
      .select({
        id: quizQuestions.id,
        stem: quizQuestions.stem,
        options: quizQuestions.options,
        category: quizQuestions.category,
        difficulty: quizQuestions.difficulty,
      })
      .from(quizQuestions)
      .where(and(eq(quizQuestions.status, 'active'), inArray(quizQuestions.id, list)));
    const map = new Map(rows.map((r) => [r.id, r]));
    const out: PublicQuestion[] = [];
    for (const id of list) {
      const r = map.get(id);
      if (r) {
        out.push({
          id: r.id,
          stem: r.stem,
          options: r.options,
          category: r.category,
          difficulty: r.difficulty,
        });
      }
    }
    return out;
  }

  async battleSubmit(
    userId: string,
    body: { answers: SubmitAnswerItem[]; opponentId?: string; durationSec?: number },
  ) {
    const answers = Array.isArray(body.answers) ? body.answers : [];
    if (!answers.length) throw new BadRequestException('没有作答记录');
    if (!body.opponentId) throw new BadRequestException('缺少对手信息');

    const ids = answers.map((a) => a.questionId);
    const qrows = await this.db
      .select({
        id: quizQuestions.id,
        correct: quizQuestions.correctOption,
        stem: quizQuestions.stem,
        options: quizQuestions.options,
        sourceUrl: quizQuestions.sourceUrl,
        sourceNote: quizQuestions.sourceNote,
      })
      .from(quizQuestions)
      .where(inArray(quizQuestions.id, ids));
    const qmap = new Map(qrows.map((q) => [q.id, q]));

    let correctCount = 0;
    const detail = answers.map((a) => {
      const q = qmap.get(a.questionId);
      const correct = q?.correct;
      const isCorrect = correct != null && a.selectedIndex === correct;
      if (isCorrect) correctCount += 1;
      return {
        questionId: a.questionId,
        selected: a.selectedIndex,
        correct,
        isCorrect,
        stem: q?.stem,
        options: q?.options,
        sourceUrl: q?.sourceUrl ?? null,
        sourceNote: q?.sourceNote ?? null,
      };
    });

    const urows = await this.db
      .select({
        username: siteUsers.username,
        displayName: siteUsers.displayName,
        avatarUrl: siteUsers.avatarUrl,
      })
      .from(siteUsers)
      .where(eq(siteUsers.id, userId))
      .limit(1);
    const u = urows[0];
    const name = u?.displayName || u?.username || '用户';

    const scoreId = randomUUID();
    await this.db.insert(quizScores).values({
      id: scoreId,
      userId,
      userDisplayName: name,
      userAvatarUrl: u?.avatarUrl ?? null,
      mode: 'battle',
      score: correctCount,
      correctCount,
      totalQuestions: answers.length,
      durationSec: body.durationSec ?? null,
      maxStreak: 0,
      opponentId: body.opponentId,
      isWin: false,
    });

    return {
      scoreId,
      score: correctCount,
      correctCount,
      total: answers.length,
      durationSec: body.durationSec ?? null,
      detail,
    };
  }

  async battleSettle(userId: string, scoreId: string, opponentId: string) {
    const mineRows = await this.db
      .select()
      .from(quizScores)
      .where(
        and(
          eq(quizScores.id, scoreId),
          eq(quizScores.userId, userId),
          eq(quizScores.mode, 'battle'),
        ),
      )
      .limit(1);
    const mine = mineRows[0];
    if (!mine) throw new NotFoundException('对战成绩不存在');

    const oppRows = await this.db
      .select()
      .from(quizScores)
      .where(and(eq(quizScores.userId, opponentId), eq(quizScores.mode, 'battle')))
      .orderBy(desc(quizScores.createdAt))
      .limit(1);
    const opp = oppRows[0];

    let result: 'win' | 'lose' | 'draw';
    if (!opp) {
      result = 'win';
    } else {
      const ms = Number(mine.score);
      const os = Number(opp.score);
      if (ms > os) result = 'win';
      else if (ms < os) result = 'lose';
      else {
        const md = Number(mine.durationSec ?? 999999);
        const od = Number(opp.durationSec ?? 999999);
        if (md < od) result = 'win';
        else if (md > od) result = 'lose';
        else result = 'draw';
      }
    }

    await this.db
      .update(quizScores)
      .set({ isWin: result === 'win' })
      .where(eq(quizScores.id, scoreId));

    return {
      result,
      mine: {
        score: Number(mine.score),
        correctCount: Number(mine.correctCount),
        total: Number(mine.totalQuestions),
        durationSec: mine.durationSec,
      },
      opponent: opp
        ? {
            score: Number(opp.score),
            correctCount: Number(opp.correctCount),
            total: Number(opp.totalQuestions),
            durationSec: opp.durationSec,
          }
        : null,
    };
  }

  // ---------------- Ably：短期连接令牌（密钥不下发到前端）----------------

  async createAblyToken(userId: string) {
    const key = process.env.ABLY_API_KEY;
    if (!key) throw new BadRequestException('实时服务未配置');
    const rest = new Ably.Rest(key);
    const tokenRequest = await rest.auth.createTokenRequest({
      clientId: userId,
      capability: JSON.stringify({ 'battle:*': ['publish', 'subscribe', 'presence'] }),
    });
    return tokenRequest;
  }

  // ---------------- 玩家：榜单 ----------------

  async getLeaderboard(mode: string, period: 'day' | 'week') {
    const m = ['timed', 'streak', 'battle'].includes(mode) ? mode : 'timed';
    const { start, end } = periodRange(period);
    const rows = await this.db.execute(sql`
      SELECT id, user_id AS userId, user_display_name AS displayName,
             user_avatar_url AS avatarUrl, mode, score,
             correct_count AS correctCount, total_questions AS total,
             duration_sec AS durationSec, max_streak AS maxStreak,
             _created_at AS createdAt
      FROM (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY score DESC, COALESCE(duration_sec, 999999) ASC, _created_at ASC
          ) AS rn
        FROM quiz_scores
        WHERE mode = ${m} AND _created_at >= ${start} AND _created_at < ${end}
      ) t
      WHERE rn = 1
      ORDER BY score DESC, durationSec ASC
      LIMIT 50
    `);
    return (rows as unknown as any[])[0] ?? [];
  }

  // ---------------- 榜一：出题资格 & 投稿 ----------------

  async canSubmitQuestion(userId: string): Promise<boolean> {
    for (const mode of ['timed', 'streak']) {
      for (const period of ['day', 'week'] as const) {
        const board = await this.getLeaderboard(mode, period);
        if (board[0]?.userId === userId) return true;
      }
    }
    return false;
  }

  async submitQuestion(userId: string, data: QuestionInput) {
    const allowed = await this.canSubmitQuestion(userId);
    if (!allowed) {
      throw new ForbiddenException('仅日榜 / 周榜第一名可以出题');
    }
    const clean = this.validateQuestion(data);
    const urows = await this.db
      .select({ username: siteUsers.username, displayName: siteUsers.displayName })
      .from(siteUsers)
      .where(eq(siteUsers.id, userId))
      .limit(1);
    const submitterName = urows[0]?.displayName || urows[0]?.username || '用户';

    await this.db.insert(quizQuestions).values({
      id: randomUUID(),
      stem: clean.stem,
      options: clean.options,
      correctOption: clean.answerIndex,
      category: clean.category,
      difficulty: clean.difficulty,
      sourceUrl: clean.sourceUrl ?? null,
      sourceNote: clean.sourceNote ?? null,
      status: 'pending',
      submitterId: userId,
      submitterName,
    });
    return { submitted: true, status: 'pending' };
  }

  // ---------------- 管理员：题库 CRUD ----------------

  async adminList(query: {
    page?: string;
    pageSize?: string;
    status?: string;
    category?: string;
    keyword?: string;
  }) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const pageSize = Math.min(Math.max(parseInt(query.pageSize || '20', 10) || 20, 1), 100);
    const conditions = [];
    if (query.status) conditions.push(eq(quizQuestions.status, query.status));
    if (query.category === 'basic' || query.category === 'sugar') {
      conditions.push(eq(quizQuestions.category, query.category));
    }
    if (query.keyword) conditions.push(like(quizQuestions.stem, `%${query.keyword}%`));

    const where = conditions.length ? and(...conditions) : undefined;

    const countRows = await this.db
      .select({ n: sql<string>`COUNT(*)` })
      .from(quizQuestions)
      .where(where);
    const total = Number(countRows[0]?.n || 0);

    const items = await this.db
      .select()
      .from(quizQuestions)
      .where(where)
      .orderBy(desc(quizQuestions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async adminCreate(data: QuestionInput) {
    const clean = this.validateQuestion(data);
    const id = randomUUID();
    await this.db.insert(quizQuestions).values({
      id,
      stem: clean.stem,
      options: clean.options,
      correctOption: clean.answerIndex,
      category: clean.category,
      difficulty: clean.difficulty,
      sourceUrl: clean.sourceUrl ?? null,
      sourceNote: clean.sourceNote ?? null,
      status: 'active',
    });
    return { id };
  }

  async adminUpdate(
    id: string,
    patch: Partial<QuestionInput> & { status?: string },
  ) {
    await this.getQuestionOrThrow(id);
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.stem != null) values.stem = patch.stem;
    if (patch.options != null) {
      if (!Array.isArray(patch.options) || patch.options.length !== 4) {
        throw new BadRequestException('选项必须为 4 个');
      }
      values.options = patch.options;
    }
    if (patch.answerIndex != null) {
      const ai = Number(patch.answerIndex);
      if (!(ai >= 0 && ai <= 3)) throw new BadRequestException('正确答案下标非法');
      values.correctOption = ai;
    }
    if (patch.sourceUrl != null) values.sourceUrl = patch.sourceUrl;
    if (patch.sourceNote != null) values.sourceNote = patch.sourceNote;
    if (['active', 'disabled', 'pending'].includes(patch.status || '')) {
      values.status = patch.status;
    }
    await this.db.update(quizQuestions).set(values).where(eq(quizQuestions.id, id));
    return { id, updated: true };
  }

  async adminDelete(id: string) {
    await this.getQuestionOrThrow(id);
    await this.db.delete(quizQuestions).where(eq(quizQuestions.id, id));
    return { id, deleted: true };
  }

  async review(id: string, status: 'active' | 'disabled') {
    await this.getQuestionOrThrow(id);
    await this.db
      .update(quizQuestions)
      .set({ status, updatedAt: new Date() })
      .where(eq(quizQuestions.id, id));
    return { id, status };
  }

  // ---------------- 内部工具 ----------------

  private async getQuestionOrThrow(id: string) {
    const rows = await this.db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.id, id))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('题目不存在');
    return rows[0];
  }

  private validateQuestion(data: QuestionInput): {
    stem: string;
    options: string[];
    answerIndex: number;
    category: string;
    difficulty: string;
    sourceUrl: string;
    sourceNote: string;
  } {
    const stem = String(data.stem || '').trim();
    const options = Array.isArray(data.options) ? data.options.map((o) => String(o)) : [];
    const answerIndex = Number(data.answerIndex);
    if (!stem) throw new BadRequestException('题干不能为空');
    if (options.length !== 4) throw new BadRequestException('选项必须为 4 个');
    if (new Set(options).size !== 4) throw new BadRequestException('选项不能重复');
    if (!(answerIndex >= 0 && answerIndex <= 3)) {
      throw new BadRequestException('正确答案下标必须为 0-3');
    }
    return {
      stem,
      options,
      answerIndex,
      category: '',
      difficulty: '',
      sourceUrl: data.sourceUrl?.trim() || '',
      sourceNote: data.sourceNote?.trim() || '',
    };
  }
}
