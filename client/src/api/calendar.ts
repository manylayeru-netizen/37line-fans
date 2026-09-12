import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from '@client/src/utils/api-client';
import type { CalendarEvent } from '@shared/api.interface';

export async function getCalendarList(year?: number): Promise<CalendarEvent[]> {
  const res = await apiGet<{ data: CalendarEvent[] }>('/api/calendar', {
    year,
  });
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
  const res = await apiPut<{ data: CalendarEvent }>(
    `/api/calendar/${id}`,
    data,
  );
  return res.data;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await apiDelete(`/api/calendar/${id}`);
}
