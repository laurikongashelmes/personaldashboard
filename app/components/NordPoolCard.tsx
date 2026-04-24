'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { LabelProps } from 'recharts';
import { useNordPoolChartData } from '@/lib/useNordPoolChartData';
import type { NordPoolRange } from '@/types';

const RANGES: NordPoolRange[] = ['CURRENT', '7D', '1M', '1Y'];
const STORAGE_KEY = 'chart-range-nordpool-ee';

function getBarFill(index: number, currentHourIndex: number, hasTomorrow: boolean): string {
  if (index === currentHourIndex) return '#6366f1';
  if (hasTomorrow && index >= 24) return '#e0e7ff';
  return '#c7d2fe';
}

export default function NordPoolCard() {
  const [selectedRange, setSelectedRange] = useState<NordPoolRange>('CURRENT');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (RANGES as string[]).includes(stored)) {
        setSelectedRange(stored as NordPoolRange);
      }
    } catch {}
  }, []);

  function handleRangeChange(range: NordPoolRange) {
    try { localStorage.setItem(STORAGE_KEY, range); } catch {}
    setSelectedRange(range);
  }

  const { data, loading, error } = useNordPoolChartData(selectedRange);

  const isCurrentView = data != null && 'currentHourIndex' in data;

  const barData = useMemo(() => {
    if (!data) return [];
    if (isCurrentView && 'currentHourIndex' in data) {
      return data.points.map((p, i) => ({
        ...p,
        fill: getBarFill(i, data.currentHourIndex, data.hasTomorrow),
      }));
    }
    return data.points.map(p => ({ ...p, fill: '#c7d2fe' }));
  }, [data, isCurrentView]);

  let mainStat = '—';
  if (data) {
    if ('currentHourIndex' in data) {
      mainStat = data.currentHourPrice != null
        ? `${data.currentHourPrice.toFixed(1)} €/MWh`
        : '—';
    } else if (data.points.length > 0) {
      const last = data.points[data.points.length - 1];
      mainStat = `${last.price.toFixed(1)} €/MWh`;
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-2">
      <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Nord Pool EE</p>

      <div className="h-[72px]">
        {!mounted || loading ? (
          <div
            data-testid="nordpool-chart-skeleton"
            className="h-full rounded bg-gray-100 animate-pulse"
          />
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 0, height: 72 }}>
            <BarChart data={barData} margin={{ top: 12, right: 4, bottom: 0, left: 4 }} barCategoryGap="10%">
              <XAxis dataKey="timestamp" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as { timestamp: number; price: number };
                  const label = isCurrentView
                    ? new Date(point.timestamp).toLocaleTimeString('et-EE', {
                        timeZone: 'Europe/Tallinn',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })
                    : new Date(point.timestamp).toLocaleDateString('et-EE', {
                        day: 'numeric',
                        month: 'short',
                      });
                  return (
                    <div className="bg-white border border-gray-200 rounded px-2 py-1 text-xs shadow-sm">
                      <p className="text-gray-500">{label}</p>
                      <p className="font-semibold text-gray-900">{point.price.toFixed(1)} €/MWh</p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="price"
                radius={[2, 2, 0, 0]}
                label={(props: LabelProps) => {
                  const { x, y, width, index } = props as LabelProps & { x: number; y: number; width: number; index: number };
                  if (!data || !('currentHourIndex' in data) || index !== data.currentHourIndex) {
                    return null;
                  }
                  return (
                    <text
                      x={(x ?? 0) + (width ?? 0) / 2}
                      y={(y ?? 0) - 4}
                      textAnchor="middle"
                      fontSize={8}
                      fill="#6366f1"
                      fontWeight={700}
                    >
                      now
                    </text>
                  );
                }}
              >
                {barData.map((entry) => (
                  <Cell key={entry.timestamp} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{mainStat}</span>
      </div>

      <div className="flex gap-1">
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => handleRangeChange(r)}
            aria-pressed={selectedRange === r}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              selectedRange === r
                ? 'bg-indigo-500 text-white font-semibold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
