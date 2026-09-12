import {
  BookOpen,
  Calendar,
  Images,
  MessageSquare,
  FileText,
  Users,
  UserPlus,
  LayoutDashboard,
  LogOut,
  Tags,
  MessageCircle,
  BookMarked,
  Home,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@client/src/store/auth.store';

interface AdminLayoutProps {
  // no props needed
}

const AdminLayout: React.FC<AdminLayoutProps> = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/admin', label: '仪表盘', icon: LayoutDashboard, end: true },
    { path: '/admin/dailyfics', label: '每日推文', icon: BookMarked },
    { path: '/admin/calendar', label: '日历管理', icon: Calendar },
    { path: '/admin/collection', label: '照片集管理', icon: Images },
    { path: '/admin/guestbook', label: '留言审核', icon: MessageSquare },
    {
      path: '/admin/literature',
      label: '推文管理',
      icon: FileText,
      children: [
         { path: '/admin/literature', label: '推文审核', icon: FileText },
        { path: '/admin/literature/comments', label: '评论管理', icon: MessageCircle },
        { path: '/admin/literature/tags', label: '标签管理', icon: Tags },
      ],
    },
    { path: '/admin/users', label: '用户管理', icon: Users },
    { path: '/admin/applications', label: '注册申请', icon: UserPlus },
  ];

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Sidebar */}
      <aside className="w-64 bg-paper border-r-2 border-dashed border-grid p-6 flex flex-col">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-handwriting text-ink mb-1"
            style={{ fontFamily: 'var(--font-handwriting)' }}
          >
            37line
          </h1>
          <p className="text-xs text-cocoa/60 font-handwriting">后台管理手帐</p>
          <div className="mt-3 h-1 w-16 mx-auto bg-shiba/30 rounded-full" />
        </div>

        {/* Menu */}
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => (
            <div key={item.path}>
              <NavLink
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-shiba text-white shadow-md'
                      : 'text-cocoa hover:bg-shiba/10 hover:text-shiba'
                  }`
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            </div>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t-2 border-dashed border-grid pt-4 mt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-mint flex items-center justify-center text-cocoa font-bold">
              {user?.displayName?.[0] || user?.username?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-cocoa truncate">
                {user?.displayName || user?.username}
              </p>
              <p className="text-xs text-cocoa/60">管理员</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-cocoa/70 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
          >
            <LogOut size={16} />
            退出登录
          </button>
          <Link
            to="/"
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-cocoa/70 hover:bg-shiba/10 hover:text-shiba rounded-xl transition-colors"
          >
            <Home size={16} />
            返回首页
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
