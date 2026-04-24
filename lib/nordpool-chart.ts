import type { NordPoolRange, NordPoolChartData, NordPoolCurrentData, NordPoolHistoryData, ChartPoint } from '../types';

const ELERING_API = 'https://dashboard.elering.ee/api/nps/price';

interface EleringEntry {
  timestamp: number; // seconds
  price: number;
}

function getTallinnOffset(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Tallinn',
    timeZoneName: 'shortOffset',
  }).formatToParts(date);
  const tzStr = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+3';
  const match = tzStr.match(/GMT([+-])(\d+)/);
  if (!match) return '+03:00';
  return `${match[1]}${String(Number(match[2])).padStart(2, '0')}:00`;
}

function getTallinnDateStr(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Tallinn' });
}

async function fetchEleringRange(start: string, end: string): Promise<EleringEntry[]> {
  const url = `${ELERING_API}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Elering API error: ${res.status}`);
  const json = await res.json();
  if (!json?.success || !Array.isArray(json?.data?.ee)) return [];
  return json.data.ee as EleringEntry[];
}

function avgEntries(entries: EleringEntry[]): number {
  if (entries.length === 0) return 0;
  const sum = entries.reduce((s, e) => s + e.price, 0);
  return Math.round((sum / entries.length) * 10) / 10;
}

function groupByTallinnDay(entries: EleringEntry[]): Map<string, EleringEntry[]> {
  const map = new Map<string, EleringEntry[]>();
  for (const entry of entries) {
    const key = getTallinnDateStr(new Date(entry.timestamp * 1000));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return map;
}

async function fetchCurrentData(now: Date): Promise<NordPoolCurrentData> {
  const todayStr = getTallinnDateStr(now);
  const todayOffset = getTallinnOffset(now);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = getTallinnDateStr(tomorrow);
  const tomorrowOffset = getTallinnOffset(tomorrow);

  const todayEntries = await fetchEleringRange(
    `${todayStr}T00:00:00${todayOffset}`,
    `${todayStr}T23:59:59${todayOffset}`,
  );

  let tomorrowEntries: EleringEntry[] = [];
  try {
    tomorrowEntries = await fetchEleringRange(
      `${tomorrowStr}T00:00:00${tomorrowOffset}`,
      `${tomorrowStr}T23:59:59${tomorrowOffset}`,
    );
  } catch {
    // Tomorrow not yet available — not an error
  }

  const allEntries = [...todayEntries, ...tomorrowEntries];
  const points: ChartPoint[] = allEntries.map(e => ({ timestamp: e.timestamp * 1000, price: e.price }));

  const nowMs = now.getTime();
  const idx = points.findIndex(p => p.timestamp <= nowMs && nowMs < p.timestamp + 3600 * 1000);
  const currentHourIndex = Math.max(0, idx);

  return {
    points,
    hasTomorrow: tomorrowEntries.length > 0,
    currentHourIndex,
    currentHourPrice: idx >= 0 ? points[idx].price : null,
    todayAvgPrice: avgEntries(todayEntries),
  };
}

async function fetchHistoryData(range: '7D' | '1M' | '1Y', now: Date): Promise<NordPoolHistoryData> {
  const daysBack = range === '7D' ? 7 : range === '1M' ? 30 : 364;
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const startStr = getTallinnDateStr(startDate);
  const startOffset = getTallinnOffset(startDate);
  const endStr = getTallinnDateStr(now);
  const endOffset = getTallinnOffset(now);

  const entries = await fetchEleringRange(
    `${startStr}T00:00:00${startOffset}`,
    `${endStr}T23:59:59${endOffset}`,
  );

  const byDay = groupByTallinnDay(entries);
  const sortedDays = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));

  let dailyPoints: ChartPoint[] = sortedDays.map(([dateStr, dayEntries]) => ({
    timestamp: new Date(`${dateStr}T12:00:00Z`).getTime(),
    price: avgEntries(dayEntries),
  }));

  if (range === '1Y') {
    const weeks: ChartPoint[] = [];
    for (let i = 0; i < dailyPoints.length; i += 7) {
      const week = dailyPoints.slice(i, i + 7);
      const weekAvg = Math.round((week.reduce((s, p) => s + p.price, 0) / week.length) * 10) / 10;
      weeks.push({ timestamp: week[0].timestamp, price: weekAvg });
    }
    dailyPoints = weeks;
  }

  return { points: dailyPoints };
}

export async function fetchNordPoolChartData(range: NordPoolRange, now = new Date()): Promise<NordPoolChartData> {
  if (range === 'CURRENT') return fetchCurrentData(now);
  return fetchHistoryData(range, now);
}
