import { useState, useEffect } from 'react';
import type { NordPoolChartData, NordPoolRange } from '../types';

export interface UseNordPoolChartDataResult {
  data: NordPoolChartData | null;
  loading: boolean;
  error: string | null;
}

export function useNordPoolChartData(range: NordPoolRange): UseNordPoolChartDataResult {
  const [data, setData] = useState<NordPoolChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/nordpool-chart?range=${range}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<NordPoolChartData>;
      })
      .then(d => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error('[useNordPoolChartData] fetch failed:', err);
          setError('Andmed pole saadaval');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  return { data, loading, error };
}
