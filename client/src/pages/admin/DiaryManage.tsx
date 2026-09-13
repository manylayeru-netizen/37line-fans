import { useEffect, useState } from 'react';
import { Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Label } from '@client/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Textarea } from '@client/src/components/ui/textarea';
import StickerPagination from '@client/src/components/StickerPagination';
import { diaryApi } from '@client/src/api';
import type { DiaryEntry } from '@shared/api.interface';

const STATUS_TABS = [
  { value: 'pending', label: '待审核' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' },
  { value: 'offline', label: '已下线' },
  { value: '', label: '全部' },
] as const;

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: '待审核', className: 'bg-warning text-warning-foreground' },
  published: { label: '已发布', className: 'bg-success text-success-foreground' },
  draft: { label: '草稿', className: 'bg-secondary text-secondary-foreground' },
  offline: { label: '已下线', className: 'bg-destructive text-destructive-foreground' },
};

const COMPLETION_LABELS: Record<string, string> = {
  completed: '已完结',
  ongoing: '未完结',
};

const CONTENT_WARNING_OPTIONS = ['M', '主要人物死亡', '血腥暴力'];

const DiaryManagePage: React.FC = () => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [status, setStatus] = useState<string>('pending');
  const [keyword, setKeyword] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    content: string;
    weather: string;
    entryDate: string;
    author: string;
    sourcePlatform: string;
    completionStatus: 'completed' | 'ongoing';
    contentWarnings: string[];
    characterBackground: string;
    recommendationReason: string;
    status: DiaryEntry['status'];
    sortOrder: number;
  }>({
    title: '',
    content: '',
    weather: 'sunny',
    entryDate: '',
    author: '',
    sourcePlatform: '',
    completionStatus: 'completed',
    contentWarnings: [],
    characterBackground: '',
    recommendationReason: '',
    status: 'published',
    sortOrder: 0,
  });

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await diaryApi.getDiaryList({
        page,
        pageSize,
        status: status || undefined,
      });
      let items = data.items;
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        items = items.filter(
          (e: DiaryEntry) =>
            e.title.toLowerCase().includes(kw) ||
            e.author?.toLowerCase().includes(kw),
        );
      }
      setEntries(items);
      setTotal(data.total);
    } catch {
      toast.error('加载推文列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [page, status, keyword]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPage(1);
  };

  const openEdit = (entry: DiaryEntry) => {
    setSelectedEntry(entry);
    setEditForm({
      title: entry.title,
      content: entry.content,
      weather: entry.weather,
      entryDate: entry.entryDate,
      author: entry.author || '',
      sourcePlatform: entry.sourcePlatform || '',
      completionStatus: entry.completionStatus || 'completed',
      contentWarnings: entry.contentWarnings || [],
      characterBackground: entry.characterBackground || '',
      recommendationReason: entry.recommendationReason || '',
      status: entry.status,
      sortOrder: entry.sortOrder,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!selectedEntry) return;
    if (!editForm.title.trim() || !editForm.content.trim()) {
      toast.error('标题和内容不能为空');
      return;
    }
    try {
      await diaryApi.updateDiary(selectedEntry.id, editForm);
      toast.success('保存成功 ✨');
      setEditOpen(false);
      loadEntries();
    } catch {
      toast.error('保存失败，请重试');
    }
  };

  const handleStatusToggle = async (entry: DiaryEntry, newStatus: 'published' | 'offline') => {
    try {
      await diaryApi.updateDiaryStatus(entry.id, newStatus);
      toast.success('状态已更新');
      loadEntries();
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    const id = deleteConfirm;
    setDeleteConfirm(null);
    if (!id) return;
    try {
      await diaryApi.deleteDiary(id);
      toast.success('已删除');
      loadEntries();
    } catch {
      toast.error('删除失败，请重试');
    }
  };

  const toggleWarning = (value: string) => {
    setEditForm((prev) => ({
      ...prev,
      contentWarnings: prev.contentWarnings.includes(value)
        ? prev.contentWarnings.filter((w) => w !== value)
        : [...prev.contentWarnings, value],
    }));
  };

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h2
          className="text-3xl text-ink mb-1"
          style={{ fontFamily: 'var(--font-handwriting)' }}
        >
          每日推文管理
        </h2>
        <p className="text-sm text-cocoa/60">审核和管理每日推文投稿</p>
      </div>

      <div className="bg-paper rounded-2xl p-5 shadow-md border-2 border-dashed border-grid mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleStatusChange(tab.value)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  status === tab.value
                    ? 'bg-shiba text-paper'
                    : 'bg-cream/50 text-cocoa/70 hover:bg-cream'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="搜索标题/作者..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-60"
            />
            <Button type="submit" variant="default">
              <Search size={16} className="mr-1" />
              搜索
            </Button>
          </form>
        </div>
      </div>

      <div className="bg-paper rounded-2xl shadow-md border-2 border-dashed border-grid overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-dashed border-grid bg-cream/30">
              <th className="text-left py-3 px-4 text-sm text-cocoa/70 font-medium">标题</th>
              <th className="text-left py-3 px-4 text-sm text-cocoa/70 font-medium">作者</th>
              <th className="text-left py-3 px-4 text-sm text-cocoa/70 font-medium">日期</th>
              <th className="text-left py-3 px-4 text-sm text-cocoa/70 font-medium">状态</th>
              <th className="text-left py-3 px-4 text-sm text-cocoa/70 font-medium">完结</th>
              <th className="text-right py-3 px-4 text-sm text-cocoa/70 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-cocoa/50">
                  加载中...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-cocoa/50">
                  暂无数据
                </td>
              </tr>
            ) : (
              entries.map((entry: DiaryEntry) => (
                <tr
                  key={entry.id}
                  className="border-b border-grid/30 hover:bg-cream/20"
                >
                  <td className="py-3 px-4">
                    <p className="text-ink font-medium truncate max-w-xs">
                      {entry.title}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-cocoa text-sm">
                    {entry.author || '—'}
                  </td>
                  <td className="py-3 px-4 text-cocoa text-sm">
                    {entry.entryDate}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={
                        STATUS_LABELS[entry.status]?.className ?? ''
                      }
                    >
                      {STATUS_LABELS[entry.status]?.label ?? entry.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-cocoa text-sm">
                    {COMPLETION_LABELS[entry.completionStatus] || '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(entry)}
                      >
                        <Edit size={14} className="mr-1" />
                        编辑
                      </Button>
                      {entry.status === 'pending' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleStatusToggle(entry, 'published')}
                        >
                          通过
                        </Button>
                      )}
                      {entry.status === 'published' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleStatusToggle(entry, 'offline')}
                        >
                          下线
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <StickerPagination
          page={page}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-paper border-2 border-dashed border-grid rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-2xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              编辑推文
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-cocoa/60 text-xs">日期</Label>
                <Input
                  type="date"
                  value={editForm.entryDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, entryDate: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-cocoa/60 text-xs">天气</Label>
                <Select
                  value={editForm.weather}
                  onValueChange={(v) => setEditForm({ ...editForm, weather: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunny">☀️ 晴天</SelectItem>
                    <SelectItem value="cloudy">☁️ 多云</SelectItem>
                    <SelectItem value="rainy">🌧️ 雨天</SelectItem>
                    <SelectItem value="snowy">❄️ 雪天</SelectItem>
                    <SelectItem value="night">🌙 夜晚</SelectItem>
                    <SelectItem value="windy">🍃 微风</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-cocoa/60 text-xs">标题</Label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-cocoa/60 text-xs">作者</Label>
                <Input
                  value={editForm.author}
                  onChange={(e) =>
                    setEditForm({ ...editForm, author: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-cocoa/60 text-xs">平台</Label>
                <Input
                  value={editForm.sourcePlatform}
                  onChange={(e) =>
                    setEditForm({ ...editForm, sourcePlatform: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-cocoa/60 text-xs">状态</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) =>
                    setEditForm({
                      ...editForm,
                      status: v as DiaryEntry['status'],
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">已发布</SelectItem>
                    <SelectItem value="pending">待审核</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="offline">已下线</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-cocoa/60 text-xs">完结状态</Label>
                <Select
                  value={editForm.completionStatus}
                  onValueChange={(v) =>
                    setEditForm({
                      ...editForm,
                      completionStatus: v as 'completed' | 'ongoing',
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">已完结</SelectItem>
                    <SelectItem value="ongoing">未完结</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-cocoa/60 text-xs">内容警告</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CONTENT_WARNING_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleWarning(opt)}
                    className={`px-3 py-1 rounded-full text-xs transition-all ${
                      editForm.contentWarnings.includes(opt)
                        ? 'bg-shiba text-paper'
                        : 'bg-cream/50 text-cocoa/70 border border-cocoa/10'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-cocoa/60 text-xs">人设背景</Label>
              <Textarea
                value={editForm.characterBackground}
                onChange={(e) =>
                  setEditForm({ ...editForm, characterBackground: e.target.value })
                }
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-cocoa/60 text-xs">推荐理由</Label>
              <Textarea
                value={editForm.recommendationReason}
                onChange={(e) =>
                  setEditForm({ ...editForm, recommendationReason: e.target.value })
                }
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-cocoa/60 text-xs">正文</Label>
              <Textarea
                value={editForm.content}
                onChange={(e) =>
                  setEditForm({ ...editForm, content: e.target.value })
                }
                rows={8}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-cocoa/60 text-xs">排序</Label>
              <Input
                type="number"
                value={editForm.sortOrder}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    sortOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="mt-1 w-32"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button variant="default" onClick={handleSave}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md bg-paper border-2 border-dashed border-grid rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              确认删除
            </DialogTitle>
          </DialogHeader>
          <p className="text-cocoa/80">确定要删除这篇推文吗？此操作不可撤销。</p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
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

export default DiaryManagePage;
