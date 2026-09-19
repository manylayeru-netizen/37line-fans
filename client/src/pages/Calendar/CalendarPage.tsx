import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, User as UserIcon, ExternalLink } from 'lucide-react';
import type { CalendarEvent } from '@shared/api.interface';
import {
  getCalendarList,
  createCalendarEvent,
} from '@client/src/api/calendar';
import { useAuthStore } from '@client/src/store/auth.store';
import PageHeader from '@client/src/components/PageHeader';
import LoadingSpinner from '@client/src/components/LoadingSpinner';
import ErrorState from '@client/src/components/ErrorState';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Checkbox } from '@client/src/components/ui/checkbox';
import { Label } from '@client/src/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Image } from '@client/src/components/ui/image';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const MONTH_NAMES: string[] = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

interface UploaderBadgeProps {
  name?: string;
  avatarUrl?: string;
}

const UploaderBadge: React.FC<UploaderBadgeProps> = ({ name, avatarUrl }) => {
  if (!name) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-cocoa/60">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          className="w-4 h-4 rounded-full object-cover"
        />
      ) : (
        <UserIcon className="w-4 h-4 text-cocoa/50" />
      )}
      <span className="truncate max-w-[100px]">{name}</span>
    </div>
  );
};

const getSourcePlatformLabel = (url: string): string => {
  const hostname = url.toLowerCase();
  if (hostname.includes('weibo.com') || hostname.includes('m.weibo.cn') || hostname.includes('weibo.cn')) {
    return '微博原文 ↗';
  }
  if (hostname.includes('lofter.com')) {
    return 'Lofter 原文 ↗';
  }
  if (hostname.includes('ao3.org')) {
    return 'AO3 原文 ↗';
  }
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return 'X 原文 ↗';
  }
  return '查看原文 ↗';
};

interface MonthGridProps {
  year: number;
  month: number;
  events: CalendarEvent[];
}

