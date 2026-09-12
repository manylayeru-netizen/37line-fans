import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export function getToken(): string | null {
  return localStorage.getItem('37line_token');
}

export function setToken(token: string): void {
  localStorage.setItem('37line_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('37line_token');
}

export function authRequest(config: any): Promise<any> {
  const token = getToken();
  const headers = { ...(config.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return axiosForBackend({ ...config, headers });
}

export async function apiGet<T>(url: string, params?: any): Promise<T> {
  try {
    const response = await authRequest({ url, method: 'GET', params });
    return response.data;
  } catch (error) {
    logger.error('API GET 失败', url, error);
    throw error;
  }
}

export async function apiPost<T>(url: string, data?: any): Promise<T> {
  try {
    const response = await authRequest({ url, method: 'POST', data });
    return response.data;
  } catch (error) {
    logger.error('API POST 失败', url, error);
    throw error;
  }
}

export async function apiPut<T>(url: string, data?: any): Promise<T> {
  try {
    const response = await authRequest({ url, method: 'PUT', data });
    return response.data;
  } catch (error) {
    logger.error('API PUT 失败', url, error);
    throw error;
  }
}

export async function apiPatch<T>(url: string, data?: any): Promise<T> {
  try {
    const response = await authRequest({ url, method: 'PATCH', data });
    return response.data;
  } catch (error) {
    logger.error('API PATCH 失败', url, error);
    throw error;
  }
}

export async function apiDelete<T>(url: string): Promise<T> {
  try {
    const response = await authRequest({ url, method: 'DELETE' });
    return response.data;
  } catch (error) {
    logger.error('API DELETE 失败', url, error);
    throw error;
  }
}
