import { apiGet } from '@client/src/utils/api-client';
import type { OnThisDayResponse, ReviewSettings } from '@shared/api.interface';

export async function getOnThisDay(month?: number, day?: number): Promise<OnThisDayResponse> {
  const res = await apiGet<{ data: OnThisDayResponse }>(
    '/api/home/on-this-day',
    { month, day },
  );
  return res.data;
}

export async function getReviewSettings(): Promise<ReviewSettings> {
  const res = await apiGet<{ data: ReviewSettings }>(
    '/api/home/review-settings',
  );
  return res.data;
}
