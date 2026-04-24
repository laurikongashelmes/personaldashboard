'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartData } from '@/lib/useChartData';
import type { ChartRange, ChartPoint } from '@/types';

interface TickerCardProps {
  label: string;
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  formatValue: (price: number) => string;
}

const RANGES: ChartRange[] = ['1D', '7D', '1M', '1Y'];

function formatChange(
  change: number,
  changePercent: number,
): { text: string; colorClass: string } {
  const arrow = change >= 0 ? '▲' : '▼';
  const sign = changePercent >= 0 ? '+' : '−';
  const abs = Math.abs(changePercent).toFixed(2);
  return {
    text: `${arrow} ${sign}${abs}%`,
    colorClass: change >= 0 ? 'text-green-600' : 'text-red-500',
  };
}

export default function TickerCard({
  label,
  symbol,
  price,
  change,
  changePercent,
  formatValue,
}: TickerCardProps) {
  const storageKey = `chart-range-${symbol}`;
  const [selectedRange, setSelectedRange] = useState<ChartRange>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && (['1D', '7D', '1M', '1Y'] as string[]).includes(stored)) {
        return stored as ChartRange;
      }
    } catch {}
    return '7D';
  });

  function handleRangeChange(range: ChartRange) {
    try { localStorage.setItem(storageKey, range); } catch {}
    setSelectedRange(range);
  }
  const { points, loading, error } = useChartData(symbol, selectedRange);

  const chartColor = (changePercent ?? 0) >= 0 ? '#6366f1' : '#dc2626';
  const gradientId = `chart-${symbol.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-2">
      <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">{label}</p>

      <div className="h-[72px]">
        {loading ? (
          <div
            data-testid="chart-skeleton"
            className="h-full rounded bg-gray-100 animate-pulse"
          />
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="timestamp" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as ChartPoint;
                  return (
                    <div className="bg-white border border-gray-200 rounded px-2 py-1 text-xs shadow-sm">
                      <p className="text-gray-500">
                        {new Date(point.timestamp).toLocaleDateString('et-EE', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                      <p className="font-semibold text-gray-900">{formatValue(point.price)}</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                fill={`url(#${gradientId})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">
          {price != null ? formatValue(price) : '—'}
        </span>
        {price != null && change != null && changePercent != null && (() => {
          const { text, colorClass } = formatChange(change, changePercent);
          return (
            <span className={`text-sm font-medium ${colorClass}`}>{text}</span>
          );
        })()}
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
