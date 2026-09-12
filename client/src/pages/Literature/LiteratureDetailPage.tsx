import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { LiteratureComment, LiteraturePost, PagedResponse } from '@shared/api.interface';
import {
  createComment,
  getComments,
  getPost,
} from '@client/src/api/literature';
import LoadingSpinner from '@client/src/components/LoadingSpinner';
import ErrorState from '@client/src/components/ErrorState';
import StickerPagination from '@client/src/components/StickerPagination';
import { toast } from 'sonner';

const LiteratureDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<LiteraturePost | null>(null);
  const [comments, setComments] = useState<PagedResponse<LiteratureComment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentPage, setCommentPage] = useState(1);
  const [commentContent, setCommentContent] = useState('');
  const [guestName, setGuestName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPost(id)
      .then((res) => {
        if (!cancelled) setPost(res);
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
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
      getComments(id, { page: commentPage, pageSize })
      .then((res) => {
        if (!cancelled) setComments(res);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [id, commentPage]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentContent.trim()) return;
    setSubmitting(true);
    try {
      await createComment(id, {
        content: commentContent.trim(),
        guestName: guestName.trim() || undefined,
      });
      setCommentContent('');
      setGuestName('');
      setCommentPage(1);
      if (id) {
        const fresh = await getComments(id, { page: 1, pageSize });
        setComments(fresh);
      }
    } catch (err) {
      toast('评论发表失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream py-12 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/literature')}
          className="mb-8 inline-flex items-center gap-2 px-5 py-2 bg-paper rounded-full shadow-sm border-2 border-cocoa/10 font-handwriting text-lg text-cocoa hover:border-shiba hover:bg-shiba/10 transition card-wobble"
        >
          ← 返回列表
        </button>

        {loading && <LoadingSpinner text="正在打开文章..." />}
        {error && <ErrorState message={error} />}

        {!loading && !error && post && (
          <>
            <article className="relative bg-paper rounded-xl shadow-lg p-8 md:p-12 mb-10">
              <div className="absolute -top-3 left-10 w-24 h-6 bg-tape-pink opacity-70 -rotate-6 shadow-sm" />
              <div className="absolute -top-2 right-12 w-20 h-5 bg-tape-blue opacity-70 rotate-6 shadow-sm" />

              <header className="text-center mb-8 pb-8 border-b-2 border-dashed border-grid">
                <h1 className="font-handwriting text-4xl md:text-5xl text-ink mb-4">{post.title}</h1>
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-cocoa/70">
                  <span>✍️ {post.author}</span>
                  {post.sourcePlatform && <span>📍 {post.sourcePlatform}</span>}
                  <span>📅 {new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {post.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 rounded-full text-sm font-handwriting text-paper"
                      style={{ backgroundColor: tag.color }}
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              </header>

              {post.recommendationReason && (
                <div className="relative bg-mint/30 rounded-xl p-6 mb-8 -rotate-0.5">
                  <div className="absolute -top-2 left-6 w-16 h-4 bg-tape-pink/60 -rotate-6" />
                  <p className="font-handwriting text-lg text-ink mb-2">💡 推荐理由</p>
                  <p className="text-cocoa/80 leading-relaxed">{post.recommendationReason}</p>
                </div>
              )}

              <div className="text-cocoa/90 leading-loose text-base md:text-lg whitespace-pre-wrap">
                {post.content}
              </div>
            </article>

            <section className="bg-paper rounded-xl shadow-md p-6 md:p-8">
              <h2 className="font-handwriting text-2xl text-ink mb-6">
                💬 评论区 <span className="text-base text-cocoa/50">({comments?.total || 0})</span>
              </h2>

              <form onSubmit={handleSubmitComment} className="mb-8 space-y-3">
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="昵称（选填，默认匿名）"
                  className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa text-sm"
                />
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="写下你的想法吧～"
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa resize-none"
                  required
                />
                <div className="text-right">
                  <button
                    type="submit"
                    disabled={submitting || !commentContent.trim()}
                    className="px-6 py-2 bg-shiba text-paper rounded-full font-handwriting text-base shadow-sm hover:shadow-md transition disabled:opacity-50"
                  >
                    {submitting ? '发送中...' : '发表评论'}
                  </button>
                </div>
              </form>

              {!comments ? (
                <LoadingSpinner text="加载评论中..." />
              ) : comments.items.length === 0 ? (
                <p className="text-center text-cocoa/50 font-handwriting py-8">
                  还没有评论，来说两句吧～
                </p>
              ) : (
                <>
                  <div className="space-y-4">
                    {comments.items.map((c) => (
                      <div key={c.id} className="bg-cream/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-handwriting text-base text-ink">
                            {c.displayName || c.guestName || '匿名访客'}
                          </span>
                          <span className="text-xs text-cocoa/50">
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-cocoa/80 text-sm leading-relaxed">{c.content}</p>
                      </div>
                    ))}
                  </div>
                  <StickerPagination
                    page={comments.page}
                    total={comments.total}
                    pageSize={comments.pageSize}
                    onPageChange={setCommentPage}
                  />
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default LiteratureDetailPage;
