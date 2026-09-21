import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Switch } from '@client/src/components/ui/switch';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { calendarApi } from '@client/src/api';
import type { CalendarEvent } from '@shared/api.interface';

interface CalendarManageProps {
  // no props needed
}

const EVENT_TYPES = [
  { value: 'birthday', label: '🎂 生日', color: 'bg-tape-pink text-ink' },
  { value: 'anniversary', label: '💝 纪念日', color: 'bg-mint text-ink' },
  { value: 'other', label: '📌 其他', color: 'bg-tape-blue text-ink' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: '全部', color: '' },
  { value: 'pending', label: '待审核', color: 'bg-shiba/20 text-shiba' },
  { value: 'published', label: '已发布', color: 'bg-mint/40 text-ink' },
  { value: 'rejected', label: '已拒绝', color: 'bg-grid text-cocoa/60' },
];

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'bg-shiba/20 text-shiba' },
  published: { label: '已发布', color: 'bg-mint/40 text-ink' },
  rejected: { label: '已拒绝', color: 'bg-grid text-cocoa/60' },
};

const DEFAULT_PAGE_SIZE = 20;
const MIN_YEAR = 2000;

const CalendarManage: React.FC<CalendarManageProps> = () => {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 1;

  const [items, setItems] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [yearFilter, setYearFilter] = useState<number>(currentYear);
  const [yearInput, setYearInput] = useState<string>(String(currentYear));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState<number>(0);

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({
    title: '',
    eventDate: '',
    description: '',
    eventType: 'other',
    hasCrown: false,
    sourceUrl: '',
    status: 'pending' as 'published' | 'pending' | 'rejected',
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        year?: number;
        page?: number;
        pageSize?: number;
        status?: string;
      } = {
        year: yearFilter,
        page,
        pageSize,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const data = await calendarApi.getAdminCalendarList(params);
      setItems(data.items);
      setTotal(data.total);
    } catch {
      toast.error('加载日历列表失败');
    } finally {
      setLoading(false);
    }
  }, [yearFilter, statusFilter, page, pageSize]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const goPrevYear = () => {
    if (yearFilter > MIN_YEAR) {
      const next = yearFilter - 1;
      setYearFilter(next);
      setYearInput(String(next));
      setPage(1);
    }
  };

  const goNextYear = () => {
    if (yearFilter < maxYear) {
      const next = yearFilter + 1;
      setYearFilter(next);
      setYearInput(String(next));
      setPage(1);
    }
  };

  const handleYearJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const val = Number(yearInput);
    if (Number.isNaN(val) || val < MIN_YEAR || val > maxYear) {
      toast.error(`请输入 ${MIN_YEAR} - ${maxYear} 之间的年份`);
      setYearInput(String(yearFilter));
      return;
    }
    setYearFilter(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const openCreate = () => {
    setEditingEvent(null);
    setForm({
      title: '',
      eventDate: '',
      description: '',
      eventType: 'other',
      hasCrown: false,
      sourceUrl: '',
      status: 'pending',
    });
    setDialogOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      eventDate: event.eventDate,
      description: event.description || '',
      eventType: event.eventType,
      hasCrown: event.hasCrown,
      sourceUrl: event.sourceUrl || '',
      status: event.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('请填写标题');
      return;
    }
    if (!form.eventDate) {
      toast.error('请选择日期');
      return;
    }
    try {
      if (editingEvent) {
        await calendarApi.updateCalendarEvent(editingEvent.id, form);
        toast.success('日期已更新 ✨');
      } else {
        await calendarApi.createCalendarEvent(form);
        toast.success('日期已创建 🎉');
      }
      setDialogOpen(false);
      fetchList();
    } catch {
      toast.error('保存失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await calendarApi.deleteCalendarEvent(deleteId);
      toast.success('已删除');
      setDeleteId(null);
      fetchList();
    } catch {
      toast.error('删除失败');
    }
  };

  const handleReview = async (
    id: string,
    status: 'published' | 'rejected',
  ) => {
    try {
      await calendarApi.reviewCalendarEvent(id, status);
      toast.success(status === 'published' ? '已通过审核 ✅' : '已拒绝 ❌');
      fetchList();
    } catch {
      toast.error('操作失败');
    }
  };

  const getTypeBadge = (type: string) => {
    const opt = EVENT_TYPES.find((o) => o.value === type);
    return (
      <Badge
        className={`${opt?.color || ''} rounded-full border-0`}
        style={{ fontFamily: 'var(--font-handwriting)' }}
      >
        {opt?.label || type}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_BADGE[status];
    return (
      <Badge
        className={`${opt?.color || ''} rounded-full border-0`}
        style={{ fontFamily: 'var(--font-handwriting)' }}
      >
        {opt?.label || status}
      </Badge>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2
          className="text-3xl text-ink"
          style={{ fontFamily: 'var(--font-handwriting)' }}
        >
          📅 日历管理
        </h2>
        <Button
          onClick={openCreate}
          className="bg-shiba text-white rounded-full px-6 h-10 shadow-md hover:shadow-lg transition-shadow"
        >
          <Plus size={18} />
          新增日期
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-paper rounded-2xl p-5 shadow-sm border-2 border-dashed border-grid mb-6 relative">
        <div
          className="absolute -top-3 left-6 w-16 h-5 bg-tape-pink opacity-70 rounded-sm"
          style={{ transform: 'rotate(-3deg)' }}
        />
        <div className="flex items-center gap-6 flex-wrap">
          {/* Year navigator */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-cocoa/70 font-medium">年份：</span>
            <button
              onClick={goPrevYear}
              disabled={yearFilter <= MIN_YEAR}
              className="w-8 h-8 rounded-full bg-cream border border-grid flex items-center justify-center text-cocoa hover:bg-tape-pink/30 hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="上一年"
            >
              <ChevronLeft size={16} />
            </button>
            <Input
              type="text"
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              onKeyDown={handleYearJump}
              onBlur={() => setYearInput(String(yearFilter))}
              className="w-24 text-center bg-cream font-handwriting text-lg text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            />
            <span className="text-sm text-cocoa/70 font-medium">年</span>
            <button
              onClick={goNextYear}
              disabled={yearFilter >= maxYear}
              className="w-8 h-8 rounded-full bg-cream border border-grid flex items-center justify-center text-cocoa hover:bg-tape-blue/30 hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="下一年"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-cocoa/70 font-medium">状态：</span>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32 bg-cream">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-sm text-cocoa/50 ml-auto">共 {total} 条记录</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-paper rounded-2xl shadow-sm border-2 border-dashed border-grid overflow-hidden relative">
        <div
          className="absolute -top-3 right-6 w-16 h-5 bg-tape-blue opacity-70 rounded-sm"
          style={{ transform: 'rotate(3deg)' }}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream border-b-2 border-dashed border-grid">
                <th className="text-left px-4 py-3 font-medium text-ink w-32">
                  日期
                </th>
                <th className="text-left px-4 py-3 font-medium text-ink">
                  标题
                </th>
                <th className="text-left px-4 py-3 font-medium text-ink w-28">
                  类型
                </th>
                <th className="text-center px-4 py-3 font-medium text-ink w-24">
                  状态
                </th>
                <th className="text-center px-4 py-3 font-medium text-ink w-20">
                  皇冠
                </th>
                <th className="text-right px-4 py-3 font-medium text-ink w-56">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-cocoa/50"
                  >
                    加载中...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-cocoa/50"
                  >
                    还没有日历记录~
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-dashed border-grid/50 hover:bg-cream/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-cocoa font-handwriting">
                      {event.eventDate}
                    </td>
                    <td className="px-4 py-3 text-ink font-medium">
                      {event.title}
                    </td>
                    <td className="px-4 py-3">{getTypeBadge(event.eventType)}</td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(event.status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {event.hasCrown ? (
                        <Crown
                          size={20}
                          className="text-shiba inline-block"
                          fill="currentColor"
                        />
                      ) : (
                        <span className="text-cocoa/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {event.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleReview(event.id, 'published')}
                              className="p-2 rounded-full hover:bg-mint/30 text-mint-ink transition-colors"
                              title="通过"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleReview(event.id, 'rejected')}
                              className="p-2 rounded-full hover:bg-destructive/20 text-destructive transition-colors"
                              title="拒绝"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openEdit(event)}
                          className="p-2 rounded-full hover:bg-penguin/20 text-penguin transition-colors"
                          title="编辑"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteId(event.id)}
                          className="p-2 rounded-full hover:bg-destructive/20 text-destructive transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dashed border-grid bg-cream/30">
            <span className="text-sm text-cocoa/60">
              第 {page} / {totalPages} 页 · 每页 {pageSize} 条
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-full h-8"
              >
                <ChevronLeft size={14} />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-full h-8"
              >
                下一页
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-paper border-2 border-dashed border-grid max-w-lg">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              {editingEvent ? '✏️ 编辑日期' : '📌 新增日期'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-cocoa mb-1.5">
                标题 <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="例如：Mina 生日"
                className="bg-cream/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cocoa mb-1.5">
                日期 <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={form.eventDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, eventDate: e.target.value }))
                }
                className="bg-cream/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cocoa mb-1.5">
                类型
              </label>
              <Select
                value={form.eventType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, eventType: v }))
                }
              >
                <SelectTrigger className="w-full bg-cream/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editingEvent && (
              <div>
                <label className="block text-sm font-medium text-cocoa mb-1.5">
                  状态
                </label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as 'published' | 'pending' | 'rejected',
                    }))
                  }
                >
                  <SelectTrigger className="w-full bg-cream/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待审核</SelectItem>
                    <SelectItem value="published">已发布</SelectItem>
                    <SelectItem value="rejected">已拒绝</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-cocoa mb-1.5">
                描述
              </label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="补充说明..."
                rows={3}
                className="bg-cream/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cocoa mb-1.5">
                原文链接
              </label>
              <Input
                type="url"
                value={form.sourceUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sourceUrl: e.target.value }))
                }
                placeholder="https://..."
                className="bg-cream/50"
              />
              <p className="text-xs text-cocoa/50 mt-1">
                可填写该事件对应的微博原文地址
              </p>
            </div>

            <div className="flex items-center justify-between bg-cream/50 rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-cocoa">皇冠标记 👑</p>
                <p className="text-xs text-cocoa/60">
                  重要日期会显示皇冠贴纸
                </p>
              </div>
              <Switch
                checked={form.hasCrown}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, hasCrown: v }))
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              className="bg-shiba text-white rounded-full"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="bg-paper border-2 border-dashed border-grid max-w-sm">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              🗑️ 确认删除
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-cocoa/80">
            确定要删除这个日历日期吗？此操作不可撤销哦~
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="rounded-full"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarManage;
