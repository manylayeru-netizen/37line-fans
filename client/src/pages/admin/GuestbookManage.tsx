import { useEffect, useState, useCallback } from 'react';
import {
  Check,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { guestbookApi } from '@client/src/api';
import type { GuestbookNote } from '@shared/api.interface';

interface GuestbookManageProps {
  // no props needed
}

const STATUS_TABS = [
  { value: 'pending', label: '待审核', icon: Clock, color: 'text-shiba' },
  { value: 'approved', label: '已通过', icon: Check, color: 'text-mint' },
  { value: 'rejected', label: '已拒绝', icon: X, color: 'text-destructive' },
];

const SHAPE_LABELS: Record<string, string> = {
  shiba: '🐕 柴犬',
  penguin: '🐧 企鹅',
  heart: '💖 爱心',
  star: '⭐ 星星',
};

const GuestbookManage: React.FC<GuestbookManageProps> = () => {
  const [items, setItems] = useState<GuestbookNote[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(9);
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<GuestbookNote | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await guestbookApi.getAdminNotes({
        page,
        pageSize,
        status: statusFilter,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      toast.error('加载留言列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleApprove = async (id: string) => {
    try {
      await guestbookApi.approveNote(id);
      toast.success('已通过 ✅');
      fetchList();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await guestbookApi.rejectNote(id);
      toast.success('已拒绝');
      fetchList();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await guestbookApi.deleteNote(deleteId);
      toast.success('已删除');
      setDeleteId(null);
      fetchList();
    } catch {
      toast.error('删除失败');
    }
  };

  const getNoteBg = (shape: string, color: string): string => {
    if (color) return color;
    switch (shape) {
      case 'shiba':
        return '#F8C8DC';
      case 'penguin':
        return '#B8D4E3';
      case 'heart':
        return '#F8C8DC';
      case 'star':
        return '#FFF3D6';
      default:
        return '#FFFAF0';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2
          className="text-3xl text-ink"
          style={{ fontFamily: 'var(--font-handwriting)' }}
        >
          📮 留言审核
        </h2>
      </div>

      {/* Status Tabs */}
      <div className="bg-paper rounded-2xl p-2 shadow-sm border-2 border-dashed border-grid mb-6 relative inline-flex">
        <div
          className="absolute -top-3 left-6 w-16 h-5 bg-tape-pink opacity-70 rounded-sm"
          style={{ transform: 'rotate(-3deg)' }}
        />
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === tab.value
                ? 'bg-shiba text-white shadow-md'
                : 'text-cocoa hover:bg-cream'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notes Grid */}
      <div className="bg-paper rounded-2xl shadow-sm border-2 border-dashed border-grid p-6 relative">
        <div
          className="absolute -top-3 right-6 w-16 h-5 bg-tape-blue opacity-70 rounded-sm"
          style={{ transform: 'rotate(3deg)' }}
        />
        {loading && (
          <div className="text-center py-12 text-cocoa/50">加载中...</div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-12 text-cocoa/50">
            暂无{STATUS_TABS.find((t) => t.value === statusFilter)?.label}留言
            ~
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {items.map((note, index) => (
              <div
                key={note.id}
                className="relative group cursor-pointer card-wobble"
                style={{
                  transform: `rotate(${(index % 3 - 1) * 1.5}deg)`,
                }}
                onClick={() => setViewingNote(note)}
              >
                {/* Note card */}
                <div
                  className="rounded-lg p-5 shadow-md min-h-[180px] relative"
                  style={{ backgroundColor: getNoteBg(note.noteShape, note.noteColor) }}
                >
                  {/* Pin */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-cocoa shadow-md border-2 border-ink/30" />

                  {/* Pending badge */}
                  {note.status === 'pending' && (
                    <Badge
                      className="absolute -top-1 -right-1 bg-shiba text-white rounded-full border-0 shadow-md animate-pulse"
                      style={{ fontFamily: 'var(--font-handwriting)' }}
                    >
                      待审核
                    </Badge>
                  )}

                  {/* Author */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center text-sm">
                      {SHAPE_LABELS[note.noteShape]?.split(' ')[0] || '📝'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink font-handwriting">
                        {note.authorName || '匿名访客'}
                      </p>
                      <p className="text-[10px] text-cocoa/60">
                        {new Date(note.createdAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Content */}
                  <p
                    className="text-sm text-ink/90 line-clamp-4 leading-relaxed font-handwriting"
                    style={{ fontFamily: 'var(--font-handwriting)' }}
                  >
                    {note.content}
                  </p>

                  {/* Shape & color info */}
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-cocoa/60">
                    <span>{SHAPE_LABELS[note.noteShape] || note.noteShape}</span>
                  </div>

                  {/* Hover actions */}
                  <div
                    className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {note.status === 'pending' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(note.id);
                          }}
                          className="p-1.5 bg-white/90 rounded-full shadow-md hover:bg-mint/40 text-mint hover:text-mint"
                          title="通过"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(note.id);
                          }}
                          className="p-1.5 bg-white/90 rounded-full shadow-md hover:bg-destructive/20 text-destructive"
                          title="拒绝"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(note.id);
                      }}
                      className="p-1.5 bg-white/90 rounded-full shadow-md hover:bg-destructive/20 text-destructive"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t-2 border-dashed border-grid">
            <span className="text-sm text-cocoa/70">
              共 {total} 条，第 {page} / {totalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 w-8 rounded-full"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page >= totalPages}
                className="h-8 w-8 rounded-full"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* View Note Detail */}
      <Dialog
        open={!!viewingNote}
        onOpenChange={(o) => !o && setViewingNote(null)}
      >
        <DialogContent className="bg-paper border-2 border-dashed border-grid max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              📝 留言详情
            </DialogTitle>
          </DialogHeader>

          {viewingNote && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                  style={{
                    backgroundColor: getNoteBg(
                      viewingNote.noteShape,
                      viewingNote.noteColor,
                    ),
                  }}
                >
                  {SHAPE_LABELS[viewingNote.noteShape]?.split(' ')[0] || '📝'}
                </div>
                <div>
                  <p className="font-medium text-ink">
                    {viewingNote.authorName || '匿名访客'}
                  </p>
                  <p className="text-xs text-cocoa/60">
                    {new Date(viewingNote.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="ml-auto">
                  <Badge
                    className={`rounded-full border-0 ${
                      viewingNote.status === 'approved'
                        ? 'bg-mint text-ink'
                        : viewingNote.status === 'rejected'
                          ? 'bg-destructive text-white'
                          : 'bg-shiba text-white'
                    }`}
                    style={{ fontFamily: 'var(--font-handwriting)' }}
                  >
                    {
                      STATUS_TABS.find(
                        (t) => t.value === viewingNote.status,
                      )?.label
                    }
                  </Badge>
                </div>
              </div>

              <div
                className="p-5 rounded-lg min-h-[120px]"
                style={{
                  backgroundColor: getNoteBg(
                    viewingNote.noteShape,
                    viewingNote.noteColor,
                  ),
                }}
              >
                <p
                  className="text-ink leading-relaxed whitespace-pre-wrap font-handwriting"
                  style={{ fontFamily: 'var(--font-handwriting)' }}
                >
                  {viewingNote.content}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-cocoa/60">
                <span>形状：{SHAPE_LABELS[viewingNote.noteShape] || viewingNote.noteShape}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {viewingNote?.status === 'pending' && (
              <>
                <Button
                  onClick={() => {
                    if (viewingNote) handleApprove(viewingNote.id);
                    setViewingNote(null);
                  }}
                  className="bg-mint text-ink rounded-full"
                >
                  <Check size={16} />
                  通过
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (viewingNote) handleReject(viewingNote.id);
                    setViewingNote(null);
                  }}
                  className="rounded-full"
                >
                  <X size={16} />
                  拒绝
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() => setViewingNote(null)}
              className="rounded-full"
            >
              关闭
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
            确定要删除这条留言吗？此操作不可撤销哦~
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

export default GuestbookManage;
