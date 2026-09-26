import React, { useEffect, useState } from 'react';
import type { CreateGuestbookNoteRequest, GuestbookNote, PagedResponse } from '@shared/api.interface';
import { createGuestbookNote, deleteMyNote, getGuestbookNotes } from '@client/src/api/guestbook';
import PageHeader from '@client/src/components/PageHeader';
import LoadingSpinner from '@client/src/components/LoadingSpinner';
import ErrorState from '@client/src/components/ErrorState';
import StickerPagination from '@client/src/components/StickerPagination';
import { useAuthStore } from '@client/src/store/auth.store';
import { Trash2 } from 'lucide-react';
import { renderContentWithButtons } from '@client/src/utils/content-links';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@client/src/components/ui/dialog';
import { toast } from 'sonner';
import { useReviewSettings } from '@client/src/hooks/use-review-settings';

const LEGACY_SHAPE_TO_EMOJI: Record<string, string> = {
  shiba: '🐕',
  penguin: '🐧',
  heart: '❤️',
  star: '⭐',
};

function shapeToEmoji(shape: string): string {
  if (LEGACY_SHAPE_TO_EMOJI[shape]) return LEGACY_SHAPE_TO_EMOJI[shape];
  return shape || '🐕';
}

const NOTE_COLORS: Record<string, string> = {
  shiba: '#F4A261',
  penguin: '#B8D4E3',
  heart: '#F8C8DC',
  star: '#A8DADC',
};

const DEFAULT_NOTE_BG = '#FFE4B5';

function getNoteBgColor(note: GuestbookNote): string {
  if (note.noteColor && note.noteColor.startsWith('#')) return note.noteColor;
  return NOTE_COLORS[note.noteShape] || DEFAULT_NOTE_BG;
}

interface NoteCardProps {
  note: GuestbookNote;
  index: number;
  onClick: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, index, onClick, onDelete, canDelete }) => {
  const bgColor = getNoteBgColor(note);
  const emoji = shapeToEmoji(note.noteShape);
  const rotation = ((index % 7) - 3) * 1.2;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      onClick={onClick}
       className="group relative rounded-lg p-3 sm:p-4 md:p-5 shadow-md cursor-pointer card-wobble transition-transform hover:scale-105 hover:z-10 min-h-[120px] sm:min-h-[140px]"
      style={{ backgroundColor: bgColor, transform: `rotate(${rotation}deg)` }}
    >
       <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 text-2xl sm:text-3xl select-none" style={{ transform: `translateX(-50%) rotate(${-rotation * 0.5}deg)` }}>
        {emoji}
      </div>
      {canDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-paper/70 hover:bg-red-100 text-cocoa/70 hover:text-red-500 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 z-20"
          title="删除留言"
        >
          <Trash2 size={14} />
        </button>
      )}
       <div className="line-clamp-4 pt-1 sm:pt-2">
        {renderContentWithButtons(note.content, { textClassName: 'font-handwriting text-ink text-sm sm:text-base leading-relaxed' })}
      </div>
      <div className="mt-3 pt-2 border-t border-cocoa/10 text-right">
        <span className="text-xs text-cocoa/70 font-handwriting">— {note.authorName}</span>
      </div>
    </div>
  );
};

const GuestbookPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { settings: reviewSettings } = useReviewSettings();
  const reviewEnabled = reviewSettings?.guestbookEnabled ?? true;
  const [data, setData] = useState<PagedResponse<GuestbookNote> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [showForm, setShowForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState<GuestbookNote | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateGuestbookNoteRequest>({
    authorName: '',
    content: '',
    noteShape: '🐕',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getGuestbookNotes({ page, pageSize })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message || '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;
    setSubmitting(true);
    try {
      await createGuestbookNote({
        ...formData,
        authorName: formData.authorName || '匿名访客',
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setShowForm(false);
        setSubmitSuccess(false);
        setFormData({ authorName: '', content: '', noteShape: '🐕' });
      }, 2000);
    } catch (err) {
      toast('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteNote = async () => {
    const id = deleteTargetId;
    setDeleteTargetId(null);
    if (!id) return;
    try {
      await deleteMyNote(id);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((n: GuestbookNote) => n.id !== id),
          total: prev.total - 1,
        };
      });
      toast.success('留言已删除');
      if (selectedNote?.id === id) {
        setSelectedNote(null);
      }
    } catch (err) {
      toast.error((err as Error).message || '删除失败');
    }
  };

  const canDeleteNote = (note: GuestbookNote): boolean => {
    if (!isAuthenticated || !user) return false;
    if (user.role === 'admin') return true;
    if (user.displayName && note.authorName === user.displayName) return true;
    if (note.authorName === user.username) return true;
    return false;
  };

  const emojiGroups: { title: string; emojis: string[] }[] = [
    { title: '动物', emojis: ['🐕', '🐧', '🐱', '🐰', '🦊', '🐼', '🐨', '🦄', '🐸', '🦋', '🐻', '🐯'] },
    { title: '表情', emojis: ['😊', '😍', '🥰', '😎', '🤗', '😴', '🤔', '😇', '🥺', '😆', '🥳', '😌'] },
    { title: '爱心星星', emojis: ['❤️', '💖', '💛', '💙', '💚', '⭐', '🌟', '✨', '💫', '🎀', '💝', '💜'] },
    { title: '食物植物', emojis: ['🍰', '🌸', '🌻', '🍓', '🧁', '🍪', '🌙', '☀️', '🌈', '🎈', '🍡', '🌷'] },
  ];

  const allEmojis: string[] = emojiGroups.flatMap((g) => g.emojis);

  return (
     <div className="min-h-screen bg-cream py-8 md:py-12 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        <PageHeader title="留言板" subtitle="写下你想说的话吧 📝" icon="📌" />

        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowForm(true)}
            className="px-8 py-3 bg-shiba text-paper rounded-full font-handwriting text-xl shadow-md hover:shadow-lg transition-all card-wobble hover:scale-105"
          >
            ✏️ 写一张便签
          </button>
        </div>

         <div className="bg-corkboard rounded-2xl shadow-inner p-3 sm:p-6 md:p-10 min-h-[400px] sm:min-h-[500px] relative overflow-hidden">
          <div className="absolute top-4 left-4 w-20 h-5 bg-tape-pink/80 -rotate-12" />
          <div className="absolute top-6 right-6 w-16 h-4 bg-tape-blue/80 rotate-6" />

          {loading && <LoadingSpinner text="正在整理便签..." />}
          {error && <ErrorState message={error} />}

          {!loading && !error && data && (
            <>
              {data.items.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">📌</div>
                  <p className="font-handwriting text-2xl text-paper/80">还没有便签呢，来写第一张吧～</p>
                </div>
              ) : (
                 <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 pt-2 sm:pt-4">
                  {data.items.map((note, idx) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      index={idx}
                      onClick={() => setSelectedNote(note)}
                      onDelete={() => handleDeleteNote(note.id)}
                      canDelete={canDeleteNote(note)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {data && (
          <StickerPagination
            page={data.page}
            total={data.total}
            pageSize={data.pageSize}
            onPageChange={setPage}
          />
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="bg-paper border-none rounded-xl shadow-xl max-w-md p-0 overflow-hidden">
            <div className="absolute -top-3 left-1/4 w-20 h-6 bg-tape-pink/70 -rotate-6" />
            {submitSuccess ? (
              <div className="p-10 text-center">
                <div className="text-5xl mb-4">✨</div>
                <p className="font-handwriting text-2xl text-ink">留言已提交～</p>
                <p className="text-cocoa/70 mt-2">
                  {reviewEnabled
                    ? '审核通过后会显示在墙上哦 💌'
                    : '已直接发布到墙上 ✨'}
                </p>
              </div>
            ) : (
              <>
                <DialogHeader className="p-6 pb-2">
                  <DialogTitle className="font-handwriting text-3xl text-ink text-center">
                    写一张便签
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-5">
                  <div>
                    <label className="font-handwriting text-lg text-cocoa mb-2 block">昵称（选填）</label>
                    <input
                      type="text"
                      value={formData.authorName}
                      onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                      placeholder="匿名访客"
                      className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/50 focus:border-shiba focus:outline-none text-cocoa"
                    />
                  </div>
                  <div>
                    <label className="font-handwriting text-lg text-cocoa mb-2 block">选择装饰 emoji</label>
                    <div className="grid grid-cols-6 sm:grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1">
                      {allEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setFormData({ ...formData, noteShape: emoji })}
                          className={`aspect-square rounded-lg flex items-center justify-center text-2xl transition-all border-2 ${
                            formData.noteShape === emoji
                              ? 'border-shiba bg-cream scale-110 shadow-md'
                              : 'border-transparent bg-cream/50 hover:bg-cream hover:scale-105'
                          }`}
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="font-handwriting text-lg text-cocoa mb-2 block">留言内容</label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="写下你想说的话吧～"
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border-2 border-cocoa/10 bg-cream/50 focus:border-shiba focus:outline-none text-cocoa resize-none"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !formData.content.trim()}
                    className="w-full py-3 bg-shiba text-paper rounded-full font-handwriting text-xl shadow-md hover:shadow-lg transition disabled:opacity-50"
                  >
                    {submitting ? '提交中...' : '贴上便签 📌'}
                  </button>
                </form>
              </>
            )}
            <DialogClose className="absolute top-3 right-3 w-7 h-7 rounded-full bg-cocoa/10 text-cocoa font-handwriting hover:bg-cocoa/20 transition flex items-center justify-center" />
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
          <DialogContent className="bg-transparent border-none shadow-none max-w-md p-0" showCloseButton={false}>
            {selectedNote && (
              <div
                className="relative rounded-lg p-8 shadow-xl"
                style={{ backgroundColor: getNoteBgColor(selectedNote), transform: 'rotate(-1deg)' }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-5xl select-none">
                  {shapeToEmoji(selectedNote.noteShape)}
                </div>
                <div className="pt-2">
                  {renderContentWithButtons(selectedNote.content, { textClassName: 'font-handwriting text-xl text-ink leading-relaxed' })}
                </div>
                <div className="mt-6 pt-3 border-t border-cocoa/20 text-right">
                  <span className="font-handwriting text-cocoa/70">— {selectedNote.authorName}</span>
                </div>
                <DialogClose className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-shiba text-paper font-handwriting shadow-md hover:scale-110 transition flex items-center justify-center">
                  ✕
                </DialogClose>
              </div>
            )}
          </DialogContent>
         </Dialog>

         <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
           <DialogContent className="bg-paper border-none rounded-xl shadow-xl max-w-sm">
             <DialogHeader>
               <DialogTitle className="font-handwriting text-2xl text-ink text-center">
                 🗑️ 确认删除
               </DialogTitle>
             </DialogHeader>
             <p className="text-center text-cocoa/70 py-2">
               确定要删除这条留言吗？此操作不可撤销哦~
             </p>
             <div className="flex gap-3 justify-center pt-2">
               <button
                 onClick={() => setDeleteTargetId(null)}
                 className="px-5 py-2 rounded-full bg-cream text-cocoa hover:bg-cream/80 transition text-sm"
               >
                 再想想
               </button>
               <button
                 onClick={confirmDeleteNote}
                 className="px-5 py-2 rounded-full bg-shiba text-paper hover:bg-shiba/90 transition text-sm"
               >
                 确认删除
               </button>
             </div>
           </DialogContent>
         </Dialog>
       </div>
    </div>
  );
};

export default GuestbookPage;
