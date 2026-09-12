import { useEffect, useState } from 'react';
import { Search, Eye, Check, X, Trash2 } from 'lucide-react';
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
import StickerPagination from '@client/src/components/StickerPagination';
import { literatureApi } from '@client/src/api';
import type { LiteraturePost } from '@shared/api.interface';
import { showConfirm } from '@lark-apaas/client-toolkit';

const STATUS_TABS = [
  { value: 'pending', label: '待审核' },
  { value: 'published', label: '已发布' },
  { value: 'rejected', label: '已拒绝' },
  { value: '', label: '全部' },
] as const;

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: '待审核', className: 'bg-warning text-warning-foreground' },
  published: { label: '已发布', className: 'bg-success text-success-foreground' },
  rejected: { label: '已拒绝', className: 'bg-destructive text-destructive-foreground' },
};

interface LiteratureManageProps {
  // no props needed
}

const LiteratureManage: React.FC<LiteratureManageProps> = () => {
  const [posts, setPosts] = useState<LiteraturePost[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [status, setStatus] = useState<string>('pending');
  const [keyword, setKeyword] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<LiteraturePost | null>(null);
  const [rejectOpen, setRejectOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [actionTargetId, setActionTargetId] = useState<string>('');

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await literatureApi.getAdminPosts({
        page,
        pageSize,
        status: status || undefined,
        keyword: keyword || undefined,
      });
      setPosts(data.items);
      setTotal(data.total);
    } catch {
      toast.error('加载帖子列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
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

  const openDetail = (post: LiteraturePost) => {
    setSelectedPost(post);
    setDetailOpen(true);
  };

  const handleApprove = async (id: string) => {
    try {
      await literatureApi.reviewPost(id, { status: 'published' });
      toast.success('帖子已通过审核 ✨');
      setDetailOpen(false);
      loadPosts();
    } catch {
      toast.error('审核失败，请重试');
    }
  };

  const openRejectDialog = (id: string) => {
    setActionTargetId(id);
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('请填写拒绝原因');
      return;
    }
    try {
      await literatureApi.reviewPost(actionTargetId, {
        status: 'rejected',
        rejectReason: rejectReason.trim(),
      });
      toast.success('已拒绝该帖子');
      setRejectOpen(false);
      setDetailOpen(false);
      loadPosts();
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await showConfirm('确定要删除这篇帖子吗？此操作不可撤销。')) return;
    try {
      await literatureApi.deletePostAdmin(id);
      toast.success('帖子已删除');
      loadPosts();
    } catch {
      toast.error('删除失败，请重试');
    }
  };

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="mb-6">
        <h2
          className="text-3xl text-ink mb-1"
          style={{ fontFamily: 'var(--font-handwriting)' }}
        >
          推文管理
        </h2>
        <p className="text-sm text-cocoa/60">审核和管理推文投稿</p>
      </div>

      {/* Filters */}
      <div className="bg-paper rounded-2xl p-5 shadow-md border-2 border-dashed border-grid mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleStatusChange(tab.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  status === tab.value
                    ? 'bg-shiba text-white shadow-md'
                    : 'bg-shiba/10 text-cocoa hover:bg-shiba/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Search */}
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
          <table className="w-full text-sm">
            <thead className="bg-shiba/10 text-ink">
              <tr>
                <th className="px-4 py-3 text-left font-medium">标题</th>
                <th className="px-4 py-3 text-left font-medium">作者</th>
                <th className="px-4 py-3 text-left font-medium">投稿人</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-left font-medium">提交时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-cocoa/50">
                    加载中...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-cocoa/50">
                    暂无数据
                  </td>
                </tr>
              ) : (
                posts.map((post) => {
                  const statusInfo = STATUS_LABELS[post.status] ?? STATUS_LABELS.pending;
                  return (
                    <tr
                      key={post.id}
                      className="border-t border-dashed border-grid hover:bg-cream/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink line-clamp-1 max-w-xs">
                          {post.title}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-cocoa/80">{post.author}</td>
                      <td className="px-4 py-3 text-cocoa/80">
                        {post.authorDisplayName || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-cocoa/70">
                        {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openDetail(post)}
                            className="p-2 rounded-full text-penguin hover:bg-penguin/10 transition-colors"
                            title="查看详情"
                          >
                            <Eye size={16} />
                          </button>
                          {post.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(post.id)}
                                className="p-2 rounded-full text-success hover:bg-success/10 transition-colors"
                                title="通过"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setActionTargetId(post.id);
                                  setRejectReason('');
                                  setRejectOpen(true);
                                }}
                                className="p-2 rounded-full text-destructive hover:bg-destructive/10 transition-colors"
                                title="拒绝"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(post.id)}
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
      <StickerPagination
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-paper border-2 border-dashed border-grid rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-2xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              帖子详情
            </DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <div>
                <Label className="text-cocoa/60 text-xs">标题</Label>
                <p className="text-xl font-medium text-ink mt-1">
                  {selectedPost.title}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-cocoa/60 text-xs">作者</Label>
                  <p className="text-cocoa mt-1">{selectedPost.author}</p>
                </div>
                <div>
                  <Label className="text-cocoa/60 text-xs">来源平台</Label>
                  <p className="text-cocoa mt-1">
                    {selectedPost.sourcePlatform || '—'}
                  </p>
                </div>
                <div>
                  <Label className="text-cocoa/60 text-xs">投稿人</Label>
                  <p className="text-cocoa mt-1">
                    {selectedPost.authorDisplayName || '—'}
                  </p>
                </div>
                <div>
                  <Label className="text-cocoa/60 text-xs">状态</Label>
                  <p className="mt-1">
                    <Badge
                      className={
                        STATUS_LABELS[selectedPost.status]?.className ?? ''
                      }
                    >
                      {STATUS_LABELS[selectedPost.status]?.label ??
                        selectedPost.status}
                    </Badge>
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-cocoa/60 text-xs">标签</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedPost.tags.length === 0 ? (
                    <span className="text-cocoa/50 text-sm">—</span>
                  ) : (
                    selectedPost.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        className="text-xs"
                        style={{ backgroundColor: tag.color + '40', color: tag.color }}
                      >
                        {tag.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              {selectedPost.recommendationReason && (
                <div>
                  <Label className="text-cocoa/60 text-xs">推荐理由</Label>
                  <p className="text-cocoa mt-1 leading-relaxed">
                    {selectedPost.recommendationReason}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-cocoa/60 text-xs">正文</Label>
                <div className="mt-2 p-4 bg-cream/30 rounded-lg text-cocoa leading-relaxed whitespace-pre-wrap">
                  {selectedPost.content}
                </div>
              </div>
              {selectedPost.rejectReason && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <Label className="text-destructive text-xs">拒绝原因</Label>
                  <p className="text-cocoa mt-1">{selectedPost.rejectReason}</p>
                </div>
              )}
            </div>
          )}
          {selectedPost?.status === 'pending' && (
            <DialogFooter className="gap-2">
              <Button
                variant="default"
                onClick={() => handleApprove(selectedPost.id)}
                className="bg-success hover:bg-success/90 rounded-full"
              >
                <Check size={16} /> 通过审核
              </Button>
              <Button
                variant="destructive"
                onClick={() => openRejectDialog(selectedPost.id)}
                className="rounded-full"
              >
                <X size={16} /> 拒绝
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md bg-paper border-2 border-dashed border-grid rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              拒绝审核
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-cocoa">请填写拒绝原因</Label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请说明拒绝的原因..."
              rows={4}
              className="w-full rounded-lg border border-grid bg-cream/30 p-3 text-sm text-cocoa focus:border-shiba focus:ring-2 focus:ring-shiba/20 outline-none resize-none"
            />
          </div>
          <DialogFooter>
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
              确认拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiteratureManage;
