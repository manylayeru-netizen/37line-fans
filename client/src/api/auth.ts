import {
  apiGet,
  apiPost,
  apiPatch,
} from '@client/src/utils/api-client';
import type {
   LoginResponse,
   RegisterRequest,
   SiteUser,
   UpdateDisplayNameRequest,
 } from '@shared/api.interface';

export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const res = await apiPost<{ data: LoginResponse }>('/api/auth/login', {
    username,
    password,
  });
  return res.data;
}

export async function register(data: RegisterRequest): Promise<void> {
  await apiPost('/api/auth/register', data);
}

export async function getCurrentUser(): Promise<SiteUser> {
  const res = await apiGet<{ data: SiteUser }>('/api/auth/me');
  return res.data;
}

export async function changePassword(
   oldPassword: string,
   newPassword: string,
 ): Promise<void> {
   await apiPatch('/api/auth/change-password', {
     oldPassword,
     newPassword,
   });
 }

export async function updateDisplayName(displayName: string): Promise<SiteUser> {
  const body: UpdateDisplayNameRequest = { displayName };
  const res = await apiPatch<{ data: SiteUser }>('/api/auth/display-name', body);
  return res.data;
}
