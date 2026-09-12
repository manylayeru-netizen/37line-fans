import React, { useEffect, useState } from 'react';
import type { CreateGuestbookNoteRequest, GuestbookNote, PagedResponse } from '@shared/api.interface';
import { createGuestbookNote, getGuestbookNotes } from '@client/src/api/guestbook';
import PageHeader from '@client/src/components/PageHeader';
import LoadingSpinner from '@client/src/components/LoadingSpinner';
import ErrorState from '@client/src/components/ErrorState';
import StickerPagination from '@client/src/components/StickerPagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@client/src/components/ui/dialog';
import { toast } from 'sonner';

const NOTE_COLORS: Record<string, string> = {
  shiba: 'bg-[#F4A261]',
  penguin: 'bg-[#B8D4E3]',
  heart: 'bg-[#F8C8DC]',
  star: 'bg-[#A8DADC]',
};

const NOTE_SHAPES: Record<string, string> = {
  shiba: 'rounded-lg',
  penguin: 'rounded-xl',
  heart: 'rounded-2xl',
  star: 'rounded-md',
};

interface NoteCardProps {
  note: GuestbookNote;
  index: number;
  onClick: () => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, index, onClick }) => {
  const colorClass = NOTE_COLORS[note.noteColor || note.noteShape] || 'bg-paper';
  const shapeClass = NOTE_SHAPES[note.noteShape] || 'rounded-lg';
  const rotation = ((index % 7) - 3) * 1.2;

  return (
    <div
      onClick={onClick}
      className={`relative ${colorClass} ${shapeClass} p-5 shadow-md cursor-pointer card-wobble transition-transform hover:scale-105 hover:z-10 min-h-[140px]`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-cocoa/80 shadow-inner border border-cocoa/40" />
      <p className="font-handwriting text-ink text-base line-clamp-4 leading-relaxed">
        {note.content}
      </p>
      <div className="mt-3 pt-2 border-t border-cocoa/10 text-right">
        <span className="text-xs text-cocoa/70 font-handwriting">— {note.authorName}</span>
      </div>
    </div>
  );
};

const GuestbookPage: React.FC = () => {
  const [data, setData] = useState<PagedResponse<GuestbookNote> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [showForm, setShowForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState<GuestbookNote | null>(null);
  const [formData, setFormData] = useState<CreateGuestbookNoteRequest>({
    authorName: '',
    content: '',
    noteShape: 'shiba',
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
        setFormData({ authorName: '', content: '', noteShape: 'shiba' });
      }, 2000);
    } catch (err) {
      toast('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const shapeOptions: { value: GuestbookNote['noteShape']; label: string; emoji: string; color: string }[] = [
    { value: 'shiba', label: '柴犬', emoji: '🐕', color: 'bg-[#F4A261]' },
    { value: 'penguin', label: '企鹅', emoji: '🐧', color: 'bg-[#B8D4E3]' },
    { value: 'heart', label: '爱心', emoji: '💖', color: 'bg-[#F8C8DC]' },
    { value: 'star', label: '星星', emoji: '⭐', color: 'bg-[#A8DADC]' },
  ];

  return (
    <div className="min-h-screen bg-cream py-12 px-4 md:px-6">
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

        <div className="bg-corkboard rounded-2xl shadow-inner p-6 md:p-10 min-h-[500px] relative overflow-hidden">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {data.items.map((note, idx) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      index={idx}
                      onClick={() => setSelectedNote(note)}
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
                <p className="text-cocoa/70 mt-2">审核通过后会显示在墙上哦 💌</p>
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
                    <label className="font-handwriting text-lg text-cocoa mb-2 block">选择便签样式</label>
                    <div className="grid grid-cols-4 gap-3">
                      {shapeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, noteShape: opt.value })}
                          className={`aspect-square rounded-xl ${opt.color} flex flex-col items-center justify-center transition-all ${
                            formData.noteShape === opt.value
                              ? 'ring-2 ring-shiba ring-offset-2 scale-105'
                              : 'hover:scale-105'
                          }`}
                        >
                          <span className="text-2xl">{opt.emoji}</span>
                          <span className="text-xs text-cocoa/80 mt-1">{opt.label}</span>
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
                className={`relative ${NOTE_COLORS[selectedNote.noteColor || selectedNote.noteShape] || 'bg-paper'} ${NOTE_SHAPES[selectedNote.noteShape] || 'rounded-lg'} p-8 shadow-xl`}
                style={{ transform: 'rotate(-1deg)' }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-cocoa/80 shadow-inner border border-cocoa/40" />
                <p className="font-handwriting text-xl text-ink leading-relaxed whitespace-pre-wrap">
                  {selectedNote.content}
                </p>
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
      </div>
    </div>
  );
};

export default GuestbookPage;
