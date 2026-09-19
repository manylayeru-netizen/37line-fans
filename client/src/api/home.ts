import { apiGet } from '@client/src/utils/api-client';
import type { OnThisDayResponse } from '@shared/api.interface';

export async function getOnThisDay(month?: number, day?: number): Promise<OnThisDayResponse> {
  const res = await apiGet<{ data: OnThisDayResponse }>(
    '/api/home/on-this-day',
    { month, day },
  );
  return res.data;
}
