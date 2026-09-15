import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { getAxiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { useAuthStore } from '@client/src/store/auth.store';

if (typeof window !== 'undefined') {
  try {
    const axios = getAxiosForBackend();
    if (axios?.defaults?.baseURL && axios.defaults.baseURL !== '/') {
      logger.log({
        level: 'info',
        args: ['[vercel] correcting axios baseURL', axios.defaults.baseURL, '->', '/'],
        meta: { type: 'vercel-runtime' },
      });
      axios.defaults.baseURL = '/';
    }
  } catch (e) {
    logger.error('[vercel] failed to correct axios baseURL', e);
  }
}

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import HomePage from './pages/Home/HomePage';
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Register/RegisterPage';
import DiaryPage from './pages/Diary/DiaryPage';
import DiaryDetailPage from './pages/Diary/DiaryDetailPage';
import PostDailyFicsPage from './pages/Diary/PostDailyFicsPage';
import DiaryManagePage from './pages/admin/DiaryManage';
import CalendarPage from './pages/Calendar/CalendarPage';
import CollectionPage from './pages/Collection/CollectionPage';
import GuestbookPage from './pages/Guestbook/GuestbookPage';
import LiteraturePage from './pages/Literature/LiteraturePage';
import LiteratureDetailPage from './pages/Literature/LiteratureDetailPage';
import PostLiteraturePage from './pages/Literature/PostLiteraturePage';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import CalendarManage from './pages/admin/CalendarManage';
import CollectionManage from './pages/admin/CollectionManage';
import GuestbookManage from './pages/admin/GuestbookManage';
import LiteratureManage from './pages/admin/LiteratureManage';
import CommentManage from './pages/admin/CommentManage';
import TagManage from './pages/admin/TagManage';
import UserManage from './pages/admin/UserManage';
import ApplicationManage from './pages/admin/ApplicationManage';
import AccountSettingsPage from './pages/Settings/AccountSettingsPage';

const PLATFORM_BADGE_KEYWORDS = [
  'miaoda',
  'suda',
  'lark-apaas',
  'platform-badge',
  'powered-by',
  'watermark',
  'floating-btn',
  'doubao',
  '妙搭',
  '豆包',
];

function removePlatformBadges(): void {
  if (typeof document === 'undefined') return;

  const allElements = document.querySelectorAll('*');

  allElements.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;

    const customElement = el.getAttribute('data-custom-element') || '';
    const id = el.id.toLowerCase();
    const className = (el.className || '').toString().toLowerCase();
    const ariaLabel = el.getAttribute('aria-label') || '';
    const style = el.getAttribute('style') || '';
    const href = el.getAttribute('href') || '';

    const matchesKeyword = PLATFORM_BADGE_KEYWORDS.some(
      (kw) =>
        customElement.toLowerCase().includes(kw) ||
        id.includes(kw) ||
        className.includes(kw) ||
        ariaLabel.toLowerCase().includes(kw) ||
        href.toLowerCase().includes(kw),
    );

    const isFixedBottomRight =
      style.includes('position: fixed') &&
      (style.includes('bottom:') || style.includes('bottom ')) &&
      (style.includes('right:') || style.includes('right '));

    if (matchesKeyword || isFixedBottomRight) {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.opacity = '0';
      el.style.width = '0';
      el.style.height = '0';
      el.style.overflow = 'hidden';
      el.style.pointerEvents = 'none';
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      el.style.top = '-9999px';
      el.style.zIndex = '-1';
    }
  });
}

const RoutesComponent = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    removePlatformBadges();

    const observer = new MutationObserver(() => {
      removePlatformBadges();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'style'],
    });

    const timeoutId = window.setTimeout(removePlatformBadges, 1000);
    const timeoutId2 = window.setTimeout(removePlatformBadges, 3000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeoutId);
      window.clearTimeout(timeoutId2);
    };
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
         <Route path="dailyfics" element={<DiaryPage />} />
         <Route path="dailyfics/:id" element={<DiaryDetailPage />} />
         <Route path="dailyfics/post" element={<PostDailyFicsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="collection" element={<CollectionPage />} />
        <Route path="guestbook" element={<GuestbookPage />} />
        <Route path="literature" element={<LiteraturePage />} />
        <Route path="literature/:id" element={<LiteratureDetailPage />} />
        <Route path="literature/post" element={<PostLiteraturePage />} />
        <Route path="settings" element={<AccountSettingsPage />} />
      </Route>
       <Route path="admin" element={<AdminLayout />}>
         <Route index element={<Dashboard />} />
          <Route path="dailyfics" element={<DiaryManagePage />} />
          <Route path="calendar" element={<CalendarManage />} />
         <Route path="collection" element={<CollectionManage />} />
         <Route path="guestbook" element={<GuestbookManage />} />
         <Route path="literature" element={<LiteratureManage />} />
         <Route path="literature/comments" element={<CommentManage />} />
         <Route path="literature/tags" element={<TagManage />} />
         <Route path="users" element={<UserManage />} />
         <Route path="applications" element={<ApplicationManage />} />
       </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
