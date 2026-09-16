import { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  MessageCircle,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@client/src/api';

interface DashboardProps {
  // no props needed
}

interface StatCardConfig {
  label: string;
  key: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  iconBg: string;
  tapeColor: string;
}

const Dashboard: React.FC<DashboardProps> = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await adminApi.getStats();
        setStats(data);
      } catch {
        // silently ignore, dashboard still renders
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const statCards: StatCardConfig[] = [
    {
      label: '用户总数',
      key: 'totalUsers',
      icon: Users,
      color: 'text-shiba',
      iconBg: 'bg-shiba/20',
      tapeColor: 'bg-shiba',
    },
    {
      label: '待审核注册',
      key: 'pendingApplications',
      icon: UserPlus,
      color: 'text-penguin',
      iconBg: 'bg-penguin/20',
      tapeColor: 'bg-penguin',
    },
    {
      label: '待审核留言',
      key: 'pendingGuestbookCount',
      icon: MessageCircle,
      color: 'text-tape-pink',
      iconBg: 'bg-tape-pink/40',
      tapeColor: 'bg-tape-pink',
    },
    {
      label: '已发布推文',
      key: 'publishedLiteratureCount',
      icon: FileText,
      color: 'text-tape-blue',
      iconBg: 'bg-tape-blue/40',
      tapeColor: 'bg-tape-blue',
    },
    {
      label: '待审核推文',
      key: 'pendingLiteratureCount',
      icon: Clock,
      color: 'text-shiba',
      iconBg: 'bg-shiba/20',
      tapeColor: 'bg-shiba/70',
    },
  ];

  const quickActions = [
    {
      label: '审核注册申请',
      desc: '处理新用户注册',
      path: '/admin/applications',
      color: 'bg-penguin text-white',
      icon: UserPlus,
    },
    {
      label: '审核留言板',
      desc: '查看待审留言',
      path: '/admin/guestbook',
      color: 'bg-tape-pink text-cocoa',
      icon: MessageCircle,
    },
    {
      label: '审核推文',
      desc: '处理投稿审核',
      path: '/admin/literature',
      color: 'bg-shiba text-white',
      icon: FileText,
    },
  ];

  return (
    <div className="pb-8">
      {/* Welcome */}
      <div className="relative mb-10">
        <div className="inline-block relative">
             <h2
               className="text-2xl sm:text-3xl md:text-4xl text-ink"
               style={{ fontFamily: 'var(--font-handwriting)' }}
             >
            欢迎回来，站长～ ✨
          </h2>
          <div className="mt-1 h-1 w-full bg-gradient-to-r from-shiba via-tape-pink to-tape-blue rounded-full opacity-60" />
        </div>
        <Sparkles
          size={28}
          className="absolute -top-2 left-[12em] text-shiba"
          style={{ transform: 'rotate(15deg)' }}
        />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="relative bg-paper rounded-2xl p-6 shadow-md card-wobble border-2 border-dashed border-grid"
          >
            {/* Tape */}
            <div
              className={`absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 ${card.tapeColor} opacity-70 rounded-sm`}
              style={{ transform: 'translateX(-50%) rotate(-2deg)' }}
            />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-cocoa/70 mb-2">{card.label}</p>
                <p
                  className="text-4xl font-bold text-ink"
                  style={{ fontFamily: 'var(--font-handwriting)' }}
                >
                  {loading ? '—' : stats[card.key] ?? 0}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl ${card.iconBg} ${card.color} flex items-center justify-center shadow-sm`}
              >
                <card.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-paper rounded-2xl p-6 shadow-md border-2 border-dashed border-grid relative">
        <div
          className="absolute -top-3 left-8 w-20 h-5 bg-shiba/70 opacity-70 rounded-sm"
          style={{ transform: 'rotate(-2deg)' }}
        />
        <h3
          className="text-2xl text-ink mb-5"
          style={{ fontFamily: 'var(--font-handwriting)' }}
        >
          🚀 快捷操作
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`group flex items-center justify-between p-5 rounded-xl ${action.color} shadow-sm hover:shadow-md transition-all card-wobble text-left`}
            >
              <div className="flex items-center gap-3">
                <action.icon size={22} />
                <div>
                  <p className="font-medium">{action.label}</p>
                  <p className="text-xs opacity-70">{action.desc}</p>
                </div>
              </div>
              <ArrowRight
                size={18}
                className="opacity-70 group-hover:translate-x-1 transition-transform"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
