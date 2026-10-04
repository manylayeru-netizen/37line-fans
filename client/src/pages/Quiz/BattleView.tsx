import { useEffect, useRef, useState } from 'react';
import * as Ably from 'ably';
import { Swords, Copy, Check, LogOut, Users, Timer, Crown } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@client/src/store/auth.store';
import {
  quizApi,
  type QuizQuestion,
  type BattleSettleResult,
  type BattleSubmitResult,
} from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';

interface Member {
  clientId: string;
  name: string;
  avatar: string;
  ready: boolean;
  progress: number;
}

type Phase = 'lobby' | 'room' | 'play' | 'result';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode(): string {
  let s = '';
  for (let i = 0; i < 6; i += 1) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

const BattleView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { user } = useAuthStore();
  const myId = user?.id ?? '';
  const myName = user?.displayName || user?.username || '用户';
  const myAvatar = user?.avatarUrl || '';

  const [phase, setPhase] = useState<Phase>('lobby');
  const [role, setRole] = useState<'host' | 'guest'>('host');
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const [members, setMembers] = useState<Record<string, Member>>({});
  const [myReady, setMyReady] = useState(false);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [myDetail, setMyDetail] = useState<BattleSubmitResult | null>(null);
  const [settle, setSettle] = useState<BattleSettleResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [battleCount, setBattleCount] = useState(10);

  const realtimeRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const questionsRef = useRef<QuizQuestion[]>([]);
  const answersRef = useRef<Record<string, number>>({});
  const opponentRef = useRef<Member | null>(null);
  const startRef = useRef(0);
  const scoreIdRef = useRef<string | null>(null);
  const oppResultRef = useRef<{ score: number; durationSec: number } | null>(null);
  const detailRef = useRef<BattleSubmitResult | null>(null);

  // 对手派生
  useEffect(() => {
    opponentRef.current =
      Object.values(members).find((m) => m.clientId !== myId) ?? null;
  }, [members, myId]);

  // 计时器（仅 play）
  useEffect(() => {
    if (phase !== 'play' || submitted) return;
    const t = setInterval(() => {
      setElapsed(Math.round((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => clearInterval(t);
  }, [phase, submitted]);

  // ---------------- Ably 连接 ----------------

  const ensureRealtime = (): Promise<Ably.Realtime> =>
    new Promise((resolve, reject) => {
      if (realtimeRef.current && realtimeRef.current.connection.state === 'connected') {
        resolve(realtimeRef.current);
        return;
      }
      const rt = new Ably.Realtime({
        echoMessages: false,
        authCallback: async (_p: any, cb: any) => {
          try {
            const tokenReq = await quizApi.getAblyToken();
            cb(null, tokenReq);
          } catch (e) {
            cb(e as Error, null);
          }
        },
      });
      rt.connection.once('connected', () => {
        realtimeRef.current = rt;
        resolve(rt);
      });
      rt.connection.once('failed', () => reject(new Error('实时连接失败')));
    });

  const refreshPresence = async () => {
    const ch = channelRef.current;
    if (!ch) return;
    const page = (await ch.presence.get()) as any;
    const list: any[] = Array.isArray(page) ? page : (page.items ?? []);
    const map: Record<string, Member> = {};
    list.forEach((pm: any) => {
      map[pm.clientId] = {
        clientId: pm.clientId,
        name: pm.data?.name ?? '用户',
        avatar: pm.data?.avatar ?? '',
        ready: !!pm.data?.ready,
        progress: pm.data?.progress ?? 0,
      };
    });
    setMembers(map);
  };

  const beginPlay = (qs: QuizQuestion[]) => {
    questionsRef.current = qs;
    answersRef.current = {};
    scoreIdRef.current = null;
    oppResultRef.current = null;
    setQuestions(qs);
    setAnswers({});
    setIndex(0);
    setSubmitted(false);
    setSettle(null);
    setMyDetail(null);
    detailRef.current = null;
    setElapsed(0);
    startRef.current = Date.now();
    setPhase('play');
  };

  const maybeSettle = async () => {
    if (!scoreIdRef.current || !oppResultRef.current) return;
    const opp = opponentRef.current;
    if (!opp) return;
    try {
      const s = await quizApi.battleSettle({
        scoreId: scoreIdRef.current,
        opponentId: opp.clientId,
      });
      setSettle(s);
      setPhase('result');
    } catch {
      toast.error('结果确认失败，请稍后重试');
    }
  };

  const onStartMsg = async (msg: any) => {
    const ids = (msg.data?.questionIds ?? []) as string[];
    const qs = await quizApi.getQuestionsByIds(ids);
    if (qs.length) beginPlay(qs);
  };

  const onResultMsg = (msg: any) => {
    oppResultRef.current = {
      score: Number(msg.data?.score ?? 0),
      durationSec: Number(msg.data?.durationSec ?? 0),
    };
    maybeSettle();
  };

  // ---------------- 进入房间 ----------------

  const joinChannel = async (code: string, asHost: boolean) => {
    setBusy(true);
    try {
      const rt = await ensureRealtime();
      const ch = rt.channels.get(`battle:${code}`);
      channelRef.current = ch;
      ch.subscribe('start', onStartMsg);
      ch.subscribe('result', onResultMsg);
      ch.presence.subscribe(['enter', 'leave', 'update'], refreshPresence);
      await ch.presence.enter({
        name: myName,
        avatar: myAvatar,
        ready: false,
        progress: 0,
      });
      await refreshPresence();
      setRoomCode(code);
      setRole(asHost ? 'host' : 'guest');
      setMyReady(false);
      setPhase('room');
    } catch {
      toast.error('无法进入房间，请重试');
    } finally {
      setBusy(false);
    }
  };

  const createRoom = () => joinChannel(genCode(), true);

  const joinRoom = () => {
    const code = joinInput.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error('房间码为 6 位');
      return;
    }
    joinChannel(code, false);
  };

  // ---------------- 准备 / 开始 ----------------

  const toggleReady = async () => {
    const ch = channelRef.current;
    if (!ch) return;
    const next = !myReady;
    await ch.presence.update({
      name: myName,
      avatar: myAvatar,
      ready: next,
      progress: Object.keys(answersRef.current).length,
    });
    setMyReady(next);
    await refreshPresence();
  };

  const bothPresent = Object.keys(members).length >= 2;
  const bothReady =
    bothPresent && Object.values(members).every((m) => m.ready);

  const hostStart = async () => {
    const ch = channelRef.current;
    if (!ch || !bothReady) return;
    setBusy(true);
    try {
      const qs = await quizApi.battleStart(battleCount);
      await ch.publish('start', { questionIds: qs.map((q) => q.id) });
      beginPlay(qs);
    } catch {
      toast.error('开始失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  // ---------------- 作答 / 交卷 ----------------

  const submitBattle = async (ansMap: Record<string, number>) => {
    const opp = opponentRef.current;
    const qs = questionsRef.current;
    if (!opp) {
      toast.error('对手已离开房间');
      return;
    }
    const durationSec = Math.max(
      1,
      Math.round((Date.now() - startRef.current) / 1000),
    );
    const answerArr = qs.map((q) => ({
      questionId: q.id,
      selectedIndex: ansMap[q.id] ?? -1,
    }));
    try {
      const r = await quizApi.battleSubmit({
        answers: answerArr,
        opponentId: opp.clientId,
        durationSec,
      });
      scoreIdRef.current = r.scoreId;
      setMyDetail(r);
      detailRef.current = r;
      setSubmitted(true);
      await channelRef.current?.publish('result', {
        score: r.score,
        durationSec,
        scoreId: r.scoreId,
      });
      maybeSettle();
    } catch {
      toast.error('提交失败，请重试');
    }
  };

  const choose = async (qIndex: number, optIndex: number) => {
    if (submitted) return;
    const qs = questionsRef.current;
    const q = qs[qIndex];
    const next = { ...answersRef.current, [q.id]: optIndex };
    answersRef.current = next;
    setAnswers(next);
    await channelRef.current?.presence.update({
      name: myName,
      avatar: myAvatar,
      ready: myReady,
      progress: Object.keys(next).length,
    });
    if (qIndex + 1 >= qs.length) {
      await submitBattle(next);
    } else {
      setIndex(qIndex + 1);
    }
  };

  // ---------------- 离开 / 清理 ----------------

  const leaveToLobby = async () => {
    const ch = channelRef.current;
    if (ch) {
      await ch.presence.leave().catch(() => {});
      ch.unsubscribe();
      ch.presence.unsubscribe();
    }
    channelRef.current = null;
    setRoomCode('');
    setMembers({});
    setMyReady(false);
    setQuestions([]);
    setAnswers({});
    setSettle(null);
    setPhase('lobby');
  };

  useEffect(
    () => () => {
      const ch = channelRef.current;
      if (ch) {
        ch.presence.leave().catch(() => {});
        ch.unsubscribe();
      }
      realtimeRef.current?.close();
    },
    [],
  );

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ================= 大厅 =================

  if (phase === 'lobby') {
    return (
      <div className="max-w-xl mx-auto pb-12 pt-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl text-ink flex items-center justify-center gap-2">
            <Swords className="text-shiba" size={28} /> 在线对决
          </h2>
          <p className="mt-2 text-sm text-cocoa/60">
            开房邀请好友，同题竞速，答对多、用时短者胜
          </p>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-shiba/40 bg-paper p-6 text-center mb-4">
          <Users size={30} className="text-shiba mx-auto" />
          <p className="mt-2 text-ink font-medium">创建房间</p>
          <p className="text-xs text-cocoa/60 mt-1 mb-3">
            生成房间码，邀请好友加入后开始
          </p>
          <div className="flex items-center justify-center gap-1.5 mb-4">
            <span className="text-xs text-cocoa/60 mr-1">题目数</span>
            {[5, 10, 15, 20].map((n) => (
              <button
                key={n}
                onClick={() => setBattleCount(n)}
                className={`w-9 h-9 rounded-full text-sm transition-colors ${
                  battleCount === n
                    ? 'bg-shiba text-white'
                    : 'bg-cream text-cocoa/70 hover:bg-shiba/10'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <Button onClick={createRoom} disabled={busy} className="rounded-full">
            创建房间
          </Button>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-grid bg-paper p-6">
          <p className="text-ink font-medium text-center">加入房间</p>
          <div className="flex gap-2 mt-3">
            <Input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="输入 6 位房间码"
              className="rounded-lg uppercase tracking-widest text-center"
            />
            <Button
              onClick={joinRoom}
              disabled={busy}
              className="rounded-full shrink-0"
            >
              加入
            </Button>
          </div>
        </div>

        <div className="text-center mt-8">
          <Button variant="outline" onClick={onExit} className="rounded-full gap-1.5">
            <LogOut size={15} /> 返回疝鸡杯
          </Button>
        </div>
      </div>
    );
  }

  // ================= 房间等待 =================

  if (phase === 'room') {
    const list = Object.values(members);
    const other = opponentRef.current;
    return (
      <div className="max-w-xl mx-auto pb-12 pt-6">
        <div className="text-center mb-6">
          <p className="text-sm text-cocoa/60">房间码</p>
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="text-4xl font-mono tracking-[0.3em] text-ink">
              {roomCode}
            </span>
            <button onClick={copyCode} className="text-cocoa/50 hover:text-shiba">
              {copied ? <Check size={18} className="text-teal" /> : <Copy size={18} />}
            </button>
          </div>
          <p className="text-xs text-cocoa/50 mt-2">
            把房间码发给好友，让 TA 选择「加入房间」
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {[myId, other?.clientId ?? 'wait'].map((cid, slot) => {
            const m = cid === 'wait' ? null : members[cid];
            return (
              <div
                key={slot}
                className="rounded-2xl border-2 border-dashed border-grid bg-paper p-5 text-center"
              >
                {m ? (
                  <>
                    {m.avatar ? (
                      <img src={m.avatar} className="w-16 h-16 rounded-full object-cover mx-auto" />
                    ) : (
                      <span className="w-16 h-16 rounded-full bg-mint text-cocoa flex items-center justify-center text-xl mx-auto">
                        {m.name[0]}
                      </span>
                    )}
                    <p className="mt-2 text-ink text-sm">{m.name}</p>
                    <p className={`text-xs mt-1 ${m.ready ? 'text-teal' : 'text-cocoa/50'}`}>
                      {m.ready ? '✓ 已准备' : '未准备'}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="w-16 h-16 rounded-full bg-cream text-cocoa/40 flex items-center justify-center text-xl mx-auto">
                      ?
                    </span>
                    <p className="mt-2 text-cocoa/50 text-sm">等待对手加入…</p>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center space-y-3">
          {role === 'host' ? (
            <>
              <Button
                onClick={hostStart}
                disabled={!bothReady || busy}
                className="rounded-full px-8"
              >
                开始对战
              </Button>
              {!bothPresent ? (
                <p className="text-xs text-cocoa/50">等对手加入并双方准备</p>
              ) : !bothReady ? (
                <p className="text-xs text-cocoa/50">等双方都点准备</p>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-cocoa/50">
              {myReady ? '已准备，等待房主开始…' : '准备后等待房主开始'}
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant={myReady ? 'outline' : 'default'}
              onClick={toggleReady}
              className="rounded-full"
            >
              {myReady ? '取消准备' : '我准备好了'}
            </Button>
            <Button variant="outline" onClick={leaveToLobby} className="rounded-full gap-1.5">
              <LogOut size={15} /> 离开
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ================= 作答 =================

  if (phase === 'play') {
    const q = questions[index];
    const opp = opponentRef.current;
    const myProgress = Object.keys(answers).length;
    const oppProgress = opp?.progress ?? 0;
    const progress = ((submitted ? questions.length : index) / questions.length) * 100;

    return (
      <div className="max-w-2xl mx-auto pb-12 pt-4">
        {/* 双方状态条 */}
        <div className="flex items-center justify-between mb-3 text-sm">
          <div className="flex items-center gap-2">
            {myAvatar ? (
              <img src={myAvatar} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-mint text-cocoa flex items-center justify-center text-xs">
                {myName[0]}
              </span>
            )}
            <span className="text-ink">{myName}</span>
            <span className="text-xs text-cocoa/50">{myProgress}/{questions.length}</span>
          </div>
          <span className="font-mono font-bold text-shiba flex items-center">
            <Timer size={14} className="mr-1" /> {elapsed}s
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-cocoa/50">{oppProgress}/{questions.length}</span>
            {opp?.avatar ? (
              <img src={opp.avatar} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-cream text-cocoa/40 flex items-center justify-center text-xs">
                ?
              </span>
            )}
            <span className="text-ink">{opp?.name ?? '对手'}</span>
          </div>
        </div>

        <div className="h-2 rounded-full bg-grid/40 overflow-hidden mb-6">
          <div className="h-full bg-shiba transition-all" style={{ width: `${progress}%` }} />
        </div>

        {submitted ? (
          <div className="text-center py-16">
            <p className="text-2xl text-ink">已交卷，等待对手…</p>
            <p className="mt-2 text-sm text-cocoa/60">
              对手进度 {oppProgress}/{questions.length}
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-xl md:text-2xl text-ink leading-relaxed mb-7 min-h-[4.5rem]">
              {q.stem}
            </h2>
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => choose(index, i)}
                  className="w-full text-left rounded-2xl border-2 border-cocoa/15 bg-paper px-5 py-3.5 text-cocoa hover:border-shiba hover:bg-shiba/5 transition-colors"
                >
                  <span className="inline-flex w-7 h-7 rounded-full bg-cream items-center justify-center text-sm font-bold mr-3">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ================= 结果 =================

  const resultDetail = myDetail?.detail;

  return (
    <div className="max-w-2xl mx-auto pb-12 pt-6">
      <div className="text-center mb-6">
        <p
          className={`text-5xl font-bold flex items-center justify-center gap-2 ${
            settle?.result === 'win'
              ? 'text-shiba'
              : settle?.result === 'draw'
                ? 'text-cocoa/70'
                : 'text-cocoa/50'
          }`}
        >
          {settle?.result === 'win' ? (
            <>
              <Crown /> 你赢了
            </>
          ) : settle?.result === 'draw' ? (
            '平局'
          ) : (
            '惜败'
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { name: myName, avatar: myAvatar, s: settle?.mine, me: true },
          { name: opponentRef.current?.name ?? '对手', avatar: opponentRef.current?.avatar ?? '', s: settle?.opponent, me: false },
        ].map((p, i) => (
          <div
            key={i}
            className={`rounded-2xl border-2 p-5 text-center ${
              p.me ? 'border-shiba/40 bg-paper' : 'border-dashed border-grid bg-paper'
            }`}
          >
            {p.avatar ? (
              <img src={p.avatar} className="w-14 h-14 rounded-full object-cover mx-auto" />
            ) : (
              <span className="w-14 h-14 rounded-full bg-mint text-cocoa flex items-center justify-center mx-auto">
                {p.name[0]}
              </span>
            )}
            <p className="mt-2 text-ink text-sm">{p.name}</p>
            <p className="text-3xl font-bold text-shiba mt-1">{p.s?.score ?? '-'}</p>
            <p className="text-xs text-cocoa/50 mt-1">
              {p.s?.durationSec != null ? `用时 ${p.s.durationSec}s` : ''}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-3 mb-8">
        {resultDetail?.map((d, i) => {
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
        <Button variant="outline" onClick={leaveToLobby} className="rounded-full gap-1.5">
          <LogOut size={15} /> 返回大厅
        </Button>
        <Button onClick={onExit} className="rounded-full">
          返回疝鸡杯
        </Button>
      </div>
    </div>
  );
};

export default BattleView;
