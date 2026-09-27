import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from '@client/src/utils/api-client';
import type { PagedResponse } from '@shared/api.interface';

export interface QuizQuestion {
  id: string;
  stem: string;
  options: string[];
  category: string;
  difficulty: string;
}

export interface QuizQuestionFull extends QuizQuestion {
  correctOption: number;
  sourceUrl?: string;
  sourceNote?: string;
  status: string;
  submitterId?: string;
  submitterName?: string;
}

export interface QuizSubmitResult {
  mode: string;
  score: number;
  correctCount: number;
  total: number;
  maxStreak: number;
  detail: Array<{
    questionId: string;
    selected: number;
    correct: number;
    isCorrect: boolean;
  }>;
}

export interface LeaderboardRow {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  mode: string;
  score: number;
  correctCount: number;
  total: number;
  durationSec?: number;
  maxStreak?: number;
  createdAt: string;
}

export interface QuestionInput {
  stem: string;
  options: string[];
  answerIndex: number;
  category?: string;
  difficulty?: string;
  sourceUrl?: string;
  sourceNote?: string;
}

// ---------------- 玩家 ----------------

export async function getQuestions(params: {
  mode?: string;
  category?: string;
  count?: number;
}): Promise<QuizQuestion[]> {
  const res = await apiGet<{ data: QuizQuestion[] }>(
    '/api/quiz/questions',
    params,
  );
  return res.data;
}

export async function answerOne(data: {
  questionId: string;
  selectedIndex: number;
}): Promise<boolean> {
  const res = await apiPost<{ data: { isCorrect: boolean } }>(
    '/api/quiz/answer-one',
    data,
  );
  return res.data.isCorrect;
}

export async function submitAnswers(data: {
  mode: string;
  answers: Array<{ questionId: string; selectedIndex: number }>;
  durationSec?: number;
  maxStreak?: number;
}): Promise<QuizSubmitResult> {
  const res = await apiPost<{ data: QuizSubmitResult }>(
    '/api/quiz/submit',
    data,
  );
  return res.data;
}

export async function getLeaderboard(params: {
  mode: string;
  period: 'day' | 'week';
}): Promise<LeaderboardRow[]> {
  const res = await apiGet<{ data: LeaderboardRow[] }>(
    '/api/quiz/leaderboard',
    params,
  );
  return res.data;
}

export async function getCanSubmit(): Promise<boolean> {
  const res = await apiGet<{ data: { canSubmit: boolean } }>(
    '/api/quiz/can-submit',
  );
  return res.data.canSubmit;
}

export async function submitQuestion(
  data: QuestionInput,
): Promise<{ submitted: boolean; status: string }> {
  const res = await apiPost<{ data: { submitted: boolean; status: string } }>(
    '/api/quiz/submit-question',
    data,
  );
  return res.data;
}

// ---------------- 玩家：在线对决 ----------------

export interface BattleSubmitResult {
  scoreId: string;
  score: number;
  correctCount: number;
  total: number;
  durationSec: number | null;
  detail: QuizSubmitResult['detail'];
}

export interface BattleSettleResult {
  result: 'win' | 'lose' | 'draw';
  mine: {
    score: number;
    correctCount: number;
    total: number;
    durationSec: number | null;
  };
  opponent: {
    score: number;
    correctCount: number;
    total: number;
    durationSec: number | null;
  } | null;
}

export async function getAblyToken(): Promise<Record<string, unknown>> {
  const res = await apiGet<{ data: Record<string, unknown> }>(
    '/api/quiz/ably-token',
  );
  return res.data;
}

export async function battleStart(): Promise<QuizQuestion[]> {
  const res = await apiPost<{ data: QuizQuestion[] }>(
    '/api/quiz/battle/start',
    {},
  );
  return res.data;
}

export async function getQuestionsByIds(ids: string[]): Promise<QuizQuestion[]> {
  const res = await apiPost<{ data: QuizQuestion[] }>(
    '/api/quiz/battle/by-ids',
    { ids },
  );
  return res.data;
}

export async function battleSubmit(data: {
  answers: Array<{ questionId: string; selectedIndex: number }>;
  opponentId: string;
  durationSec?: number;
}): Promise<BattleSubmitResult> {
  const res = await apiPost<{ data: BattleSubmitResult }>(
    '/api/quiz/battle/submit',
    data,
  );
  return res.data;
}

export async function battleSettle(data: {
  scoreId: string;
  opponentId: string;
}): Promise<BattleSettleResult> {
  const res = await apiPost<{ data: BattleSettleResult }>(
    '/api/quiz/battle/settle',
    data,
  );
  return res.data;
}

// ---------------- 管理员：题库 ----------------

export async function adminListQuestions(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  category?: string;
  keyword?: string;
}): Promise<PagedResponse<QuizQuestionFull>> {
  const res = await apiGet<{ data: PagedResponse<QuizQuestionFull> }>(
    '/api/quiz/admin/questions',
    params,
  );
  return res.data;
}

export async function adminCreateQuestion(
  data: QuestionInput,
): Promise<{ id: string }> {
  const res = await apiPost<{ data: { id: string } }>(
    '/api/quiz/admin/questions',
    data,
  );
  return res.data;
}

export async function adminUpdateQuestion(
  id: string,
  data: Partial<QuestionInput> & { status?: string },
): Promise<{ id: string; updated: boolean }> {
  const res = await apiPatch<{ data: { id: string; updated: boolean } }>(
    `/api/quiz/admin/questions/${id}`,
    data,
  );
  return res.data;
}

export async function adminDeleteQuestion(
  id: string,
): Promise<{ id: string; deleted: boolean }> {
  const res = await apiDelete<{ data: { id: string; deleted: boolean } }>(
    `/api/quiz/admin/questions/${id}`,
  );
  return res.data;
}

export async function adminReviewQuestion(
  id: string,
  status: 'active' | 'disabled',
): Promise<{ id: string; status: string }> {
  const res = await apiPost<{ data: { id: string; status: string } }>(
    `/api/quiz/admin/questions/${id}/review`,
    { status },
  );
  return res.data;
}
