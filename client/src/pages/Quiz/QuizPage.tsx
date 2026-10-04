import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Timer,
  Flame,
  Swords,
  Lock,
  RotateCcw,
  Home as HomeIcon,
  Crown,
  PenLine,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@client/src/store/auth.store';
import {
  quizApi,
  type QuizQuestion,
  type QuizSubmitResult,
  type LeaderboardRow,
  type QuestionInput,
} from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import BattleView from './BattleView';

type Mode = 'timed' | 'streak';
type View = 'home' | 'play' | 'result';

const TIMED_SECONDS = 90;
const EMPTY_QFORM: QuestionInput = {
  stem: '',
  options: ['', '', '', ''],
  answerIndex: 0,
  category: 'sugar',
  difficulty: 'medium',
  sourceUrl: '',
};

const QuizPage: React.FC = () => {
  const { user } = useAuthStore();

  const [view, setView] = useState<View>('home');
  const [showBattle, setShowBattle] = useState(false);
  const [mode, setMode] = useState<Mode>('timed');
  const [starting, setStarting] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Array<{ questionId: string; selectedIndex: number }>
  >([]);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMED_SECONDS);

  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [boardMode, setBoardMode] = useState<Mode>('timed');
  const [boardPeriod, setBoardPeriod] = useState<'day' | 'week'>('day');
  const [canSubmit, setCanSubmit] = useState(false);

  const [askOpen, setAskOpen] = useState(false);
  const [qForm, setQForm] = useState<QuestionInput>(EMPTY_QFORM);
  const [sendingQ, setSendingQ] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const startRef = useRef(0);

  // ---------------- 榜单 ----------------

  const loadBoard = async (m: Mode, p: 'day' | 'week') => {
    try {
      setBoard(await quizApi.getLeaderboard({ mode: m, period: p }));
    } catch {
      setBoard([]);
    }
  };

  useEffect(() => {
    loadBoard(boardMode, boardPeriod);
  }, [boardMode, boardPeriod]);

  useEffect(() => {
    if (user && view === 'home') {
      quizApi.getCanSubmit().then(setCanSubmit).catch(() => {});
    }
  }, [user, view, result]);

  // ---------------- 限时赛倒计时 ----------------

  const finish = async () => {
    const m = modeRef.current;
    const ans = answersRef.current;
    if (ans.length === 0) {
      setView('home');
      return;
    }
    const durationSec =
      m === 'timed'
        ? Math.max(1, Math.round((Date.now() - startRef.current) / 1000))
        : undefined;
    try {
      const r = await quizApi.submitAnswers({ mode: m, answers: ans, durationSec });
      setResult(r);
      setView('result');
      loadBoard(boardMode, boardPeriod);
    } catch {
      toast.error('提交失败，请重试');
      setView('home');
    }
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (view !== 'play' || mode !== 'timed') return;
    if (timeLeft <= 0) {
      finishRef.current();
      return;
    }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [view, mode, timeLeft]);

  // ---------------- 开始 ----------------

  const startGame = async (m: Mode) => {
    if (!user) {
      toast.error('请先登录后再参赛');
      return;
    }
    setStarting(true);
    setMode(m);
    setIndex(0);
    setAnswers([]);
    answersRef.current = [];
    setResult(null);
    setTimeLeft(TIMED_SECONDS);
    try {
      const qs = await quizApi.getQuestions({
        mode: m,
        count: m === 'timed' ? 10 : 20,
      });
      setQuestions(qs);
      startRef.current = Date.now();
      setView('play');
    } catch {
      toast.error('题目加载失败');
    } finally {
      setStarting(false);
    }
  };

  // ---------------- 作答 ----------------

  const onSelectTimed = (selectedIndex: number) => {
    const q = questionsRef.current[index];
    if (!q) return;
    const ans = [...answersRef.current, { questionId: q.id, selectedIndex }];
    answersRef.current = ans;
    setAnswers(ans);
    if (index + 1 >= questionsRef.current.length) {
      finish();
    } else {
      setIndex((i) => i + 1);
    }
  };

  const onSelectStreak = async (selectedIndex: number) => {
    const q = questionsRef.current[index];
    if (!q) return;
    const ans = [...answersRef.current, { questionId: q.id, selectedIndex }];
    answersRef.current = ans;
    setAnswers(ans);
    try {
      const ok = await quizApi.answerOne({ questionId: q.id, selectedIndex });
      if (ok) {
        if (index + 1 >= questionsRef.current.length) {
          await finish();
        } else {
          setIndex((i) => i + 1);
        }
      } else {
        await finish(); // 答错即止
      }
    } catch {
      toast.error('网络异常，请重试');
    }
  };

  const backHome = () => {
    setView('home');
    setResult(null);
  };

  // ---------------- 出题 ----------------

  const submitMyQuestion = async () => {
    if (!qForm.stem.trim()) {
      toast.error('请填写题干');
      return;
    }
    if (qForm.options.some((o) => !o.trim())) {
      toast.error('请填写 4 个选项');
      return;
    }
    setSendingQ(true);
    try {
      await quizApi.submitQuestion({
        ...qForm,
        options: qForm.options.map((o) => o.trim()),
      });
      toast.success('题目已提交，等待管理员审核');
      setAskOpen(false);
      setQForm(EMPTY_QFORM);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '提交失败');
    } finally {
      setSendingQ(false);
    }
  };

  if (showBattle) {
    return <BattleView onExit={() => setShowBattle(false)} />;
  }

  // ================= 渲染：首页 =================

  if (view === 'home') {
    const modes = [
      {
        key: 'battle',
        icon: Swords,
        title: '在线对决',
        desc: '开房邀请好友，同题竞速',
        disabled: false,
      },
      { key: 'timed', icon: Timer, title: '限时赛', desc: `${TIMED_SECONDS} 秒内答 10 题`, disabled: false },
      { key: 'streak', icon: Flame, title: '连胜赛', desc: '答错即止，挑战最长连胜', disabled: false },
    ];

    return (
      <div className="max-w-4xl mx-auto pb-12">
        <div className="text-center mb-8 pt-6">
          <h1
            className="text-4xl md:text-5xl text-ink flex items-center justify-center gap-2"
            style={{ fontFamily: 'var(--font-handwriting)' }}
          >
            <Trophy className="text-shiba" size={36} /> 疝鸡杯
          </h1>
          <p className="mt-2 text-sm text-cocoa/60">37 相关小问答 · 仅限注册用户参赛</p>
          {!user ? (
            <p className="mt-3 text-sm text-coral">
              请先<Link to="/login" className="underline">登录</Link>后参赛
            </p>
          ) : canSubmit ? (
            <Button
              onClick={() => {
                setQForm(EMPTY_QFORM);
                setAskOpen(true);
              }}
              className="mt-3 rounded-full gap-1.5"
            >
              <Crown size={15} /> 我是榜首，我要出题
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {modes.map((m) => (
            <button
              key={m.key}
              disabled={m.disabled}
              onClick={() => {
                if (m.key === 'battle') {
                  if (!user) {
                    toast.error('请先登录后再参赛');
                    return;
                  }
                  setShowBattle(true);
                } else {
                  startGame(m.key as Mode);
                }
              }}
              className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                m.disabled
                  ? 'border-grid opacity-60 cursor-not-allowed'
                  : 'border-shiba/40 bg-paper hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <m.icon
                size={34}
                className={m.disabled ? 'text-cocoa/40 mx-auto' : 'text-shiba mx-auto'}
              />
              <p className="mt-3 text-lg text-ink font-medium">{m.title}</p>
              <p className="mt-1 text-xs text-cocoa/60">{m.desc}</p>
              {m.disabled ? (
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-cocoa/50">
                  <Lock size={11} /> 即将开放
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* 榜单 */}
        <div className="bg-paper rounded-2xl border-2 border-dashed border-grid p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex rounded-full bg-cream p-1">
              {(['timed', 'streak'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setBoardMode(m)}
                  className={`px-4 py-1 rounded-full text-sm transition-colors ${
                    boardMode === m ? 'bg-shiba text-white' : 'text-cocoa/70'
                  }`}
                >
                  {m === 'timed' ? '限时赛' : '连胜赛'}
                </button>
              ))}
            </div>
            <div className="flex rounded-full bg-cream p-1">
              {(['day', 'week'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setBoardPeriod(p)}
                  className={`px-4 py-1 rounded-full text-sm transition-colors ${
                    boardPeriod === p ? 'bg-penguin text-white' : 'text-cocoa/70'
                  }`}
                >
                  {p === 'day' ? '日榜' : '周榜'}
                </button>
              ))}
            </div>
          </div>

          {board.length === 0 ? (
            <p className="py-10 text-center text-sm text-cocoa/50">
              暂无成绩，来拿下第一名吧
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {board.map((row, i) => (
                  <tr key={row.id} className="border-b border-dashed border-grid last:border-0">
                    <td className="py-2.5 w-10 text-center">
                      {i === 0 ? (
                        <Crown size={18} className="text-amber inline" />
                      ) : (
                        <span className="text-cocoa/50">{i + 1}</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        {row.avatarUrl ? (
                          <img src={row.avatarUrl} className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-mint text-cocoa flex items-center justify-center text-xs">
                            {row.displayName?.[0]}
                          </span>
                        )}
                        <span className="text-ink">{row.displayName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="text-shiba font-bold">
                        {boardMode === 'streak'
                          ? `${row.maxStreak ?? row.score} 连胜`
                          : `${row.score} 分`}
                      </span>
                      {boardMode === 'timed' && row.durationSec ? (
                        <span className="ml-2 text-xs text-cocoa/50">{row.durationSec}s</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 出题 Dialog */}
        <Dialog open={askOpen} onOpenChange={setAskOpen}>
          <DialogContent className="max-w-lg bg-paper border-2 border-dashed border-grid rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-ink">
                <PenLine size={18} /> 我要出题
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>题干</Label>
                <textarea
                  rows={2}
                  value={qForm.stem}
                  onChange={(e) => setQForm((f) => ({ ...f, stem: e.target.value }))}
                  className="w-full rounded-lg border-2 border-cocoa/10 bg-cream/40 px-3 py-2 text-sm focus:border-shiba focus:outline-none"
                />
              </div>
              {qForm.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={qForm.answerIndex === i}
                    onChange={() => setQForm((f) => ({ ...f, answerIndex: i }))}
                    className="accent-shiba w-4 h-4"
                  />
                  <Input
                    value={opt}
                    onChange={(e) =>
                      setQForm((f) => {
                        const options = [...f.options];
                        options[i] = e.target.value;
                        return { ...f, options };
                      })
                    }
                    placeholder={`选项 ${String.fromCharCode(65 + i)}`}
                    className="rounded-lg"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={qForm.category}
                  onChange={(e) => setQForm((f) => ({ ...f, category: e.target.value }))}
                  className="rounded-lg border-2 border-cocoa/10 bg-cream/40 px-3 py-2 text-sm"
                >
                  <option value="sugar">糖点</option>
                  <option value="basic">基础</option>
                </select>
                <select
                  value={qForm.difficulty}
                  onChange={(e) => setQForm((f) => ({ ...f, difficulty: e.target.value }))}
                  className="rounded-lg border-2 border-cocoa/10 bg-cream/40 px-3 py-2 text-sm"
                >
                  <option value="easy">简单</option>
                  <option value="medium">普通</option>
                  <option value="hard">困难</option>
                </select>
              </div>
              <Input
                value={qForm.sourceUrl}
                onChange={(e) => setQForm((f) => ({ ...f, sourceUrl: e.target.value }))}
                placeholder="出处链接（可选）"
                className="rounded-lg"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAskOpen(false)} className="rounded-full">
                取消
              </Button>
              <Button onClick={submitMyQuestion} disabled={sendingQ} className="rounded-full">
                提交审核
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ================= 渲染：作答 =================

  if (view === 'play') {
    if (starting || questions.length === 0) {
      return <p className="py-24 text-center text-cocoa/60">正在准备题目…</p>;
    }
    const q = questions[index];
    const progress = ((index + (mode === 'timed' ? 1 : 0)) / questions.length) * 100;

    return (
      <div className="max-w-2xl mx-auto pb-12 pt-6">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-cocoa/60">
            {mode === 'timed' ? `第 ${index + 1}/${questions.length} 题` : `当前连胜 ${index}`}
          </span>
          {mode === 'timed' ? (
            <span className={`font-mono font-bold ${timeLeft <= 15 ? 'text-coral' : 'text-shiba'}`}>
              <Timer size={14} className="inline mr-1" />
              {timeLeft}s
            </span>
          ) : null}
        </div>
        <div className="h-2 rounded-full bg-grid/40 overflow-hidden mb-8">
          <div className="h-full bg-shiba transition-all" style={{ width: `${progress}%` }} />
        </div>

        <h2 className="text-xl md:text-2xl text-ink leading-relaxed mb-8 min-h-[4.5rem]">
          {q.stem}
        </h2>

        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => (mode === 'timed' ? onSelectTimed(i) : onSelectStreak(i))}
              className="w-full text-left rounded-2xl border-2 border-cocoa/15 bg-paper px-5 py-3.5 text-cocoa hover:border-shiba hover:bg-shiba/5 transition-colors"
            >
              <span className="inline-flex w-7 h-7 rounded-full bg-cream items-center justify-center text-sm font-bold mr-3">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ================= 渲染：结果 =================

  return (
    <div className="max-w-2xl mx-auto pb-12 pt-8">
      <div className="text-center mb-8">
        {mode === 'streak' ? (
          <p className="text-5xl text-shiba font-bold flex items-center justify-center gap-2">
            <Flame /> {result?.maxStreak ?? 0}
          </p>
        ) : (
          <p className="text-5xl text-shiba font-bold">
            {result?.correctCount ?? 0}
            <span className="text-2xl text-cocoa/50">/{result?.total ?? 0}</span>
          </p>
        )}
        <p className="mt-2 text-cocoa/70">
          {mode === 'streak' ? '最高连胜' : '答对题数'}
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {result?.detail.map((d, i) => {
          const q = questions.find((x) => x.id === d.questionId);
          const stem = d.stem ?? q?.stem ?? '';
          const opts = d.options ?? q?.options ?? [];
          return (
            <div
              key={d.questionId}
              className={`rounded-xl border-2 bg-paper px-4 py-3 text-sm ${
                d.isCorrect ? 'border-teal/40' : 'border-coral/60'
              }`}
            >
              <p className="text-ink font-medium mb-2">
                {d.isCorrect ? '✓ ' : '✗ '}
                {i + 1}. {stem}
              </p>
              <div className="space-y-1.5">
                {opts.map((opt, oi) => {
                  const isRight = oi === d.correct;
                  const isPicked = oi === d.selected;
                  let cls = 'border-cocoa/10 bg-cream/30 text-cocoa/80';
                  let tag = null;
                  if (isRight) {
                    cls = 'border-teal bg-teal/15 text-ink';
                    tag = <span className="text-[11px] text-teal font-bold ml-auto">正确答案</span>;
                  } else if (isPicked) {
                    cls = 'border-coral bg-coral/15 text-coral';
                    tag = <span className="text-[11px] text-coral font-bold ml-auto">你的选择</span>;
                  }
                  return (
                    <div key={oi} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${cls}`}>
                      <span className="font-bold w-5 shrink-0">{String.fromCharCode(65 + oi)}</span>
                      <span className="flex-1">{opt}</span>
                      {tag}
                    </div>
                  );
                })}
              </div>
              {d.sourceUrl || d.sourceNote ? (
                <p className="mt-2 text-xs text-cocoa/50">
                  出处：
                  {d.sourceUrl ? (
                    <a
                      href={d.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-penguin hover:text-shiba"
                    >
                      {d.sourceNote || '查看来源'}
                    </a>
                  ) : (
                    d.sourceNote
                  )}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" onClick={backHome} className="rounded-full gap-1.5">
          <HomeIcon size={15} /> 返回
        </Button>
        <Button onClick={() => startGame(mode)} className="rounded-full gap-1.5">
          <RotateCcw size={15} /> 再来一局
        </Button>
      </div>
    </div>
  );
};

export default QuizPage;
