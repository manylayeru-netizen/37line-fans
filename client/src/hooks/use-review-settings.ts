import { useState, useEffect } from 'react';
import { homeApi } from '@client/src/api';
import type { ReviewSettings } from '@shared/api.interface';

const cache: { data: ReviewSettings | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

const CACHE_TTL = 5 * 60 * 1000;

export function useReviewSettings() {
  const [settings, setSettings] = useState<ReviewSettings | null>(cache.data);
  const [loading, setLoading] = useState<boolean>(!cache.data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = Date.now();
    if (cache.data && now - cache.timestamp < CACHE_TTL) {
      setSettings(cache.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    homeApi
      .getReviewSettings()
      .then((data) => {
        cache.data = data;
        cache.timestamp = Date.now();
        setSettings(data);
        setError(null);
      })
      .catch(() => {
        setError('加载审核设置失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const tweetReviewEnabled = settings?.diaryEnabled ?? true;

  return { settings, loading, error, tweetReviewEnabled };
}
