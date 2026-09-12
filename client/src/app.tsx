import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';

import { useAuthStore } from '@client/src/store/auth.store';

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

const RoutesComponent = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
