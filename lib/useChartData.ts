import { useState, useEffect } from 'react';
import type { ChartPoint, ChartRange } from '../types';

export interface UseChartDataResult {
  points: ChartPoint[];
  loading: boolean;
  error: string | null;
}

export function useChartData(symbol: string, range: ChartRange): UseChartDataResult {
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/charts?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ points: ChartPoint[] }>;
      })
      .then(data => {
        if (!cancelled) {
          setPoints(data.points);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Andmed pole saadaval');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  return { points, loading, error };
}
