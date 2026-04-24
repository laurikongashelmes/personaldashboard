'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { WeatherData, TempPoint } from '@/types';

interface Props {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
}

interface ChartEntry {
  hour: number;
  pastTemp?: number;
  futureTemp?: number;
}

function getTallinnHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      hourCycle: 'h23',
      timeZone: 'Europe/Tallinn',
    }).format(new Date()),
    10,
  );
}

function toChartEntries(dailyChart: TempPoint[], currentHour: number): ChartEntry[] {
  return dailyChart.map(({ hour, temp }) => ({
    hour,
    pastTemp: hour <= currentHour ? temp : undefined,
    futureTemp: hour >= currentHour ? temp : undefined,
  }));
}

export default function WeatherSection({ data, loading, error }: Props) {
  const currentTallinnHour = getTallinnHour();

  const chartEntries = useMemo(
    () => (data ? toChartEntries(data.dailyChart, currentTallinnHour) : []),
    [data, currentTallinnHour],
  );

  const nextSlotTime = useMemo(() => {
    if (!data) return null;
    const next = data.hourly.find(slot => {
      const h = parseInt(slot.time.split(':')[0], 10);
      return h > currentTallinnHour || (h === 0 && currentTallinnHour >= 18);
    });
    return next?.time ?? null;
  }, [data, currentTallinnHour]);

  return (
    <section>
      <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
        Ilm · Tallinn
      </h2>
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-28 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-gray-200 rounded flex-1" />)}
          </div>
          <div className="h-px bg-gray-200 my-4" />
          <div className="h-[72px] bg-gray-200 rounded" />
        </div>
      ) : error || !data ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-red-400">{error ?? 'Pole saadaval'}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-4xl font-bold text-gray-900 mb-1">
            {data.current.temp}°C {data.current.emoji}
          </p>
          <p className="text-sm text-gray-500 mb-4">{data.current.description}</p>
          {data.hourly.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mb-4">
              {data.hourly.map(slot => {
                const isNext = slot.time === nextSlotTime;
                return (
                  <div
                    key={slot.time}
                    className={`flex flex-col items-center rounded-lg px-3 py-2 min-w-14 ${
                      isNext ? 'bg-indigo-50' : 'bg-gray-50'
                    }`}
                  >
                    <span className={`text-xs mb-1 ${isNext ? 'text-indigo-500 font-semibold' : 'text-gray-400'}`}>
                      {slot.time}
                    </span>
                    <span className="text-lg">{slot.emoji}</span>
                    <span className={`text-sm font-semibold ${isNext ? 'text-indigo-600' : 'text-gray-700'}`}>
                      {slot.temp}°
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {chartEntries.length > 0 && (
            <>
              <div className="h-px bg-gray-100 mb-3" />
              <p className="text-[9px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
                Temperatuur täna
              </p>
              <ResponsiveContainer width="100%" height={72} minWidth={0}>
                <AreaChart data={chartEntries} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="wPastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.10} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="wFutureGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="hour"
                    ticks={[0, 6, 12, 18]}
                    tickFormatter={h => String(h).padStart(2, '0')}
                    tick={{ fontSize: 9, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip
                    formatter={(value) => [`${Number(value)}°C`, 'Temperatuur']}
                    labelFormatter={(hour) => `${String(Number(hour)).padStart(2, '0')}:00`}
                  />
                  <ReferenceLine
                    x={currentTallinnHour}
                    stroke="#6366f1"
                    strokeDasharray="3 2"
                    strokeOpacity={0.7}
                  />
                  <Area
                    type="monotone"
                    dataKey="pastTemp"
                    stroke="#a5b4fc"
                    strokeWidth={1.8}
                    fill="url(#wPastGrad)"
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="futureTemp"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#wFutureGrad)"
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}
    </section>
  );
}
