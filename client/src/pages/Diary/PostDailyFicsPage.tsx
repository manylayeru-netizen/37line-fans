import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitDiary } from '@client/src/api/diary';
import PageHeader from '@client/src/components/PageHeader';

const contentWarningOptions = [
  { value: 'M', label: 'M' },
  { value: '主要人物死亡', label: '主要人物死亡' },
  { value: '血腥暴力', label: '血腥暴力' },
];

const PostDailyFicsPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    entryDate: new Date().toISOString().split('T')[0],
    author: '',
    sourcePlatform: '',
    completionStatus: 'completed' as 'completed' | 'ongoing',
    contentWarnings: [] as string[],
    characterBackground: '',
    recommendationReason: '',
    sourceUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleWarning = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      contentWarnings: prev.contentWarnings.includes(value)
        ? prev.contentWarnings.filter((w) => w !== value)
        : [...prev.contentWarnings, value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('标题不能为空哦');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitDiary(formData);
      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/dailyfics');
      }, 2000);
    } catch {
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
            <p className="text-cocoa/70">等待管理员审核通过后就会展示啦 📮</p>
            <p className="text-sm text-cocoa/50 mt-4">即将跳转到每日推文列表...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-12 px-4 md:px-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/dailyfics')}
          className="mb-6 inline-flex items-center gap-2 px-5 py-2 bg-paper rounded-full shadow-sm border-2 border-cocoa/10 font-handwriting text-lg text-cocoa hover:border-shiba transition"
        >
          ← 返回列表
        </button>

        <PageHeader title="投稿" subtitle="分享你喜欢的日常 ✍️" icon="📝" />

        <form onSubmit={handleSubmit} className="bg-paper rounded-xl shadow-md p-6 md:p-8 space-y-5">
          {error && (
            <div className="bg-tape-pink/30 rounded-lg p-3 text-cocoa text-sm">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-handwriting text-lg text-cocoa mb-2 block">日期</label>
            <input
              type="date"
              value={formData.entryDate}
              onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa"
              required
            />
          </div>
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
                placeholder="Lofter / AO3 / 微博..."
                className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa"
              />
            </div>
           </div>

          <div>
            <label className="font-handwriting text-lg text-cocoa mb-2 block">原文链接</label>
            <input
              type="url"
              value={formData.sourceUrl}
              onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa"
            />
            <p className="text-xs text-cocoa/50 mt-1">可填写微博/Lofter 等原文地址</p>
          </div>

          <div>
            <label className="font-handwriting text-lg text-cocoa mb-2 block">完结状态</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="completionStatus"
                  value="completed"
                  checked={formData.completionStatus === 'completed'}
                  onChange={() => setFormData({ ...formData, completionStatus: 'completed' })}
                  className="w-4 h-4 accent-shiba"
                />
                <span className="text-cocoa">已完结</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="completionStatus"
                  value="ongoing"
                  checked={formData.completionStatus === 'ongoing'}
                  onChange={() => setFormData({ ...formData, completionStatus: 'ongoing' })}
                  className="w-4 h-4 accent-shiba"
                />
                <span className="text-cocoa">未完结</span>
              </label>
            </div>
          </div>

          <div>
            <label className="font-handwriting text-lg text-cocoa mb-2 block">
              内容警告 <span className="text-cocoa/50 text-sm">（可选，可不选）</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {contentWarningOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`px-4 py-1.5 rounded-full font-handwriting text-sm cursor-pointer transition-all ${
                    formData.contentWarnings.includes(opt.value)
                      ? 'bg-shiba text-paper shadow-sm'
                      : 'bg-cream/50 text-cocoa/70 border-2 border-cocoa/10 hover:border-shiba'
                  }`}
                >
                  <input
                    type="checkbox"
                    value={opt.value}
                    checked={formData.contentWarnings.includes(opt.value)}
                    onChange={() => toggleWarning(opt.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="font-handwriting text-lg text-cocoa mb-2 block">标题 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa"
              required
            />
          </div>

          <div>
            <label className="font-handwriting text-lg text-cocoa mb-2 block">人设背景</label>
            <textarea
              value={formData.characterBackground}
              onChange={(e) => setFormData({ ...formData, characterBackground: e.target.value })}
              placeholder="描述文中的人物设定背景..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="font-handwriting text-lg text-cocoa mb-2 block">推荐理由</label>
            <textarea
              value={formData.recommendationReason}
              onChange={(e) => setFormData({ ...formData, recommendationReason: e.target.value })}
              placeholder="为什么推荐这篇推文？"
              rows={3}
              className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="font-handwriting text-lg text-cocoa mb-2 block">正文节选 <span className="text-cocoa/50 text-sm">（可选）</span></label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="可粘贴原文片段或留白..."
              rows={12}
              className="w-full px-4 py-2 rounded-lg border-2 border-cocoa/10 bg-cream/30 focus:border-shiba focus:outline-none text-cocoa resize-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-shiba text-paper rounded-full font-handwriting text-xl shadow-md hover:shadow-lg transition disabled:opacity-50"
          >
            {submitting ? '提交中...' : '投稿 📮'}
          </button>

          <p className="text-center text-xs text-cocoa/50">
            投稿需要管理员审核通过后才会公开展示哦
          </p>
        </form>
      </div>
    </div>
  );
};

export default PostDailyFicsPage;