const MonthGrid: React.FC<MonthGridProps> = ({ year, month, events }) => {
  const daysInMonth: number = getDaysInMonth(year, month);
  const firstDay: number = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    events.forEach((ev: CalendarEvent) => {
      const d = new Date(ev.eventDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day: number = d.getDate();
        map.set(day, [...(map.get(day) || []), ev]);
      }
    });
    return map;
  }, [events, year, month]);

  return (
    <div className="bg-paper rounded-xl shadow-md p-4 relative card-wobble">
      <div className="absolute -top-2 -left-2 w-14 h-4 bg-tape-pink/70 -rotate-12 rounded-sm" />
      <h3 className="font-handwriting text-2xl text-ink text-center mb-3">{MONTH_NAMES[month]}</h3>
      <div className="grid grid-cols-7 gap-1 text-xs text-center">
        {['日', '一', '二', '三', '四', '五', '六'].map((w: string) => (
          <div key={w} className="py-1 font-handwriting text-cocoa/60">{w}</div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const dayEvents: CalendarEvent[] = eventsByDay.get(day) || [];
          const hasCrown: boolean = dayEvents.some((e: CalendarEvent) => e.hasCrown);
          return (
            <div
              key={day}
              className="relative aspect-square flex items-center justify-center text-cocoa/80 text-sm rounded-md group hover:bg-shiba/10 transition"
              title={dayEvents.map((e: CalendarEvent) => e.title).join('、')}
            >
              {day}
              {hasCrown && (
                <span className="absolute -top-0.5 -right-0.5 text-xs">👑</span>
              )}
              {!hasCrown && dayEvents.length > 0 && (
                <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-shiba" />
              )}
              {dayEvents.length > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-ink/90 text-paper text-xs rounded-md px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-normal text-left">
                  {dayEvents.map((e: CalendarEvent) => (
                     <div key={e.id} className="py-0.5 space-y-0.5">
                       <div className="flex items-center gap-1">
                         <span>{e.hasCrown && '👑 '}{e.title}</span>
                         {e.sourceUrl && (
                           <UniversalLink
                             to={e.sourceUrl}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-shiba/70 hover:text-shiba pointer-events-auto"
                             onClick={(ev) => ev.stopPropagation()}
                           >
                             <ExternalLink size={12} />
                           </UniversalLink>
                         )}
                       </div>
                      {e.uploaderName && (
                        <div className="flex items-center gap-1 opacity-70">
                          {e.uploaderAvatarUrl ? (
                            <Image
                              src={e.uploaderAvatarUrl}
                              alt={e.uploaderName}
                              className="w-3 h-3 rounded-full"
                            />
                          ) : (
                            <UserIcon className="w-3 h-3" />
                          )}
                          <span className="text-[10px]">{e.uploaderName}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddEventDialog: React.FC<AddEventDialogProps> = ({ open, onOpenChange, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [hasCrown, setHasCrown] = useState(false);
  const [eventType, setEventType] = useState('fan_event');
  const [sourceUrl, setSourceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = (): void => {
    setTitle('');
    setEventDate('');
    setDescription('');
    setHasCrown(false);
    setEventType('fan_event');
    setSourceUrl('');
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!title.trim() || !eventDate) {
      toast.error('请填写标题和日期');
      return;
    }
    setSubmitting(true);
    try {
      await createCalendarEvent({
        title: title.trim(),
        eventDate,
        description: description.trim() || undefined,
        hasCrown,
        eventType: eventType.trim() || 'fan_event',
        sourceUrl: sourceUrl.trim() || undefined,
      });
      toast.success('事件添加成功！🎉');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error((err as Error).message || '添加失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-paper border-cocoa/20 rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-handwriting text-2xl text-ink text-center">
            ✨ 添加考古事件 ✨
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-title" className="text-cocoa font-handwriting text-lg">
              事件标题 <span className="text-shiba">*</span>
            </Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="例如：Mina 生日"
              className="bg-cream/50 border-cocoa/20 rounded-xl text-cocoa placeholder:text-cocoa/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-date" className="text-cocoa font-handwriting text-lg">
              日期 <span className="text-shiba">*</span>
            </Label>
            <Input
              id="event-date"
              type="date"
              value={eventDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEventDate(e.target.value)}
              className="bg-cream/50 border-cocoa/20 rounded-xl text-cocoa"
            />
          </div>
           <div className="space-y-1.5">
             <Label htmlFor="event-desc" className="text-cocoa font-handwriting text-lg">
               事件描述
             </Label>
             <Textarea
               id="event-desc"
               value={description}
               onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
               placeholder="简单描述一下这个事件吧~"
               className="bg-cream/50 border-cocoa/20 rounded-xl text-cocoa placeholder:text-cocoa/40 min-h-[80px]"
             />
           </div>
           <div className="space-y-1.5">
             <Label htmlFor="event-source-url" className="text-cocoa font-handwriting text-lg">
               原文链接
             </Label>
             <Input
               id="event-source-url"
               type="url"
               value={sourceUrl}
               onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSourceUrl(e.target.value)}
               placeholder="https://..."
               className="bg-cream/50 border-cocoa/20 rounded-xl text-cocoa placeholder:text-cocoa/40"
             />
             <p className="text-xs text-cocoa/50">
               可填写该事件对应的微博原文地址
             </p>
           </div>
           <div className="space-y-1.5">
             <Label htmlFor="event-type" className="text-cocoa font-handwriting text-lg">
               事件类型
             </Label>
            <Input
              id="event-type"
              value={eventType}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEventType(e.target.value)}
              placeholder="fan_event"
              className="bg-cream/50 border-cocoa/20 rounded-xl text-cocoa placeholder:text-cocoa/40"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="has-crown"
              checked={hasCrown}
              onCheckedChange={(checked: boolean | 'indeterminate') => setHasCrown(checked === true)}
              className="border-cocoa/30 data-[state=checked]:bg-shiba data-[state=checked]:border-shiba"
            />
            <Label htmlFor="has-crown" className="text-cocoa cursor-pointer">
              重要日期 👑 贴上皇冠
            </Label>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full border-cocoa/20 text-cocoa hover:bg-cocoa/5"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-shiba text-white hover:bg-shiba/90"
            >
              {submitting ? '提交中...' : '添加事件'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const CalendarPage: React.FC = () => {
  const currentYear: number = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const fetchEvents = (): void => {
    setLoading(true);
    setError(null);
    getCalendarList(year)
      .then((res: CalendarEvent[]) => {
        setEvents(res);
      })
      .catch((err: Error) => {
        setError(err.message || '加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCalendarList(year)
      .then((res: CalendarEvent[]) => {
        if (!cancelled) setEvents(res);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a: CalendarEvent, b: CalendarEvent) =>
        new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
    );
  }, [events]);

  const handleRefresh = (): void => {
    fetchEvents();
  };

  return (
     <div className="min-h-screen bg-cream py-8 md:py-12 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        <PageHeader title="双人日历" subtitle="标记每一个重要的日子 📅" icon="📅" />

        {/* 添加上传入口 */}
        <div className="mb-10">
          {isAuthenticated ? (
            <div className="flex justify-center">
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-shiba text-white hover:bg-shiba/90 rounded-full px-6 py-2 font-handwriting text-lg shadow-md hover-elevate active-elevate-2"
              >
                <Plus className="w-5 h-5" />
                添加考古事件
              </Button>
            </div>
          ) : (
            <div className="bg-paper rounded-xl shadow-sm p-5 flex flex-col sm:flex-row items-center justify-center gap-4 border border-cocoa/10">
              <p className="text-cocoa/70 font-handwriting text-lg text-center">
                登录后可以为日历添加重要事件~ ✨
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="bg-shiba text-white hover:bg-shiba/90 rounded-full px-6 font-handwriting"
              >
                去登录
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 mb-10">
          <button
            onClick={() => setYear((y: number) => y - 1)}
            className="w-10 h-10 rounded-full bg-paper shadow border-2 border-cocoa/10 font-handwriting text-xl text-cocoa hover:border-shiba transition"
          >
            ←
          </button>
          <span className="font-handwriting text-3xl text-ink min-w-[120px] text-center">
            {year}年
          </span>
          <button
            onClick={() => setYear((y: number) => y + 1)}
            className="w-10 h-10 rounded-full bg-paper shadow border-2 border-cocoa/10 font-handwriting text-xl text-cocoa hover:border-shiba transition"
          >
            →
          </button>
        </div>

        {loading && <LoadingSpinner text="正在翻找日历..." />}
        {error && <ErrorState message={error} />}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 12 }, (_, m: number) => (
                <MonthGrid key={m} year={year} month={m} events={events} />
              ))}
            </div>

            <section className="mt-16">
              <h2 className="font-handwriting text-3xl text-ink mb-6 text-center">
                ✨ 重要日期一览 ✨
              </h2>
              {sortedEvents.length === 0 ? (
                <p className="text-center text-cocoa/60 font-handwriting text-xl">
                  今年还没有标记重要日期呢～
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {sortedEvents.map((ev: CalendarEvent) => {
                    const d = new Date(ev.eventDate);
                    return (
                      <div
                        key={ev.id}
                        className="bg-paper rounded-xl shadow-sm p-5 flex items-start gap-4 card-wobble relative overflow-hidden"
                      >
                        <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-shiba/10 flex flex-col items-center justify-center">
                          <span className="font-handwriting text-xs text-cocoa/70">
                            {d.getMonth() + 1}月
                          </span>
                          <span className="font-handwriting text-2xl text-shiba leading-none">
                            {d.getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-handwriting text-xl text-ink flex items-center gap-2">
                             {ev.hasCrown && <span>👑</span>}
                             {ev.title}
                             {ev.sourceUrl && (
                               <UniversalLink
                                 to={ev.sourceUrl}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="text-shiba/70 hover:text-shiba"
                               >
                                 <ExternalLink size={14} />
                               </UniversalLink>
                             )}
                           </h3>
                           {ev.description && (
                             <p className="text-sm text-cocoa/70 mt-1">{ev.description}</p>
                           )}
                           {ev.sourceUrl && (
                             <UniversalLink
                               to={ev.sourceUrl}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="inline-block mt-2 px-3 py-1 bg-cream border border-shiba/40 text-shiba font-handwriting text-sm rounded-full hover:bg-shiba hover:text-white transition-colors shadow-sm"
                             >
                               {getSourcePlatformLabel(ev.sourceUrl)}
                             </UniversalLink>
                           )}
                           <div className="mt-2">
                             <UploaderBadge
                               name={ev.uploaderName}
                               avatarUrl={ev.uploaderAvatarUrl}
                             />
                           </div>
                        </div>
                        {ev.hasCrown && (
                          <div className="absolute -top-1 -right-1 text-2xl rotate-12">👑</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        <AddEventDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleRefresh}
        />
      </div>
    </div>
  );
};

export default CalendarPage;
