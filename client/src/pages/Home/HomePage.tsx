import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  Image as ImageIcon,
  StickyNote,
  Sun as SunIcon,
   Heart,
   Crown,
} from 'lucide-react';
import { Cloud, Sun, Star, WashiTape, PolaroidFrame } from '@client/src/components/ui/handdrawn';
import { getDiaryLatest } from '@client/src/api/diary';
import { getCollectionFeatured } from '@client/src/api/collection';
import { getGuestbookNotes } from '@client/src/api/guestbook';
import type { DiaryEntry } from '@shared/api.interface';
import type { CollectionCard } from '@shared/api.interface';
import type { GuestbookNote } from '@shared/api.interface';

interface EntryCardData {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  tapeColor: 'pink' | 'blue' | 'mint' | 'shiba';
  tapeRotation: number;
}

const entryCards: EntryCardData[] = [
  {
     title: 'DailyFics',
     description: '叮！今日份好文推荐已送达',
    path: '/dailyfics',
    icon: <BookOpen size={36} />,
    tapeColor: 'shiba',
    tapeRotation: -4,
  },
  {
     title: '考古日历',
     description: '重要的日子都记在这里',
    path: '/calendar',
    icon: <Calendar size={36} />,
    tapeColor: 'blue',
    tapeRotation: 3,
  },
  {
     title: '照片集',
     description: '让人心动的那些MisanaMoments',
    path: '/collection',
    icon: <ImageIcon size={36} />,
    tapeColor: 'pink',
    tapeRotation: -2,
  },
  {
    title: '留言板',
    description: '留下你的小纸条吧',
    path: '/guestbook',
    icon: <StickyNote size={36} />,
    tapeColor: 'mint',
    tapeRotation: 5,
  },
];

