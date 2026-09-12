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
  await apiPatch(`/api/admin/applications/${id}/review`, data);
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

export async function getStats(): Promise<Record<string, number>> {
  const res = await apiGet<{ data: Record<string, number> }>(
    '/api/admin/stats',
  );
  return res.data;
}
