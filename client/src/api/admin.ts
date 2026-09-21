import {
  apiGet,
  apiPost,
  apiPatch,
} from '@client/src/utils/api-client';
import type {
  RegisterApplication,
  ReviewApplicationRequest,
  SiteUser,
  PagedResponse,
  AdminStats,
  ReviewSettings,
  UpdateReviewSettingsRequest,
} from '@shared/api.interface';

interface AdminListQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  role?: string;
  keyword?: string;
}

export async function getApplications(
  params?: AdminListQuery,
): Promise<PagedResponse<RegisterApplication>> {
  const res = await apiGet<{ data: PagedResponse<RegisterApplication> }>(
    '/api/admin/applications',
    params,
  );
  return res.data;
}

export async function reviewApplication(
  id: string,
  data: ReviewApplicationRequest,
): Promise<void> {
  await apiPost(`/api/admin/applications/${id}/review`, data);
}

export async function getUsers(
  params?: AdminListQuery,
): Promise<PagedResponse<SiteUser>> {
  const res = await apiGet<{ data: PagedResponse<SiteUser> }>(
    '/api/admin/users',
    params,
  );
  return res.data;
}

export async function updateUserRole(
  id: string,
  role: SiteUser['role'],
): Promise<void> {
  await apiPatch(`/api/admin/users/${id}/role`, { role });
}

export async function updateUserStatus(
  id: string,
  status: SiteUser['status'],
): Promise<void> {
  await apiPatch(`/api/admin/users/${id}/status`, { status });
}

export async function resetUserPassword(
  id: string,
): Promise<{ newPassword: string }> {
  const res = await apiPost<{ data: { newPassword: string } }>(
    `/api/admin/users/${id}/reset-password`,
  );
  return res.data;
}

export async function getStats(): Promise<AdminStats> {
  const res = await apiGet<{ data: AdminStats }>('/api/admin/stats');
  return res.data;
}

export async function getReviewSettings(): Promise<ReviewSettings> {
  const res = await apiGet<{ data: ReviewSettings }>(
    '/api/admin/review-settings',
  );
  return res.data;
}

export async function updateReviewSettings(
  body: UpdateReviewSettingsRequest,
): Promise<ReviewSettings> {
  const res = await apiPatch<{ data: ReviewSettings }>(
    '/api/admin/review-settings',
    body,
  );
  return res.data;
}
