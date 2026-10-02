'use client';

import * as React from 'react';
import { api, ApiError } from '@/lib/api';

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  /** true on the first load and while re-fetching */
  loading: boolean;
  reload: () => void;
}

/**
 * Fetches a GET endpoint and re-fetches whenever `path` changes.
 * Previous data stays visible while a new request is in flight, so charts
 * don't flash empty when switching ranges.
 */
export function useApi<T>(path: string): UseApiResult<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    api<T>(path, { signal: controller.signal })
      .then((result) => setData(result))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : 'Could not load data. Check that the server is running.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [path, reloadKey]);

  const reload = React.useCallback(() => setReloadKey((k) => k + 1), []);

  return { data, error, loading, reload };
}
