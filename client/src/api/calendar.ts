import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from '@client/src/utils/api-client';
import type {
  CalendarEvent,
  PagedResponse,
} from '@shared/api.interface';

export async function getCalendarList(params: {
  year?: number;
  page?: number;
  pageSize?: number;
} = {}): Promise<PagedResponse<CalendarEvent>> {
  const res = await apiGet<{ data: PagedResponse<CalendarEvent> }>(
    '/api/calendar',
    params,
  );
  return res.data;
}

export async function getAdminCalendarList(params: {
  year?: number;
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<PagedResponse<CalendarEvent>> {
  const res = await apiGet<{ data: PagedResponse<CalendarEvent> }>(
    '/api/calendar/admin/events',
    params,
  );
  return res.data;
}

export async function reviewCalendarEvent(
  id: string,
  status: 'published' | 'rejected',
): Promise<CalendarEvent> {
  const res = await apiPost<{ data: CalendarEvent }>(
    `/api/calendar/admin/events/${id}/review`,
    { status },
  );
  return res.data;
}

export async function getUpcomingEvents(): Promise<CalendarEvent[]> {
  const res = await apiGet<{ data: CalendarEvent[] }>(
    '/api/calendar/upcoming',
  );
  return res.data;
}

export async function createCalendarEvent(
  data: Partial<CalendarEvent>,
): Promise<CalendarEvent> {
  const res = await apiPost<{ data: CalendarEvent }>('/api/calendar', data);
  return res.data;
}

export async function updateCalendarEvent(
  id: string,
  data: Partial<CalendarEvent>,
): Promise<CalendarEvent> {
  const res = await apiPatch<{ data: CalendarEvent }>(
    `/api/calendar/admin/events/${id}`,
    data,
  );
  return res.data;
}

export async function getCalendarEventById(id: string): Promise<CalendarEvent> {
  const res = await apiGet<{ data: CalendarEvent }>(`/api/calendar/${id}`);
  return res.data;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await apiDelete(`/api/calendar/admin/events/${id}`);
}
