import { useEffect, useMemo, useState } from 'react';
import { Search, Edit, Trash2, Check, X } from 'lucide-react';
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
import { adminApi, diaryApi, literatureApi } from '@client/src/api';
import type {
  AdminStats,
  DiaryEntry,
  LiteraturePost,
} from '@shared/api.interface';

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'published', label: '已发布' },
  { value: 'rejected', label: '已驳回' },
] as const;

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: '待审核', className: 'bg-warning text-warning-foreground' },
  published: { label: '已发布', className: 'bg-success text-success-foreground' },
  rejected: { label: '已驳回', className: 'bg-destructive text-destructive-foreground' },
  draft: { label: '草稿', className: 'bg-secondary text-secondary-foreground' },
  offline: { label: '已下线', className: 'bg-muted text-muted-foreground' },
};

const TYPE_LABELS: Record<string, { label: string; className: string }> = {
  diary: { label: '每日推文', className: 'bg-shiba/20 text-shiba' },
  literature: { label: '推文投稿', className: 'bg-penguin/20 text-penguin' },
};

type TweetType = 'diary' | 'literature';

interface UnifiedTweetItem {
  id: string;
  type: TweetType;
  title: string;
  author: string;
  submitterName: string;
  status: string;
  date: string;
  sourcePlatform?: string;
  raw: DiaryEntry | LiteraturePost;
}