const upcomingDates: { date: string; title: string; isCrown: boolean }[] = [];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [latestDiaries, setLatestDiaries] = useState<DiaryEntry[]>([]);
  const [collectionHighlights, setCollectionHighlights] = useState<CollectionCard[]>([]);
  const [guestbookNotes, setGuestbookNotes] = useState<GuestbookNote[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadHomeData(): Promise<void> {
      try {
        const [diaries, featured, notes] = await Promise.all([
          getDiaryLatest().catch(() => [] as DiaryEntry[]),
          getCollectionFeatured().catch(() => [] as CollectionCard[]),
          getGuestbookNotes({ page: 1, pageSize: 6 })
            .then((res) => res.items)
            .catch(() => [] as GuestbookNote[]),
        ]);
        if (cancelled) return;
        setLatestDiaries(Array.isArray(diaries) ? diaries.slice(0, 3) : []);
        setCollectionHighlights(Array.isArray(featured) ? featured.slice(0, 4) : []);
        setGuestbookNotes(Array.isArray(notes) ? notes : []);
      } catch {
        if (cancelled) return;
        setLatestDiaries([]);
        setCollectionHighlights([]);
        setGuestbookNotes([]);
      }
    }

    void loadHomeData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative">
      {/* ========== Hero 区域 ========== */}
      <section className="relative min-h-[60vh] flex flex-col items-center justify-center overflow-hidden bg-cream bg-grid-pattern/40 rounded-3xl -mx-4 md:-mx-6 px-4 md:px-6 py-12 md:py-16">
        {/* 装饰：云朵和太阳 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute top-6 right-8 md:top-10 md:right-16"
        >
          <Sun size={70} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="absolute top-16 left-6 md:top-20 md:left-16"
        >
          <Cloud size={90} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="absolute top-28 right-20 md:top-32 md:right-32"
        >
          <Cloud size={60} />
        </motion.div>

        {/* 装饰贴纸 */}
        <div className="absolute top-24 left-1/4 hidden md:block">
          <Star size={20} color="#F4A261" />
        </div>
        <div className="absolute top-40 right-1/3 hidden md:block">
          <Star size={16} color="#A8DADC" />
        </div>
        <div className="absolute bottom-32 left-16 hidden md:block">
          <Heart size={20} fill="#F8C8DC" color="#F4A261" strokeWidth={1.5} />
        </div>

        {/* 胶带装饰 */}
        <WashiTape
          color="pink"
          pattern="dots"
          rotation={-8}
          width={120}
          className="top-4 left-10 hidden md:block"
        />
        <WashiTape
          color="mint"
          pattern="stripes"
          rotation={6}
          width={90}
          className="bottom-8 right-16 hidden md:block"
        />

        {/* 主标题 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center z-10 relative mt-16 md:mt-20"
        >
          <h1 className="font-handwriting text-3xl sm:text-4xl text-ink leading-none mb-4 relative inline-block">
             37lineの小世界
             <span className="absolute top-2 -left-12 hidden md:block">
               <Star size={22} color="#F4A261" />
             </span>
             <span className="absolute bottom-3 -right-12 hidden md:block">
               <Heart size={18} className="text-tape-pink" fill="currentColor" />
             </span>
           </h1>
           <p className="font-mono tracking-widest text-xs sm:text-sm md:text-base text-cocoa/70 mb-8 uppercase">
             ALL ABOUT MINA &amp; SANA
           </p>

        </motion.div>
      </section>

      <div id="home-content" />

      {/* ========== 四个入口卡片区 ========== */}
      <section className="mt-12 md:mt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {entryCards.map((card: EntryCardData, idx: number) => (
            <motion.div
              key={card.path}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ rotate: card.tapeRotation > 0 ? -1 : 1, transition: { duration: 0.2 } }}
              onClick={() => navigate(card.path)}
               className="card-wobble relative bg-paper rounded-2xl p-5 sm:p-6 md:p-8 shadow cursor-pointer hover:shadow-md transition-shadow group"
            >
              {/* 顶部胶带 */}
              <WashiTape
                color={card.tapeColor}
                pattern="dots"
                rotation={card.tapeRotation}
                width={90}
                className="left-1/2 -translate-x-1/2 -top-3"
              />

               <div className="flex items-start gap-3 sm:gap-4 pt-2">
                 <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-cream flex items-center justify-center text-cocoa group-hover:text-shiba transition-colors">
                   {card.icon}
                 </div>
                 <div className="flex-1 min-w-0">
                   <h3 className="font-handwriting text-xl sm:text-2xl text-ink mb-1">{card.title}</h3>
                  <p className="text-cocoa/70 text-sm">{card.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ========== 最新推文预览区 ========== */}
      <section className="mt-12 md:mt-16">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
           <SunIcon size={20} className="text-shiba sm:size-6" />
            <h2 className="font-handwriting text-2xl sm:text-3xl text-ink">最新推文</h2>
          <div className="flex-1 h-0.5 bg-grid/50 ml-2" />
          <button
            onClick={() => navigate('/dailyfics')}
            className="text-penguin text-sm hover:underline"
          >
            查看全部 →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {latestDiaries.length === 0 ? (
            <div className="col-span-full text-center py-10 bg-paper/50 rounded-xl border-2 border-dashed border-grid">
              <p className="font-handwriting text-xl text-cocoa/50">暂无推文，敬请期待～</p>
            </div>
          ) : (
            latestDiaries.map((diary: DiaryEntry, idx: number) => (
              <motion.div
                key={diary.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                onClick={() => navigate(`/dailyfics/${diary.id}`)}
                className="bg-paper rounded-xl p-4 sm:p-5 shadow-sm hover:shadow transition-shadow cursor-pointer card-wobble relative"
              >
                 <div className="flex items-center gap-2 mb-2 text-sm text-cocoa/60">
                   <span className="font-mono">{diary.entryDate}</span>
                 </div>
                <h3 className="font-handwriting text-xl text-ink mb-2">{diary.title}</h3>
                <p className="text-cocoa/80 text-sm leading-relaxed line-clamp-3">
                  {diary.content.length > 100 ? `${diary.content.slice(0, 100)}…` : diary.content}
                </p>
                <WashiTape
                  color={idx % 2 === 0 ? 'pink' : 'blue'}
                  pattern="stripes"
                  rotation={idx % 2 === 0 ? -4 : 4}
                  width={50}
                  className="-top-2 right-4"
                  style={{ height: 18 }}
                />
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* ========== 即将到来的纪念日 ========== */}
      <section className="mt-12 md:mt-16">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
           <Calendar size={20} className="text-penguin sm:size-6" />
          <h2 className="font-handwriting text-2xl sm:text-3xl text-ink">那年今日</h2>
           <div className="flex-1 h-0.5 bg-grid/50 ml-2" />
        </div>

        <div className="flex flex-wrap gap-4 md:gap-6">
          {upcomingDates.length === 0 ? (
            <div className="w-full text-center py-8 bg-paper/50 rounded-xl border-2 border-dashed border-grid">
              <p className="font-handwriting text-xl text-cocoa/50">还没有标记重要日期哦～</p>
            </div>
          ) : (
            upcomingDates.map((item, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="bg-paper rounded-xl p-5 shadow-sm text-center min-w-[110px] relative card-wobble"
              >
                {item.isCrown && (
                  <Crown
                    size={22}
                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-shiba"
                    fill="#F4A261"
                  />
                )}
                <div className="font-handwriting text-3xl text-shiba mb-1">{item.date}</div>
                <div className="text-cocoa/80 text-sm">{item.title}</div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* ========== 收集册精选 ========== */}
      <section className="mt-12 md:mt-16">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
           <ImageIcon size={20} className="text-mint sm:size-6" />
            <h2 className="font-handwriting text-2xl sm:text-3xl text-ink">最新合照</h2>
          <div className="flex-1 h-0.5 bg-grid/50 ml-2" />
          <button
            onClick={() => navigate('/collection')}
            className="text-penguin text-sm hover:underline"
          >
             全部 →
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 py-2 sm:py-4">
          {collectionHighlights.length === 0 ? (
            <div className="w-full text-center py-12 bg-paper/30 rounded-xl border-2 border-dashed border-grid/70">
              <p className="font-handwriting text-xl text-cocoa/50">还没有照片哦，上传后会在这里展示～</p>
            </div>
          ) : (
            collectionHighlights.map((item: CollectionCard, idx: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="flex-shrink-0"
              >
                <PolaroidFrame title={item.title} rotation={item.rotationDegree}>
                   <div
                     className="w-28 h-32 sm:w-36 sm:h-44 md:w-40 md:h-48 bg-gradient-to-br from-cream to-mint/30 flex items-center justify-center"
                     style={{
                       backgroundImage: `url(${item.imageUrl})`,
                       backgroundSize: 'cover',
                       backgroundPosition: 'center',
                     }}
                   />
                </PolaroidFrame>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* ========== 留言板入口 ========== */}
      <section className="mt-12 md:mt-16">
        <div className="bg-corkboard rounded-2xl p-6 md:p-8 relative shadow-inner">
           <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
             <StickyNote size={20} className="text-cream sm:size-6" />
             <h2 className="font-handwriting text-2xl sm:text-3xl text-paper">留言板</h2>
          </div>

           <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 mb-6">
            {guestbookNotes.length === 0 ? (
              <div className="w-full text-center py-10 bg-paper/20 rounded-xl border-2 border-dashed border-paper/40">
                <p className="font-handwriting text-xl text-paper/70">还没有留言呢，来写第一张吧～</p>
              </div>
            ) : (
              guestbookNotes.map((note: GuestbookNote, idx: number) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, rotate: idx % 2 === 0 ? -5 : 5 }}
                  whileInView={{ opacity: 1, rotate: idx % 2 === 0 ? -3 : 3 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.15 }}
                   className="w-[calc(50%-0.5rem)] sm:w-36 min-h-[90px] p-3 sm:p-4 rounded-sm shadow-lg relative card-wobble"
                  style={{
                    backgroundColor: note.noteColor,
                    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-penguin shadow-md border border-cocoa/30" />
                   <p className="font-handwriting text-ink text-sm sm:text-base leading-snug line-clamp-3">{note.content}</p>
                  <p className="text-cocoa/60 text-xs mt-2 text-right">— {note.authorName}</p>
                </motion.div>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/guestbook')}
              className="px-6 py-2.5 bg-shiba text-white rounded-full font-handwriting text-lg shadow-md hover:shadow-lg transition-shadow inline-flex items-center gap-2"
            >
              <StickyNote size={18} />
              去写一张
            </motion.button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
