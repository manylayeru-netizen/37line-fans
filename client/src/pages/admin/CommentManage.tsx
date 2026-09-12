import { useEffect, useState } from 'react';
import { Search, Trash2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import StickerPagination from '@client/src/components/StickerPagination';
import { literatureApi } from '@client/src/api';
import type { LiteratureComment } from '@shared/api.interface';

interface CommentManageProps {
  // no props needed
}

const CommentManage: React.FC<CommentManageProps> = () => {
  const [comments, setComments] = useState<LiteratureComment[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [keyword, setKeyword] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [targetId, setTargetId] = useState<string>('');

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await literatureApi.getAdminComments({
        page,
        pageSize,
        keyword: keyword || undefined,
      } as any);
      setComments(data.items);
      setTotal(data.total);
    } catch {
      toast.error('加载评论列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [page, keyword]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const openDeleteDialog = (id: string) => {
    setTargetId(id);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    try {
      await literatureApi.deleteCommentAdmin(targetId);
      toast.success('评论已删除');
      setDeleteOpen(false);
      loadComments();
    } catch {
      toast.error('删除失败，请重试');
    }
  };

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h2
          className="text-3xl text-ink mb-1"
          style={{ fontFamily: 'var(--font-handwriting)' }}
        >
          评论管理
        </h2>
        <p className="text-sm text-cocoa/60">管理推文的评论内容</p>
      </div>

      {/* Filters */}
      <div className="bg-paper rounded-2xl p-5 shadow-md border-2 border-dashed border-grid mb-6">
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa/40"
            />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索评论内容或评论者..."
              className="pl-9 rounded-full bg-cream/50 border-grid focus:border-shiba"
            />
          </div>
          <Button type="submit" variant="default" className="rounded-full">
            搜索
          </Button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-paper rounded-2xl shadow-md border-2 border-dashed border-grid overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-penguin/10 text-ink">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-[40%]">评论内容</th>
                <th className="px-4 py-3 text-left font-medium">评论者</th>
                <th className="px-4 py-3 text-left font-medium">所属帖子</th>
                <th className="px-4 py-3 text-left font-medium">时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-cocoa/50">
                    加载中...
                  </td>
                </tr>
              ) : comments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-cocoa/50">
                    <MessageCircle
                      size={32}
                      className="mx-auto mb-2 opacity-30"
                    />
                    暂无评论
                  </td>
                </tr>
              ) : (
                comments.map((comment) => (
                  <tr
                    key={comment.id}
                    className="border-t border-dashed border-grid hover:bg-cream/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-cocoa line-clamp-2 max-w-lg">
                        {comment.content}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-cocoa/80">
                      {comment.displayName || comment.guestName || '匿名'}
                    </td>
                    <td className="px-4 py-3 text-cocoa/60 text-xs">
                      ID: {comment.postId?.slice(0, 8) || '—'}
                    </td>
                    <td className="px-4 py-3 text-cocoa/70 whitespace-nowrap">
                      {new Date(comment.createdAt).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => openDeleteDialog(comment.id)}
                          className="p-2 rounded-full text-destructive hover:bg-destructive/10 transition-colors"
                          title="删除评论"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StickerPagination
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md bg-paper border-2 border-dashed border-grid rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              确认删除
            </DialogTitle>
            <DialogDescription className="text-cocoa/70">
              删除后无法恢复，确定要删除这条评论吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
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

export default CommentManage;
