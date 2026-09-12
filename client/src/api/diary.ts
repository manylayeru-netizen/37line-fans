import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
} from '@client/src/utils/api-client';
import type {
  DiaryEntry,
  DiaryListQuery,
  PagedResponse,
} from '@shared/api.interface';

export async function getDiaryList(
  params?: DiaryListQuery,
): Promise<PagedResponse<DiaryEntry>> {
  const res = await apiGet<{ data: PagedResponse<DiaryEntry> }>(
    '/api/dailyfics',
    params,
  );
  return res.data;
}

export async function getDiaryLatest(): Promise<DiaryEntry[]> {
  const res = await apiGet<{ data: DiaryEntry[] }>('/api/dailyfics/latest');
  return res.data;
}

export async function getDiaryDetail(id: string): Promise<DiaryEntry> {
  const res = await apiGet<{ data: DiaryEntry }>(`/api/dailyfics/${id}`);
  return res.data;
}

export async function createDiary(
  data: Partial<DiaryEntry>,
): Promise<DiaryEntry> {
  const res = await apiPost<{ data: DiaryEntry }>('/api/dailyfics', data);
  return res.data;
}

export async function submitDiary(
  data: { title: string; content: string; weather?: string; entryDate: string },
): Promise<DiaryEntry> {
  const res = await apiPost<{ data: DiaryEntry }>('/api/dailyfics/submit', data);
  return res.data;
}

export async function updateDiary(
  id: string,
  data: Partial<DiaryEntry>,
): Promise<DiaryEntry> {
  const res = await apiPut<{ data: DiaryEntry }>(`/api/dailyfics/${id}`, data);
  return res.data;
}

export async function deleteDiary(id: string): Promise<void> {
  await apiDelete(`/api/dailyfics/${id}`);
}

export async function updateDiaryStatus(
  id: string,
  status: DiaryEntry['status'],
): Promise<void> {
  await apiPatch(`/api/dailyfics/${id}/status`, { status });
}