const TweetManagePage: React.FC = () => {
  const [items, setItems] = useState<UnifiedTweetItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;
  const [status, setStatus] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<Partial<AdminStats>>({});

  // Dialogs
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: TweetType } | null>(null);
  const [rejectOpen, setRejectOpen] = useState<boolean>(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; type: TweetType }>({ id: '', type: 'diary' });
  const [rejectReason, setRejectReason] = useState<string>('');

  // Edit (diary only)
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    content: string;
    entryDate: string;
    author: string;
    sourcePlatform: string;
    completionStatus: 'completed' | 'ongoing';
    contentWarnings: string[];
    characterBackground: string;
    recommendationReason: string;
    sourceUrl: string;
    status: DiaryEntry['status'];
    sortOrder: number;
  }>({
    title: '',
    content: '',
    entryDate: '',
    author: '',
    sourcePlatform: '',
    completionStatus: 'completed',
    contentWarnings: [],
    characterBackground: '',
    recommendationReason: '',
    sourceUrl: '',
    status: 'published',
    sortOrder: 0,
  });

  const CONTENT_WARNING_OPTIONS = ['M', '主要人物死亡', '血腥暴力'];

  const refreshStats = async () => {
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch {
      // silently ignore
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const queryParams = {
        page,
        pageSize,
        status: status || undefined,
        keyword: keyword || undefined,
      };

      const [diaryData, litData] = await Promise.all([
        diaryApi.getDiaryList(queryParams).catch(() => ({ items: [] as DiaryEntry[], total: 0, page, pageSize })),
        literatureApi.getAdminPosts(queryParams).catch(() => ({ items: [] as LiteraturePost[], total: 0, page, pageSize })),
      ]);

      const diaryItems: UnifiedTweetItem[] = (diaryData.items || []).map((entry: DiaryEntry) => ({
        id: entry.id,
        type: 'diary' as const,
        title: entry.title,
        author: entry.author || '—',
        submitterName: entry.submitterName || '—',
        status: entry.status,
        date: entry.entryDate,
        sourcePlatform: entry.sourcePlatform,
        raw: entry,
      }));

      const litItems: UnifiedTweetItem[] = (litData.items || []).map((post: LiteraturePost) => ({
        id: post.id,
        type: 'literature' as const,
        title: post.title,
        author: post.author,
        submitterName: post.authorDisplayName || '—',
        status: post.status,
        date: post.createdAt,
        sourcePlatform: post.sourcePlatform,
        raw: post,
      }));

      const merged = [...diaryItems, ...litItems].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });

      const combinedTotal = (diaryData.total || 0) + (litData.total || 0);

      setItems(merged);
      setTotal(combinedTotal);
    } catch {
      toast.error('加载推文列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    refreshStats();
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

  const handleApprove = async (id: string, type: TweetType) => {
    try {
      if (type === 'diary') {
        await diaryApi.reviewDiary(id, { status: 'published' });
      } else {
        await literatureApi.reviewPost(id, { status: 'published' });
      }
      toast.success('已通过审核 ✨');
      loadData();
      refreshStats();
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  const openRejectDialog = (id: string, type: TweetType) => {
    setRejectTarget({ id, type });
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('请填写驳回原因');
      return;
    }
    try {
      if (rejectTarget.type === 'diary') {
        await diaryApi.reviewDiary(rejectTarget.id, {
          status: 'rejected',
          rejectReason: rejectReason.trim(),
        });
      } else {
        await literatureApi.reviewPost(rejectTarget.id, {
          status: 'rejected',
          rejectReason: rejectReason.trim(),
        });
      }
      toast.success('已驳回');
      setRejectOpen(false);
      loadData();
      refreshStats();
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  const handleDelete = (id: string, type: TweetType) => {
    setDeleteConfirm({ id, type });
  };

  const confirmDelete = async () => {
    const target = deleteConfirm;
    setDeleteConfirm(null);
    if (!target) return;
    try {
      if (target.type === 'diary') {
        await diaryApi.deleteDiary(target.id);
      } else {
        await literatureApi.deletePostAdmin(target.id);
      }
      toast.success('已删除');
      loadData();
      refreshStats();
    } catch {
      toast.error('删除失败，请重试');
    }
  };

  // Diary edit functions
  const openEdit = (entry: DiaryEntry) => {
    setSelectedDiary(entry);
    setEditForm({
      title: entry.title,
      content: entry.content,
      entryDate: entry.entryDate,
      author: entry.author || '',
      sourcePlatform: entry.sourcePlatform || '',
      completionStatus: entry.completionStatus || 'completed',
      contentWarnings: entry.contentWarnings || [],
      characterBackground: entry.characterBackground || '',
      recommendationReason: entry.recommendationReason || '',
      sourceUrl: entry.sourceUrl || '',
      status: entry.status,
      sortOrder: entry.sortOrder,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!selectedDiary) return;
    if (!editForm.title.trim() || !editForm.content.trim()) {
      toast.error('标题和内容不能为空');
      return;
    }
    try {
      await diaryApi.updateDiary(selectedDiary.id, editForm);
      toast.success('保存成功 ✨');
      setEditOpen(false);
      loadData();
      refreshStats();
    } catch {
      toast.error('保存失败，请重试');
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

  const pendingTotal = useMemo(
    () => (stats.pendingDiaryCount ?? 0) + (stats.pendingLiteratureCount ?? 0),
    [stats],
  );

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h2
          className="text-3xl text-ink mb-1"
          style={{ fontFamily: 'var(--font-handwriting)' }}
        >
          推文管理
        </h2>
        <p className="text-sm text-cocoa/60">审核和管理所有投稿推文</p>
      </div>

      {/* Filters */}
      <div className="bg-paper rounded-2xl p-5 shadow-md border-2 border-dashed border-grid mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-cocoa/70">状态：</span>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-36 bg-cream/50 border-grid">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pendingTotal > 0 && (
              <Badge className="bg-shiba text-white ml-2">
                待审核 {pendingTotal}
              </Badge>
            )}
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa/40"
              />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜索标题/作者/投稿人..."
                className="w-64 pl-9 rounded-full bg-cream/50 border-grid focus:border-shiba"
              />
            </div>
            <Button type="submit" variant="default" className="rounded-full">
              搜索
            </Button>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="bg-paper rounded-2xl shadow-md border-2 border-dashed border-grid overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-shiba/10">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-ink">日期</th>
                <th className="px-4 py-3 text-left font-medium text-ink">标题</th>
                <th className="px-4 py-3 text-left font-medium text-ink">作者</th>
                <th className="px-4 py-3 text-left font-medium text-ink">类型</th>
                <th className="px-4 py-3 text-left font-medium text-ink">状态</th>
                <th className="px-4 py-3 text-right font-medium text-ink">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-cocoa/50">
                    加载中...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-cocoa/50">
                    暂无数据
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const statusInfo = STATUS_LABELS[item.status] ?? STATUS_LABELS.pending;
                  const typeInfo = TYPE_LABELS[item.type];
                  return (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className="border-t border-dashed border-grid hover:bg-cream/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-cocoa/80">
                        {item.date.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink line-clamp-1 max-w-xs">
                          {item.title}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-cocoa/80">{item.author}</td>
                      <td className="px-4 py-3">
                        <Badge className={typeInfo.className}>
                          {typeInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {item.type === 'diary' && (
                            <button
                              onClick={() => openEdit(item.raw as DiaryEntry)}
                              className="p-2 rounded-full text-penguin hover:bg-penguin/10 transition-colors"
                              title="编辑"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {item.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(item.id, item.type)}
                                className="p-2 rounded-full text-success hover:bg-success/10 transition-colors"
                                title="通过"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => openRejectDialog(item.id, item.type)}
                                className="p-2 rounded-full text-destructive hover:bg-destructive/10 transition-colors"
                                title="驳回"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(item.id, item.type)}
                            className="p-2 rounded-full text-destructive hover:bg-destructive/10 transition-colors"
                            title="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6">
        <StickerPagination
          page={page}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md bg-paper border-2 border-dashed border-grid rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              驳回审核
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-cocoa">请填写驳回原因</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请说明驳回的原因..."
              rows={4}
              className="w-full rounded-lg border border-grid bg-cream/30 p-3 text-sm text-cocoa focus:border-shiba focus:ring-2 focus:ring-shiba/20 outline-none resize-none"
            />
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              className="rounded-full"
            >
              确认驳回
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

      {/* Diary Edit Dialog */}
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
            <div className="grid grid-cols-1 gap-4">
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
            <div>
              <Label className="text-cocoa/60 text-xs">原文链接</Label>
              <Input
                type="url"
                value={editForm.sourceUrl}
                onChange={(e) =>
                  setEditForm({ ...editForm, sourceUrl: e.target.value })
                }
                placeholder="https://..."
                className="mt-1"
              />
              <p className="text-xs text-cocoa/50 mt-1">可填写微博/Lofter 等原文地址</p>
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
                    <SelectItem value="rejected">已驳回</SelectItem>
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
    </div>
  );
};

export default TweetManagePage;
