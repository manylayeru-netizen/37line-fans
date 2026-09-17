import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { DiaryEntry, PagedResponse } from '@shared/api.interface';
import { getDiaryList } from '@client/src/api/diary';
import { useAuthStore } from '@client/src/store/auth.store';
import PageHeader from '@client/src/components/PageHeader';
import LoadingSpinner from '@client/src/components/LoadingSpinner';
import ErrorState from '@client/src/components/ErrorState';
import StickerPagination from '@client/src/components/StickerPagination';

const formatDate = (dateStr: string): { day: string; month: string; year: string } => {
  const d = new Date(dateStr);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: `${d.getMonth() + 1}月`,
    year: `${d.getFullYear()}`,
  };
};

const DiaryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [data, setData] = useState<PagedResponse<DiaryEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDiaryList({ page, pageSize })
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

  return (
     <div className="min-h-screen bg-cream py-8 md:py-12 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        <PageHeader title="每日推文" subtitle="邂逅一篇好文 📖" icon="📓" />

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
              navigate('/dailyfics/post');
            }}
            className="px-6 py-2 bg-mint text-ink rounded-full font-handwriting text-lg shadow-sm hover:shadow-md transition card-wobble"
          >
            ✍️ 我要投稿
          </button>
        </div>

        {loading && <LoadingSpinner text="正在翻开日记本..." />}
        {error && <ErrorState message={error} />}

        {!loading && !error && data && (
          <>
            {data.items.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📝</div>
                <p className="font-handwriting text-2xl text-cocoa/60">还没有推文呢～</p>
              </div>
            ) : (
              <div className="space-y-8">
                {data.items.map((entry, idx) => {
                  const date = formatDate(entry.entryDate);
                  const tapeColor = idx % 2 === 0 ? 'bg-tape-pink' : 'bg-tape-blue';
                  const rotateClass = idx % 2 === 0 ? '-rotate-1' : 'rotate-1';
                  return (
                    <article
                      key={entry.id}
                      onClick={() => navigate(`/dailyfics/${entry.id}`)}
                       className={`relative bg-paper rounded-xl shadow-md p-4 sm:p-6 md:p-8 cursor-pointer card-wobble transition-transform ${rotateClass} hover:shadow-lg`}
                    >
                      <div className={`absolute -top-3 left-8 w-20 h-6 ${tapeColor} opacity-70 -rotate-6 shadow-sm`} />
                       <div className="flex items-start gap-3 sm:gap-6">
                         <div className="flex-shrink-0 text-center min-w-[56px] sm:min-w-[72px]">
                           <div className="font-handwriting text-3xl sm:text-5xl text-shiba leading-none">{date.day}</div>
                           <div className="text-xs sm:text-sm text-cocoa/70 mt-1">{date.month}</div>
                            <div className="text-xs text-cocoa/50">{date.year}</div>
                          </div>
                          <div className="flex-1 min-w-0 border-l-2 border-dashed border-grid pl-3 sm:pl-6">
                           <h2 className="font-handwriting text-xl sm:text-2xl md:text-3xl text-ink mb-2">
                             {entry.title}
                           </h2>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-cocoa/60 mb-3">
                              {entry.author && <span>✍️ {entry.author}</span>}
                              {entry.submitterName && <span>📮 投稿：{entry.submitterName}</span>}
                              {entry.sourcePlatform && <span>📍 {entry.sourcePlatform}</span>}
                             <span
                               className={`px-2 py-0.5 rounded-full text-xs font-handwriting ${
                                 entry.completionStatus === 'completed'
                                   ? 'bg-mint/50 text-ink'
                                   : 'bg-tape-pink/50 text-ink'
                               }`}
                             >
                               {entry.completionStatus === 'completed' ? '已完结' : '未完结'}
                             </span>
                           </div>
                           {entry.contentWarnings && entry.contentWarnings.length > 0 && (
                             <div className="flex flex-wrap gap-2 mb-3">
                               {entry.contentWarnings.map((w: string) => (
                                 <span
                                   key={w}
                                   className="px-2 py-0.5 rounded-full text-xs bg-shiba/20 text-shiba font-handwriting"
                                 >
                                   ⚠️ {w}
                                 </span>
                               ))}
                             </div>
                           )}
                           {entry.recommendationReason && (
                             <div className="bg-mint/20 rounded-lg p-3 mb-3 -rotate-0.5">
                               <p className="text-sm text-cocoa/80 line-clamp-2">
                                 <span className="font-handwriting text-base text-ink">推荐理由：</span>
                                 {entry.recommendationReason}
                               </p>
                             </div>
                           )}
                           <p className="text-cocoa/80 leading-relaxed line-clamp-3 text-sm md:text-base">
                             {entry.content}
                           </p>
                           <div className="mt-4 flex justify-end">
                            <span className="font-handwriting text-shiba hover:text-penguin transition-colors text-lg">
                              阅读更多 →
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <StickerPagination
              page={data.page}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DiaryPage;
