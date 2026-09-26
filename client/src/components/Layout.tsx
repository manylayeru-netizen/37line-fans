import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, User, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '@client/src/store/auth.store';
import { Image } from '@client/src/components/ui/image';
import { useAvatarUrl } from '@client/src/hooks/useAvatarUrl';

// 丝带导航菜单项配置
interface NavItem {
  label: string;
  path: string;
  color: string;
}

 const navItems: NavItem[] = [
   { label: '首页', path: '/', color: '#c09e5e' },
   { label: '每日推文', path: '/dailyfics', color: '#dbb264' },
   { label: '考古日历', path: '/calendar', color: '#a87d4b' },
   { label: '照片集', path: '/collection', color: '#d9cfa9' },
   { label: '留言板', path: '/guestbook', color: '#6B4F3A' },
 ];

 const ribbonOffset = (index: number): number => {
   const offsets = [0, 8, -4, 6, -2];
   return offsets[index % offsets.length];
 };

 const Layout = () => {
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   const { user, isAuthenticated, logout } = useAuthStore();
   const avatarUrl = useAvatarUrl(user?.avatarUrl);
   const navigate = useNavigate();

  const isLoggedIn = isAuthenticated;
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* 丝带导航栏 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-sm border-b border-grid/50">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo / 品牌名 - 桌面端隐藏，丝带导航本身是装饰 */}
            <div className="md:hidden">
               <span className="font-handwriting text-2xl text-ink">37line.fans</span>
            </div>

            {/* 桌面端丝带导航 */}
            <nav className="hidden md:flex items-start justify-center flex-1 gap-1 pt-0">
              {navItems.map((item: NavItem, idx: number) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `ribbon-nav-item ${isActive ? 'active' : ''}`
                  }
                  style={{
                    backgroundColor: item.color,
                     color: item.color === '#d9cfa9' || item.color === '#dbb264'
                       ? '#6B4F3A'
                       : item.color === '#B8D4E3'
                         ? '#6B4F3A'
                         : '#FFFAF0',
                    marginTop: `${ribbonOffset(idx)}px`,
                    borderBottomLeftRadius: '8px',
                    borderBottomRightRadius: '8px',
                    clipPath:
                      'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)',
                    padding: '14px 18px 22px 18px',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease',
                    transformOrigin: 'top center',
                    boxShadow: '0 2px 6px rgba(107, 79, 58, 0.15)',
                  }}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* 用户菜单 / 登录按钮 - 桌面端 */}
            <div className="hidden md:flex items-center gap-3">
              {isLoggedIn ? (
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper hover:bg-paper/80 transition-colors shadow-sm border border-grid">
                   {avatarUrl ? (
                       <Image
                         src={avatarUrl}
                         alt="头像"
                         className="w-7 h-7 rounded-full object-cover"
                       />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-shiba flex items-center justify-center text-white text-sm font-handwriting">
                        <User size={14} />
                      </div>
                    )}
                     <span className="text-cocoa text-sm">{user?.displayName || user?.username || '用户'}</span>
                   </button>
                  <div className="absolute right-0 top-full mt-2 w-40 bg-paper rounded-xl shadow-lg border border-grid py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <button
                      onClick={() => navigate('/settings')}
                      className="w-full text-left px-4 py-2 text-sm text-cocoa hover:bg-cream/50 flex items-center gap-2"
                    >
                      <Settings size={14} />
                      账户设置
                    </button>
                    {isAdmin && (
                       <button
                         onClick={() => navigate('/admin')}
                         className="w-full text-left px-4 py-2 text-sm text-cocoa hover:bg-cream/50 flex items-center gap-2"
                       >
                         <Settings size={14} />
                         管理后台
                       </button>
                     )}
                        <button
                         onClick={handleLogout}
                         className="w-full text-left px-4 py-2 text-sm text-cocoa hover:bg-cream/50 flex items-center gap-2"
                       >
                       <LogOut size={14} />
                       退出登录
                     </button>
                  </div>
                </div>
              ) : (
                <NavLink
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-paper hover:bg-paper/80 transition-colors shadow-sm border border-grid text-sm text-cocoa"
                >
                  <LogIn size={14} />
                  登录
                </NavLink>
              )}
            </div>

            {/* 移动端汉堡按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-paper shadow-sm border border-grid"
              aria-label="菜单"
            >
              {mobileMenuOpen ? <X size={20} className="text-cocoa" /> : <Menu size={20} className="text-cocoa" />}
            </button>
          </div>

          {/* 移动端菜单 */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 pt-2">
              <nav className="flex flex-col gap-2">
                {navItems.map((item: NavItem) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `px-4 py-2.5 rounded-xl font-medium transition-colors ${
                        isActive ? 'ring-2 ring-cocoa/30' : ''
                      }`
                    }
                    style={{
                      backgroundColor: item.color,
                      color:
                        item.color === '#FFF3D6' || item.color === '#A8DADC' ||
                        item.color === '#F8C8DC' || item.color === '#B8D4E3'
                          ? '#6B4F3A'
                          : '#FFFAF0',
                    }}
                  >
                    {item.label}
                  </NavLink>
                ))}
                <div className="pt-2 border-t border-grid/50">
                  {isLoggedIn ? (
                    <>
                       <div className="px-4 py-2 text-cocoa text-sm">{user?.displayName || user?.username || '用户'}</div>
                       <button
                         onClick={() => { setMobileMenuOpen(false); navigate('/settings'); }}
                         className="w-full text-left px-4 py-2 text-sm text-cocoa hover:bg-paper/50 rounded-lg flex items-center gap-2"
                       >
                         <Settings size={14} />
                         账户设置
                       </button>
                       {isAdmin && (
                         <button
                           onClick={() => { setMobileMenuOpen(false); navigate('/admin'); }}
                           className="w-full text-left px-4 py-2 text-sm text-cocoa hover:bg-paper/50 rounded-lg flex items-center gap-2"
                         >
                           <Settings size={14} />
                           管理后台
                         </button>
                       )}
                        <button
                         onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                         className="w-full text-left px-4 py-2 text-sm text-cocoa hover:bg-paper/50 rounded-lg flex items-center gap-2"
                       >
                         <LogOut size={14} />
                         退出登录
                       </button>
                    </>
                  ) : (
                    <NavLink
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center px-4 py-2 bg-paper border border-grid rounded-xl text-cocoa text-sm"
                    >
                      登录 / 注册
                    </NavLink>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* 主内容区 - 为固定导航留出空间 */}
      <main className="flex-1 pt-16">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
          <Outlet />
        </div>
      </main>

      {/* 页脚 */}
       <footer className="bg-paper/60 bg-grid-pattern mt-12">
          <div className="h-auto py-6 flex flex-col items-center justify-center">
            <p className="text-cocoa/60 text-xs max-w-2xl text-center px-4 mb-3 leading-relaxed">
              本站为粉丝自发建立的非营利性应援站点，与艺人及其所属经纪公司无关联。站内图文素材版权归原作者及版权方所有，如涉及侵权请联系我们删除。
            </p>
            <p className="text-cocoa/60 text-sm mb-2">
              © {new Date().getFullYear()} 37line.fans
            </p>
            <p className="font-handwriting text-lg text-ink">
              谢谢你来过 37line 的小世界
            </p>
          </div>
       </footer>
    </div>
  );
};

export default Layout;
//（注：内容由AI生成）
