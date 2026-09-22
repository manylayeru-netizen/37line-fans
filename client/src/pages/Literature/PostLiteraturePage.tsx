import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CreateLiteraturePostRequest, LiteratureTag } from '@shared/api.interface';
import { createPost, getTags } from '@client/src/api/literature';
import PageHeader from '@client/src/components/PageHeader';
import { useReviewSettings } from '@client/src/hooks/use-review-settings';

const PostLiteraturePage: React.FC = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState<LiteratureTag[]>([]);
  const [formData, setFormData] = useState<CreateLiteraturePostRequest>({
    title: '',
    author: '',
    sourcePlatform: '',
    content: '',
    recommendationReason: '',
    tagIds: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const { settings: reviewSettings } = useReviewSettings();
  const reviewEnabled = reviewSettings?.literatureEnabled ?? true;
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTags()
      .then((res) => {
        if (!cancelled) setTags(res);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.author.trim() || !formData.content.trim()) {
      setError('标题、作者和正文不能为空哦');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createPost(formData);
      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/literature');
      }, 2000);
    } catch (err) {
      setError('投稿失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-cream py-12 px-4 md:px-6">
        <div className="max-w-lg mx-auto">
          <div className="bg-paper rounded-xl shadow-lg p-10 text-center">
            <div className="text-6xl mb-6">✨</div>
            <h1 className="font-handwriting text-3xl text-ink mb-3">投稿成功～</h1>
            <p className="text-cocoa/70">
              {reviewEnabled
                ? '等待管理员审核通过后就会展示啦 📮'
                : '发布成功，已直接公开 🎉'}
            </p>
            <p className="text-sm text-cocoa/50 mt-4">即将跳转到文学鉴赏列表...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-12 px-4 md:px-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/literature')}
          className="mb-6 inline-flex items-center gap-2 px-5 py-2 bg-paper rounded-full shadow-sm border-2 border-cocoa/10 font-handwriting text-lg text-cocoa hover:border-shiba transition"
        >
          ← 返回列表
        </button>

        <PageHeader title="投稿" subtitle="分享你喜欢的文字吧 ✍️" icon="📝" />

        <form onSubmit={handleSubmit} className="bg-paper rounded-xl shadow-md p-6 md:p-8 space-y-5">
          {error && (
            <div className="bg-tape-pink/30 rounded-lg p-3 text-cocoa text-sm">{error}</div>
          )}

          <div>
            <label className="font-handwriting text-lg text-cocoa mb-2 block">标题 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="文章标题"
              className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-handwriting text-lg text-cocoa mb-2 block">作者 *</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="文章作者"
                className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa"
                required
              />
            </div>
            <div>
              <label className="font-handwriting text-lg text-cocoa mb-2 block">平台</label>
              <input
                type="text"
                value={formData.sourcePlatform}
                onChange={(e) => setFormData({ ...formData, sourcePlatform: e.target.value })}
                placeholder=""
                className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa"
              />
            </div>
          </div>

          <div>
            <label className="font-handwriting text-lg text-cocoa mb-2 block">推荐理由</label>
            <textarea
              value={formData.recommendationReason}
              onChange={(e) => setFormData({ ...formData, recommendationReason: e.target.value })}
              placeholder="为什么推荐这篇文章？"
              rows={3}
              className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa resize-none"
            />
          </div>

          <div>
            <label className="font-handwriting text-lg text-cocoa mb-2 block">片段节选 *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="粘贴或输入文章内容..."
              rows={10}
              className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa resize-none font-mono text-sm leading-relaxed"
              required
            />
          </div>

          <div>
            <label className="font-handwriting text-lg text-cocoa mb-2 block">选择标签</label>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <span className="text-sm text-cocoa/50">暂无标签</span>
              ) : (
                tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag.id)}
                    className={`px-4 py-1.5 rounded-full font-handwriting text-sm transition-all ${
                      formData.tagIds.includes(tag.id)
                        ? 'text-paper shadow-sm scale-105'
                        : 'bg-paper text-cocoa/70 border-2 border-cocoa/10 hover:border-shiba'
                    }`}
                    style={formData.tagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                  >
                    # {tag.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-shiba text-paper rounded-full font-handwriting text-xl shadow-md hover:shadow-lg transition disabled:opacity-50"
          >
            {submitting ? '提交中...' : '投稿 📮'}
          </button>

          <p className="text-center text-xs text-cocoa/50">
            {reviewEnabled
              ? '投稿需要管理员审核通过后才会公开展示哦'
              : '提交后将直接公开展示哦'}
          </p>
        </form>
      </div>
    </div>
  );
};

export default PostLiteraturePage;
