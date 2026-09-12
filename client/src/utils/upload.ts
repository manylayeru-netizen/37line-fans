import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export async function uploadImage(
  file: File,
  type: 'avatar' | 'collection' = 'avatar',
): Promise<string> {
  const endpoint =
    type === 'avatar' ? '/api/upload/avatar' : '/api/upload/collection';

  const token = localStorage.getItem('37line_token');

  const response = await axiosForBackend.post(endpoint, file, {
    headers: {
      'Content-Type': file.type,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = response.data as { code: number; data?: { url: string }; message?: string };

  if (data.code !== 0 || !data.data?.url) {
    throw new Error(data.message || '上传失败');
  }

  return data.data.url;
}
