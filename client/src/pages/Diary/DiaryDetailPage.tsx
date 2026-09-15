import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DiaryEntry } from '@shared/api.interface';
import { getDiaryDetail } from '@client/src/api/diary';
import LoadingSpinner from '@client/src/components/LoadingSpinner';
import ErrorState from '@client/src/components/ErrorState';

const formatFullDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
};

const DiaryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDiaryDetail(id)
      .then((res) => {
        if (!cancelled) setEntry(res);
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

  return (
    <div className="min-h-screen bg-cream py-12 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/dailyfics')}
          className="mb-8 inline-flex items-center gap-2 px-5 py-2 bg-paper rounded-full shadow-sm border-2 border-cocoa/10 font-handwriting text-lg text-cocoa hover:border-shiba hover:bg-shiba/10 transition card-wobble"
        >
          ← 返回日记列表
        </button>

        {loading && <LoadingSpinner text="正在翻开日记本..." />}
        {error && <ErrorState message={error} />}

        {!loading && !error && entry && (
          <article className="relative bg-paper rounded-xl shadow-lg p-8 md:p-12">
            <div className="absolute -top-3 left-10 w-24 h-6 bg-tape-pink opacity-70 -rotate-6 shadow-sm" />
            <div className="absolute -top-2 right-12 w-20 h-5 bg-tape-blue opacity-70 rotate-6 shadow-sm" />

             <header className="text-center mb-8 pb-8 border-b-2 border-dashed border-grid">
               <p className="font-handwriting text-xl text-cocoa/70 mb-2">{formatFullDate(entry.entryDate)}</p>
               <h1 className="font-handwriting text-4xl md:text-5xl text-ink mb-4">{entry.title}</h1>
               <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-cocoa/60">
                 {entry.author && <span>✍️ {entry.author}</span>}
                 {entry.sourcePlatform && <span>📍 {entry.sourcePlatform}</span>}
                 <span
                   className={`px-2.5 py-0.5 rounded-full text-xs font-handwriting ${
                     entry.completionStatus === 'completed'
                       ? 'bg-mint/50 text-ink'
                       : 'bg-tape-pink/50 text-ink'
                   }`}
                 >
                   {entry.completionStatus === 'completed' ? '已完结' : '未完结'}
                 </span>
               </div>
               {entry.contentWarnings && entry.contentWarnings.length > 0 && (
                 <div className="flex flex-wrap gap-2 justify-center mt-3">
                   {entry.contentWarnings.map((w: string) => (
                     <span
                       key={w}
                       className="px-2.5 py-0.5 rounded-full text-xs bg-shiba/20 text-shiba font-handwriting"
                     >
                       ⚠️ {w}
                     </span>
                   ))}
                 </div>
               )}
             </header>

             {entry.characterBackground && (
               <div className="bg-tape-blue/30 rounded-lg p-5 mb-6 rotate-0.5">
                 <h3 className="font-handwriting text-xl text-ink mb-2">🧸 人设背景</h3>
                 <p className="text-cocoa/80 leading-relaxed text-sm whitespace-pre-wrap">
                   {entry.characterBackground}
                 </p>
               </div>
             )}

             {entry.recommendationReason && (
               <div className="bg-mint/30 rounded-lg p-5 mb-6 -rotate-0.5">
                 <h3 className="font-handwriting text-xl text-ink mb-2">💡 推荐理由</h3>
                 <p className="text-cocoa/80 leading-relaxed text-sm whitespace-pre-wrap">
                   {entry.recommendationReason}
                 </p>
               </div>
             )}

              <div className="font-handwriting text-lg md:text-xl leading-loose text-cocoa/90 whitespace-pre-wrap">
                {entry.content}
              </div>

             <div className="absolute -bottom-2 left-1/3 w-16 h-4 bg-mint opacity-60 rotate-3 rounded-sm" />
          </article>
        )}
      </div>
    </div>
  );
};

export default DiaryDetailPage;
