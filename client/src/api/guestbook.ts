import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from '@client/src/utils/api-client';
import type {
  GuestbookNote,
  CreateGuestbookNoteRequest,
  PagedResponse,
} from '@shared/api.interface';

interface GuestbookListQuery {
  page?: number;
  pageSize?: number;
  status?: string;
}

export async function getGuestbookNotes(
  params?: GuestbookListQuery,
): Promise<PagedResponse<GuestbookNote>> {
  const res = await apiGet<{ data: PagedResponse<GuestbookNote> }>(
    '/api/guestbook/notes',
    params,
  );
  return res.data;
}

export async function createGuestbookNote(
  data: CreateGuestbookNoteRequest,
): Promise<GuestbookNote> {
  const res = await apiPost<{ data: GuestbookNote }>(
    '/api/guestbook/notes',
    data,
  );
  return res.data;
}

export async function getAdminNotes(
  params?: GuestbookListQuery,
): Promise<PagedResponse<GuestbookNote>> {
  const res = await apiGet<{ data: PagedResponse<GuestbookNote> }>(
    '/api/guestbook/admin',
    params,
  );
  return res.data;
}

export async function approveNote(id: string): Promise<void> {
  await apiPost(`/api/guestbook/admin/${id}/approve`);
}

export async function rejectNote(id: string): Promise<void> {
  await apiPost(`/api/guestbook/admin/${id}/reject`);
}

export async function deleteNote(id: string): Promise<void> {
  await apiDelete(`/api/guestbook/admin/${id}`);
}
