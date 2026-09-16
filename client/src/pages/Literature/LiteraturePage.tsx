import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { LiteraturePost, LiteratureTag, PagedResponse } from '@shared/api.interface';
import { getPosts, getTags } from '@client/src/api/literature';
import { useAuthStore } from '@client/src/store/auth.store';
import PageHeader from '@client/src/components/PageHeader';
import LoadingSpinner from '@client/src/components/LoadingSpinner';
import ErrorState from '@client/src/components/ErrorState';
import StickerPagination from '@client/src/components/StickerPagination';

const LiteraturePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [posts, setPosts] = useState<PagedResponse<LiteraturePost> | null>(null);
  const [tags, setTags] = useState<LiteratureTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [tagId, setTagId] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const pageSize = 6;

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params: { page: number; pageSize: number; tagId?: string; keyword?: string } = { page, pageSize };
    if (tagId) params.tagId = tagId;
    if (keyword) params.keyword = keyword;
    getPosts(params)
      .then((res) => {
        if (!cancelled) setPosts(res);
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
  }, [page, tagId, keyword]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleTagClick = (id: string) => {
    setTagId(tagId === id ? '' : id);
    setPage(1);
  };

  return (
     <div className="min-h-screen bg-cream py-8 md:py-12 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        <PageHeader title="文学鉴赏" subtitle="一起品读好文字 📚" icon="📖" />

        <form onSubmit={handleSearch} className="max-w-md mx-auto mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索标题、作者..."
              className="flex-1 px-4 py-2 rounded-full border-2 border-cocoa/10 bg-paper focus:border-shiba focus:outline-none text-cocoa"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-shiba text-paper rounded-full font-handwriting text-lg shadow-sm hover:shadow-md transition"
            >
              🔍
            </button>
          </div>
        </form>

        {tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button
              onClick={() => handleTagClick('')}
              className={`px-4 py-1.5 rounded-full font-handwriting text-base transition-all ${
                !tagId
                  ? 'bg-shiba text-paper shadow-sm'
                  : 'bg-paper text-cocoa/70 border-2 border-cocoa/10 hover:border-shiba'
              }`}
            >
              全部
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagClick(tag.id)}
                className={`px-4 py-1.5 rounded-full font-handwriting text-base transition-all ${
                  tagId === tag.id
                    ? 'shadow-sm text-paper'
                    : 'bg-paper text-cocoa/70 border-2 border-cocoa/10 hover:border-shiba'
                }`}
                style={tagId === tag.id ? { backgroundColor: tag.color } : {}}
              >
                # {tag.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end mb-6">
          <button
            onClick={() => {
              if (!isAuthenticated) {
                toast('请先登录后再投稿 ✨', {
                  description: '登录后即可发布你的推文',
                  action: {
                    label: '去登录',
                    onClick: () => navigate('/login'),
                  },
                });
                return;
              }
              navigate('/literature/post');
            }}
            className="px-6 py-2 bg-mint text-ink rounded-full font-handwriting text-lg shadow-sm hover:shadow-md transition card-wobble"
          >
            ✍️ 我要投稿
          </button>
        </div>

        {loading && <LoadingSpinner text="正在整理文章..." />}
        {error && <ErrorState message={error} />}

        {!loading && !error && posts && (
          <>
            {posts.items.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📝</div>
                <p className="font-handwriting text-2xl text-cocoa/60">还没有相关文章呢～</p>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.items.map((post, idx) => {
                  const tapeColor = idx % 2 === 0 ? 'bg-tape-pink' : 'bg-tape-blue';
                  return (
                    <article
                      key={post.id}
                      onClick={() => navigate(`/literature/${post.id}`)}
                       className={`relative bg-paper rounded-xl shadow-md p-4 sm:p-6 cursor-pointer card-wobble transition-transform hover:shadow-lg ${idx % 2 === 0 ? '-rotate-0.5' : 'rotate-0.5'}`}
                    >
                      <div className={`absolute -top-3 left-8 w-20 h-6 ${tapeColor} opacity-70 -rotate-6 shadow-sm`} />

                       <h2 className="font-handwriting text-xl sm:text-2xl md:text-3xl text-ink mb-2">
                        {post.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-cocoa/60 mb-3">
                        <span>✍️ {post.author}</span>
                        {post.sourcePlatform && <span>📍 {post.sourcePlatform}</span>}
                        <span>📅 {new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>

                      {post.recommendationReason && (
                        <div className="bg-mint/20 rounded-lg p-3 mb-3 -rotate-0.5">
                          <p className="text-sm text-cocoa/80 line-clamp-2">
                            <span className="font-handwriting text-base text-ink">推荐理由：</span>
                            {post.recommendationReason}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag.id}
                            className="px-2.5 py-0.5 rounded-full text-xs font-handwriting text-paper"
                            style={{ backgroundColor: tag.color }}
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>

                      <div className="text-right">
                        <span className="font-handwriting text-shiba text-lg">阅读全文 →</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <StickerPagination
              page={posts.page}
              total={posts.total}
              pageSize={posts.pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default LiteraturePage;
