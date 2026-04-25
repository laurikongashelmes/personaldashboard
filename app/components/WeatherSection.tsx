'use client';

import { useState, useMemo, useId } from 'react';
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
  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow'>('today');
  const currentTallinnHour = getTallinnHour();
  const uid = useId();
  const pastGradId = `wPastGrad-${uid}`;
  const futureGradId = `wFutureGrad-${uid}`;

  const isTomorrow = selectedDay === 'tomorrow';
  const activeHourly = data ? (isTomorrow ? data.tomorrow.hourly : data.hourly) : [];
  const activeDailyChart = data ? (isTomorrow ? data.tomorrow.dailyChart : data.dailyChart) : [];

  const chartEntries = useMemo(
    () =>
      isTomorrow
        ? activeDailyChart.map(({ hour, temp }) => ({ hour, futureTemp: temp }))
        : toChartEntries(activeDailyChart, currentTallinnHour),
    [activeDailyChart, isTomorrow, currentTallinnHour],
  );

  const nextSlotTime = useMemo(() => {
    if (!data) return null;
    if (isTomorrow) return activeHourly[0]?.time ?? null;
    const next = data.hourly.find(slot => {
      const h = parseInt(slot.time.split(':')[0], 10);
      return h > currentTallinnHour;
    });
    return next?.time ?? null;
  }, [data, isTomorrow, activeHourly, currentTallinnHour]);

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
          <div className="h-[120px] bg-gray-200 rounded" />
        </div>
      ) : error || !data ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-red-400">{error ?? 'Pole saadaval'}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          {isTomorrow ? (
            <>
              <p className="text-4xl font-bold text-gray-900 mb-1">Homne prognoos</p>
              <p className="text-sm text-gray-500 mb-4">&nbsp;</p>
            </>
          ) : (
            <>
              <p className="text-4xl font-bold text-gray-900 mb-1">
                {data.current.temp}°C {data.current.emoji}
              </p>
              <p className="text-sm text-gray-500 mb-4">{data.current.description}</p>
            </>
          )}
          {activeHourly.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mb-4">
              {activeHourly.map(slot => {
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
                {isTomorrow ? 'Temperatuur homme' : 'Temperatuur täna'}
              </p>
              <ResponsiveContainer width="100%" height={120} minWidth={0}>
                <AreaChart data={chartEntries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={pastGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.10} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id={futureGradId} x1="0" y1="0" x2="0" y2="1">
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
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 9, fill: '#9ca3af' }}
                    tickFormatter={v => `${v}°`}
                    width={28}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value)}°C`, 'Temperatuur']}
                    labelFormatter={(hour) => `${String(Number(hour)).padStart(2, '0')}:00`}
                    contentStyle={{ fontSize: 10, padding: '2px 6px', lineHeight: '1.4' }}
                    labelStyle={{ fontSize: 10, marginBottom: 1 }}
                    itemStyle={{ fontSize: 10, padding: 0 }}
                  />
                  {!isTomorrow && (
                    <ReferenceLine
                      x={currentTallinnHour}
                      stroke="#6366f1"
                      strokeDasharray="3 2"
                      strokeOpacity={0.7}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="pastTemp"
                    stroke="#a5b4fc"
                    strokeWidth={1.8}
                    fill={`url(#${pastGradId})`}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="futureTemp"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill={`url(#${futureGradId})`}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
          <div className="flex gap-1 mt-3">
            {(['today', 'tomorrow'] as const).map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                aria-pressed={selectedDay === day}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  selectedDay === day
                    ? 'bg-indigo-500 text-white font-semibold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {day === 'today' ? 'Täna' : 'Homme'}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
