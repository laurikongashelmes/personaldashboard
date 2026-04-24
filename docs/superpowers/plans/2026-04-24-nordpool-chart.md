# Nord Pool Electricity Price Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-contained `NordPoolCard` bar-chart component to the Energia section, replacing the two plain Nord Pool widgets, with CURRENT / 7D / 1M / 1Y range selection backed by the Elering API.

**Architecture:** A new `/api/nordpool-chart` route fetches from the Elering API and returns typed hourly (CURRENT) or aggregated (7D/1M/1Y) data. A `useNordPoolChartData` hook calls that route. `NordPoolCard` uses the hook and renders a Recharts `BarChart` — CURRENT shows today's + tomorrow's hourly bars (if available) with the current hour highlighted; historical ranges show daily or weekly averages. `EnergySection` is updated to render Brent + `NordPoolCard`; the old Nord Pool stat pipeline (`lib/nordpool.ts`, `computeNordPoolStats`, `NordPoolStats` type, the Elering fetch in `lib/energy.ts`) is deleted.

**Tech Stack:** Next.js 15 App Router, TypeScript, Recharts (`BarChart`, `Bar`, `Cell`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`), Elering API (`https://dashboard.elering.ee/api/nps/price`), Jest + React Testing Library.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `types.ts` | Add `NordPoolRange`, `NordPoolCurrentData`, `NordPoolHistoryData`, `NordPoolChartData`; remove `NordPoolStats`; update `EnergyData` |
| Create | `lib/nordpool-chart.ts` | Elering API fetching, timezone helpers, data aggregation |
| Create | `lib/__tests__/nordpool-chart.test.ts` | Unit tests for `lib/nordpool-chart.ts` |
| Create | `app/api/nordpool-chart/route.ts` | API route — validates `range`, calls `fetchNordPoolChartData`, returns JSON |
| Create | `lib/useNordPoolChartData.ts` | React hook — fetches `/api/nordpool-chart?range=…`, returns `{ data, loading, error }` |
| Create | `lib/__tests__/useNordPoolChartData.test.tsx` | Hook tests |
| Create | `app/components/NordPoolCard.tsx` | Self-contained chart card component |
| Create | `app/components/__tests__/NordPoolCard.test.tsx` | Component tests |
| Modify | `lib/energy.ts` | Remove Nord Pool Elering fetch; return only Brent |
| Modify | `lib/__tests__/energy.test.ts` | Remove Nord Pool assertions; update mock setup |
| Modify | `app/components/EnergySection.tsx` | Replace two Widget cards with `<NordPoolCard />` |
| Modify | `app/components/__tests__/EnergySection.test.tsx` | Update to new layout |
| Delete | `lib/nordpool.ts` | No longer needed |
| Delete | `lib/__tests__/nordpool.test.ts` | No longer needed |

---

## Task 1: Add Nord Pool chart types to `types.ts`

**Files:**
- Modify: `types.ts`

- [ ] **Step 1: Add new types (additive — no existing tests break)**

Open `types.ts` and add below the existing `ChartData` interface:

```ts
export type NordPoolRange = 'CURRENT' | '7D' | '1M' | '1Y';

export interface NordPoolCurrentData {
  points: ChartPoint[];
  hasTomorrow: boolean;
  currentHourIndex: number;
  currentHourPrice: number | null;
  todayAvgPrice: number;
}

export interface NordPoolHistoryData {
  points: ChartPoint[];
}

export type NordPoolChartData = NordPoolCurrentData | NordPoolHistoryData;
```

Full updated `types.ts` (keep everything else):

```ts
export interface TickerData {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

export interface NordPoolStats {
  avgPrice: number;
  minPrice: number;
  minHour: string;
}

export interface EnergyData {
  brent: TickerData;
  nordPool: NordPoolStats;
}

export interface HourlySlot {
  time: string;
  temp: number;
  description: string;
  emoji: string;
}

export interface WeatherData {
  current: {
    temp: number;
    description: string;
    emoji: string;
  };
  hourly: HourlySlot[];
}

export type ChartRange = '1D' | '7D' | '1M' | '1Y';

export interface ChartPoint {
  timestamp: number;
  price: number;
}

export interface ChartData {
  points: ChartPoint[];
}

export type NordPoolRange = 'CURRENT' | '7D' | '1M' | '1Y';

export interface NordPoolCurrentData {
  points: ChartPoint[];
  hasTomorrow: boolean;
  currentHourIndex: number;
  currentHourPrice: number | null;
  todayAvgPrice: number;
}

export interface NordPoolHistoryData {
  points: ChartPoint[];
}

export type NordPoolChartData = NordPoolCurrentData | NordPoolHistoryData;
```

(Keep `NordPoolStats` and `nordPool: NordPoolStats` in `EnergyData` for now — they are removed in Task 6.)

- [ ] **Step 2: Verify existing tests still pass**

```bash
cd /Users/lauri.kongas/Dev/2304 && npx jest --no-coverage 2>&1 | tail -20
```

Expected: all tests pass (the new types are additive).

- [ ] **Step 3: Commit**

```bash
git add types.ts
git commit -m "types: add NordPoolRange, NordPoolCurrentData, NordPoolHistoryData, NordPoolChartData"
```

---

## Task 2: Implement `lib/nordpool-chart.ts` (TDD)

**Files:**
- Create: `lib/__tests__/nordpool-chart.test.ts`
- Create: `lib/nordpool-chart.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/nordpool-chart.test.ts`:

```ts
// @jest-environment node
import { fetchNordPoolChartData } from '../nordpool-chart';

// NOW = 2024-04-25T12:30:00Z = 15:30 Tallinn (EEST +03:00)
const NOW = new Date('2024-04-25T12:30:00.000Z');

// 2024-04-25 00:00:00 +03:00 = 2024-04-24T21:00:00Z
const TODAY_HOUR_0_UNIX = Math.floor(new Date('2024-04-24T21:00:00.000Z').getTime() / 1000);
// 24 hourly entries, prices 80..103
const TODAY_ENTRIES = Array.from({ length: 24 }, (_, i) => ({
  timestamp: TODAY_HOUR_0_UNIX + i * 3600,
  price: 80 + i,
}));

// 2024-04-26 00:00:00 +03:00 = 2024-04-25T21:00:00Z
const TOMORROW_HOUR_0_UNIX = Math.floor(new Date('2024-04-25T21:00:00.000Z').getTime() / 1000);
const TOMORROW_ENTRIES = Array.from({ length: 24 }, (_, i) => ({
  timestamp: TOMORROW_HOUR_0_UNIX + i * 3600,
  price: 60 + i,
}));

function eleringOk(entries: Array<{ timestamp: number; price: number }>) {
  return { ok: true, json: async () => ({ success: true, data: { ee: entries } }) };
}

beforeEach(() => jest.resetAllMocks());

describe('fetchNordPoolChartData — CURRENT', () => {
  it('returns 48 points and hasTomorrow=true when tomorrow data is available', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(eleringOk(TODAY_ENTRIES))
      .mockResolvedValueOnce(eleringOk(TOMORROW_ENTRIES)) as jest.Mock;

    const result = await fetchNordPoolChartData('CURRENT', NOW);

    expect('currentHourIndex' in result).toBe(true);
    if (!('currentHourIndex' in result)) return;
    expect(result.points).toHaveLength(48);
    expect(result.hasTomorrow).toBe(true);
  });

  it('sets currentHourIndex=15 and currentHourPrice=95 for 15:30 Tallinn', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(eleringOk(TODAY_ENTRIES))
      .mockResolvedValueOnce(eleringOk(TOMORROW_ENTRIES)) as jest.Mock;

    const result = await fetchNordPoolChartData('CURRENT', NOW);

    if (!('currentHourIndex' in result)) throw new Error('expected NordPoolCurrentData');
    // Hour 15 in Tallinn = index 15 in the 00:00-23:00 array
    expect(result.currentHourIndex).toBe(15);
    // price for index 15 = 80 + 15 = 95
    expect(result.currentHourPrice).toBe(95);
  });

  it('computes todayAvgPrice correctly', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(eleringOk(TODAY_ENTRIES))
      .mockResolvedValueOnce(eleringOk(TOMORROW_ENTRIES)) as jest.Mock;

    const result = await fetchNordPoolChartData('CURRENT', NOW);

    if (!('currentHourIndex' in result)) throw new Error('expected NordPoolCurrentData');
    // sum(80..103) = 24*80 + sum(0..23) = 1920+276 = 2196; avg = 2196/24 = 91.5
    expect(result.todayAvgPrice).toBe(91.5);
  });

  it('returns 24 points and hasTomorrow=false when tomorrow fetch returns empty', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(eleringOk(TODAY_ENTRIES))
      .mockResolvedValueOnce(eleringOk([])) as jest.Mock;

    const result = await fetchNordPoolChartData('CURRENT', NOW);

    if (!('currentHourIndex' in result)) throw new Error('expected NordPoolCurrentData');
    expect(result.points).toHaveLength(24);
    expect(result.hasTomorrow).toBe(false);
  });

  it('returns 24 points and hasTomorrow=false when tomorrow fetch throws', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(eleringOk(TODAY_ENTRIES))
      .mockRejectedValueOnce(new Error('Network error')) as jest.Mock;

    const result = await fetchNordPoolChartData('CURRENT', NOW);

    if (!('currentHourIndex' in result)) throw new Error('expected NordPoolCurrentData');
    expect(result.points).toHaveLength(24);
    expect(result.hasTomorrow).toBe(false);
  });

  it('throws when today fetch fails', async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network error')) as jest.Mock;

    await expect(fetchNordPoolChartData('CURRENT', NOW)).rejects.toThrow();
  });

  it('converts Elering seconds timestamps to milliseconds in ChartPoints', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(eleringOk(TODAY_ENTRIES))
      .mockResolvedValueOnce(eleringOk([])) as jest.Mock;

    const result = await fetchNordPoolChartData('CURRENT', NOW);

    if (!('currentHourIndex' in result)) throw new Error('expected NordPoolCurrentData');
    expect(result.points[0].timestamp).toBe(TODAY_HOUR_0_UNIX * 1000);
  });
});

describe('fetchNordPoolChartData — 7D', () => {
  it('returns one ChartPoint per day (daily averages)', async () => {
    // 7 days * 24 entries each = 168 entries, all on different Tallinn days
    const sevenDaysAgo = new Date('2024-04-18T21:00:00.000Z'); // 2024-04-19 00:00 Tallinn
    const weekEntries = Array.from({ length: 7 }, (_, dayIdx) =>
      Array.from({ length: 24 }, (_, hourIdx) => ({
        timestamp: Math.floor(sevenDaysAgo.getTime() / 1000) + dayIdx * 86400 + hourIdx * 3600,
        price: 100 + dayIdx, // same price all 24h each day → avg = 100+dayIdx
      })),
    ).flat();

    global.fetch = jest.fn().mockResolvedValueOnce(eleringOk(weekEntries)) as jest.Mock;

    const result = await fetchNordPoolChartData('7D', NOW);

    expect(!('currentHourIndex' in result)).toBe(true);
    // 7 days of data → 7 daily averages
    expect(result.points).toHaveLength(7);
    expect(result.points[0].price).toBe(100);
    expect(result.points[6].price).toBe(106);
  });
});

describe('fetchNordPoolChartData — 1Y', () => {
  it('groups daily averages into weekly averages', async () => {
    // 14 days (2 weeks) of hourly data
    const twoWeeksAgo = new Date('2024-04-11T21:00:00.000Z'); // 2024-04-12 00:00 Tallinn
    const entries = Array.from({ length: 14 }, (_, dayIdx) =>
      Array.from({ length: 24 }, (_, hourIdx) => ({
        timestamp: Math.floor(twoWeeksAgo.getTime() / 1000) + dayIdx * 86400 + hourIdx * 3600,
        price: 10 * (dayIdx + 1), // day 1 = 10, day 2 = 20, ..., day 14 = 140
      })),
    ).flat();

    global.fetch = jest.fn().mockResolvedValueOnce(eleringOk(entries)) as jest.Mock;

    const result = await fetchNordPoolChartData('1Y', NOW);

    expect(!('currentHourIndex' in result)).toBe(true);
    // 14 days → 2 weeks (7 days each)
    expect(result.points).toHaveLength(2);
    // week 1 avg: (10+20+30+40+50+60+70)/7 = 280/7 = 40
    expect(result.points[0].price).toBe(40);
    // week 2 avg: (80+90+100+110+120+130+140)/7 = 770/7 = 110
    expect(result.points[1].price).toBe(110);
  });
});
```

- [ ] **Step 2: Run tests — expect failure (module not found)**

```bash
cd /Users/lauri.kongas/Dev/2304 && npx jest lib/__tests__/nordpool-chart.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '../nordpool-chart'`

- [ ] **Step 3: Create `lib/nordpool-chart.ts`**

```ts
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
  const currentHourIndex = Math.max(
    0,
    points.findIndex(p => p.timestamp <= nowMs && nowMs < p.timestamp + 3600 * 1000),
  );

  return {
    points,
    hasTomorrow: tomorrowEntries.length > 0,
    currentHourIndex,
    currentHourPrice: points[currentHourIndex]?.price ?? null,
    todayAvgPrice: avgEntries(todayEntries),
  };
}

async function fetchHistoryData(range: '7D' | '1M' | '1Y', now: Date): Promise<NordPoolHistoryData> {
  const daysBack = range === '7D' ? 7 : range === '1M' ? 30 : 365;
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
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd /Users/lauri.kongas/Dev/2304 && npx jest lib/__tests__/nordpool-chart.test.ts --no-coverage 2>&1 | tail -30
```

Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/nordpool-chart.ts lib/__tests__/nordpool-chart.test.ts
git commit -m "feat: add lib/nordpool-chart.ts with Elering data fetching and aggregation"
```

---

## Task 3: Implement `/api/nordpool-chart` route

**Files:**
- Create: `app/api/nordpool-chart/route.ts`

- [ ] **Step 1: Create the route**

```bash
mkdir -p /Users/lauri.kongas/Dev/2304/app/api/nordpool-chart
```

Create `app/api/nordpool-chart/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchNordPoolChartData } from '@/lib/nordpool-chart';
import type { NordPoolRange } from '@/types';

const VALID_RANGES: NordPoolRange[] = ['CURRENT', '7D', '1M', '1Y'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') as NordPoolRange | null;

  if (!range || !VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  try {
    const data = await fetchNordPoolChartData(range);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 503 });
  }
}
```

- [ ] **Step 2: Verify full test suite still passes**

```bash
cd /Users/lauri.kongas/Dev/2304 && npx jest --no-coverage 2>&1 | tail -15
```

Expected: PASS (no existing tests cover this new route).

- [ ] **Step 3: Commit**

```bash
git add app/api/nordpool-chart/route.ts
git commit -m "feat: add /api/nordpool-chart route"
```

---

## Task 4: Implement `lib/useNordPoolChartData.ts` (TDD)

**Files:**
- Create: `lib/__tests__/useNordPoolChartData.test.tsx`
- Create: `lib/useNordPoolChartData.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/useNordPoolChartData.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useNordPoolChartData } from '../useNordPoolChartData';

const MOCK_CURRENT_DATA = {
  points: [{ timestamp: 1714046400000, price: 95 }],
  hasTomorrow: false,
  currentHourIndex: 0,
  currentHourPrice: 95,
  todayAvgPrice: 91.5,
};

beforeEach(() => jest.resetAllMocks());

it('starts with loading=true and data=null', () => {
  global.fetch = jest.fn(() => new Promise(() => {})); // never resolves
  const { result } = renderHook(() => useNordPoolChartData('CURRENT'));
  expect(result.current.loading).toBe(true);
  expect(result.current.data).toBeNull();
  expect(result.current.error).toBeNull();
});

it('populates data on successful fetch', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(MOCK_CURRENT_DATA),
    } as Response),
  );

  const { result } = renderHook(() => useNordPoolChartData('CURRENT'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual(MOCK_CURRENT_DATA);
  expect(result.current.error).toBeNull();
});

it('sets error on HTTP error response', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: false, status: 503 } as Response),
  );

  const { result } = renderHook(() => useNordPoolChartData('CURRENT'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('Andmed pole saadaval');
  expect(result.current.data).toBeNull();
});

it('sets error on network failure', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

  const { result } = renderHook(() => useNordPoolChartData('CURRENT'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('Andmed pole saadaval');
});

it('calls the correct URL', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ points: [] }),
    } as Response),
  );

  const { result } = renderHook(() => useNordPoolChartData('7D'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(global.fetch).toHaveBeenCalledWith('/api/nordpool-chart?range=7D');
});

it('re-fetches when range changes', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ points: [] }),
    } as Response),
  );

  const { result, rerender } = renderHook(
    ({ range }: { range: 'CURRENT' | '7D' }) => useNordPoolChartData(range),
    { initialProps: { range: 'CURRENT' as const } },
  );

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(global.fetch).toHaveBeenCalledTimes(1);

  rerender({ range: '7D' });

  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(global.fetch).toHaveBeenLastCalledWith('/api/nordpool-chart?range=7D');
});
```

- [ ] **Step 2: Run tests — expect failure (module not found)**

```bash
cd /Users/lauri.kongas/Dev/2304 && npx jest lib/__tests__/useNordPoolChartData.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../useNordPoolChartData'`

- [ ] **Step 3: Create `lib/useNordPoolChartData.ts`**

```ts
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
      .catch(() => {
        if (!cancelled) {
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
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd /Users/lauri.kongas/Dev/2304 && npx jest lib/__tests__/useNordPoolChartData.test.tsx --no-coverage 2>&1 | tail -15
```

Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/useNordPoolChartData.ts lib/__tests__/useNordPoolChartData.test.tsx
git commit -m "feat: add useNordPoolChartData hook"
```

---

## Task 5: Implement `NordPoolCard` component (TDD)

**Files:**
- Create: `app/components/__tests__/NordPoolCard.test.tsx`
- Create: `app/components/NordPoolCard.tsx`

- [ ] **Step 1: Write the failing tests**

Create `app/components/__tests__/NordPoolCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NordPoolCard from '../NordPoolCard';

jest.mock('@/lib/useNordPoolChartData');
import { useNordPoolChartData } from '@/lib/useNordPoolChartData';
const mockUseNordPoolChartData = useNordPoolChartData as jest.Mock;

jest.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
}));

const MOCK_CURRENT_DATA = {
  points: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date('2024-04-24T21:00:00.000Z').getTime() + i * 3600 * 1000,
    price: 80 + i,
  })),
  hasTomorrow: false,
  currentHourIndex: 15,
  currentHourPrice: 95,
  todayAvgPrice: 91.5,
};

const MOCK_HISTORY_DATA = {
  points: [
    { timestamp: 1714046400000, price: 88.3 },
    { timestamp: 1714132800000, price: 92.1 },
  ],
};

describe('NordPoolCard', () => {
  beforeEach(() => {
    mockUseNordPoolChartData.mockReturnValue({ data: null, loading: false, error: null });
    localStorage.clear();
  });

  it('renders the label "Nord Pool EE"', () => {
    render(<NordPoolCard />);
    expect(screen.getByText('Nord Pool EE')).toBeInTheDocument();
  });

  it('shows skeleton while loading', () => {
    mockUseNordPoolChartData.mockReturnValue({ data: null, loading: true, error: null });
    const { container } = render(<NordPoolCard />);
    expect(container.querySelector('[data-testid="nordpool-chart-skeleton"]')).toBeInTheDocument();
  });

  it('shows error message when hook returns error', () => {
    mockUseNordPoolChartData.mockReturnValue({ data: null, loading: false, error: 'Andmed pole saadaval' });
    render(<NordPoolCard />);
    expect(screen.getByText('Andmed pole saadaval')).toBeInTheDocument();
  });

  it('renders all four range buttons', () => {
    render(<NordPoolCard />);
    expect(screen.getByRole('button', { name: 'CURRENT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7D' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1M' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1Y' })).toBeInTheDocument();
  });

  it('CURRENT is active by default', () => {
    render(<NordPoolCard />);
    expect(screen.getByRole('button', { name: 'CURRENT' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows current hour price and avg for CURRENT data', () => {
    mockUseNordPoolChartData.mockReturnValue({ data: MOCK_CURRENT_DATA, loading: false, error: null });
    render(<NordPoolCard />);
    expect(screen.getByText(/95\.0 €\/MWh/)).toBeInTheDocument();
    expect(screen.getByText(/avg 91\.5 €\/MWh/)).toBeInTheDocument();
  });

  it('shows last point price for history data', () => {
    mockUseNordPoolChartData.mockReturnValue({ data: MOCK_HISTORY_DATA, loading: false, error: null });
    localStorage.setItem('chart-range-nordpool-ee', '7D');
    render(<NordPoolCard />);
    expect(screen.getByText(/92\.1 €\/MWh/)).toBeInTheDocument();
    expect(screen.getByText(/7D kesk\./)).toBeInTheDocument();
  });

  it('switches active range when a button is clicked', async () => {
    render(<NordPoolCard />);
    await userEvent.click(screen.getByRole('button', { name: '7D' }));
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'CURRENT' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('persists selected range to localStorage on click', async () => {
    render(<NordPoolCard />);
    await userEvent.click(screen.getByRole('button', { name: '1M' }));
    expect(localStorage.getItem('chart-range-nordpool-ee')).toBe('1M');
  });

  it('initialises to stored range from localStorage', () => {
    localStorage.setItem('chart-range-nordpool-ee', '1Y');
    render(<NordPoolCard />);
    expect(screen.getByRole('button', { name: '1Y' })).toHaveAttribute('aria-pressed', 'true');
  });
});
```

- [ ] **Step 2: Run tests — expect failure (module not found)**

```bash
cd /Users/lauri.kongas/Dev/2304 && npx jest app/components/__tests__/NordPoolCard.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../NordPoolCard'`

- [ ] **Step 3: Create `app/components/NordPoolCard.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
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
  const [selectedRange, setSelectedRange] = useState<NordPoolRange>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (RANGES as string[]).includes(stored)) return stored as NordPoolRange;
    } catch {}
    return 'CURRENT';
  });

  function handleRangeChange(range: NordPoolRange) {
    try { localStorage.setItem(STORAGE_KEY, range); } catch {}
    setSelectedRange(range);
  }

  const { data, loading, error } = useNordPoolChartData(selectedRange);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isCurrentView = data != null && 'currentHourIndex' in data;

  const barData = (() => {
    if (!data) return [];
    if (isCurrentView && 'currentHourIndex' in data) {
      return data.points.map((p, i) => ({
        ...p,
        fill: getBarFill(i, data.currentHourIndex, data.hasTomorrow),
      }));
    }
    return data.points.map(p => ({ ...p, fill: '#c7d2fe' }));
  })();

  let mainStat = '—';
  let subStat = '';
  if (data) {
    if ('currentHourIndex' in data) {
      mainStat = data.currentHourPrice != null
        ? `${data.currentHourPrice.toFixed(1)} €/MWh`
        : '—';
      subStat = `avg ${data.todayAvgPrice.toFixed(1)} €/MWh täna`;
    } else if (data.points.length > 0) {
      const last = data.points[data.points.length - 1];
      mainStat = `${last.price.toFixed(1)} €/MWh`;
      subStat = `${selectedRange} kesk.`;
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
                label={({ x, y, width, index }: { x: number; y: number; width: number; index: number }) => {
                  if (!data || !('currentHourIndex' in data) || index !== data.currentHourIndex) {
                    return <></>;
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
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{mainStat}</span>
        {subStat && <span className="text-sm font-medium text-gray-500">{subStat}</span>}
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
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd /Users/lauri.kongas/Dev/2304 && npx jest app/components/__tests__/NordPoolCard.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add app/components/NordPoolCard.tsx app/components/__tests__/NordPoolCard.test.tsx
git commit -m "feat: add NordPoolCard component"
```

---

## Task 6: Remove Nord Pool stats from the energy pipeline

**Files:**
- Modify: `lib/energy.ts`
- Modify: `lib/__tests__/energy.test.ts`
- Modify: `types.ts` (remove `NordPoolStats`, update `EnergyData`)
- Delete: `lib/nordpool.ts`
- Delete: `lib/__tests__/nordpool.test.ts`

- [ ] **Step 1: Simplify `lib/energy.ts`** — remove the Elering fetch and `computeNordPoolStats` call

Replace the full content of `lib/energy.ts`:

```ts
import YahooFinance from 'yahoo-finance2';
import type { EnergyData } from '../types';
import type { QuoteSummaryResult } from 'yahoo-finance2/modules/quoteSummary-iface';

const yahooFinance = new YahooFinance();

export async function fetchEnergy(): Promise<EnergyData> {
  let brent: EnergyData['brent'] = {
    symbol: 'BZ=F',
    label: 'Brent Crude',
    price: null,
    change: null,
    changePercent: null,
  };
  try {
    const summary = await yahooFinance.quoteSummary(
      'BZ=F',
      { modules: ['price'] },
      { validateResult: true },
    ) as QuoteSummaryResult;
    const p = summary.price;
    brent = {
      symbol: 'BZ=F',
      label: 'Brent Crude',
      price: p?.regularMarketPrice ?? null,
      change: p?.regularMarketChange ?? null,
      changePercent: p?.regularMarketChangePercent ?? null,
    };
  } catch {
    // leave nulls
  }
  return { brent };
}
```

- [ ] **Step 2: Update `lib/__tests__/energy.test.ts`** — remove Nord Pool mocking and assertions

Replace the full content of `lib/__tests__/energy.test.ts`:

```ts
// @jest-environment node

jest.mock('yahoo-finance2', () => {
  const mockQuoteSummary = jest.fn();
  const MockClass = jest.fn(() => ({ quoteSummary: mockQuoteSummary }));
  (MockClass as any).__mockQuoteSummary = mockQuoteSummary;
  return { __esModule: true, default: MockClass };
});

import { fetchEnergy } from '../energy';
import YahooFinance from 'yahoo-finance2';

const mockQuoteSummary = (YahooFinance as any).__mockQuoteSummary as jest.Mock;

describe('fetchEnergy', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns brent data on success', async () => {
    mockQuoteSummary.mockResolvedValue({
      price: {
        regularMarketPrice: 75.5,
        regularMarketChange: -1.2,
        regularMarketChangePercent: -1.56,
      },
    });

    const result = await fetchEnergy();

    expect(result.brent.price).toBe(75.5);
    expect(result.brent.change).toBe(-1.2);
    expect(result.brent.changePercent).toBe(-1.56);
    expect(result.brent.symbol).toBe('BZ=F');
  });

  it('returns null brent fields on Yahoo Finance error', async () => {
    mockQuoteSummary.mockRejectedValue(new Error('Yahoo error'));

    const result = await fetchEnergy();

    expect(result.brent.price).toBeNull();
    expect(result.brent.change).toBeNull();
    expect(result.brent.changePercent).toBeNull();
  });
});
```

- [ ] **Step 3: Remove `NordPoolStats` from `types.ts` and update `EnergyData`**

Replace the content of `types.ts` with (removes `NordPoolStats`, removes `nordPool` from `EnergyData`):

```ts
export interface TickerData {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

export interface EnergyData {
  brent: TickerData;
}

export interface HourlySlot {
  time: string;
  temp: number;
  description: string;
  emoji: string;
}

export interface WeatherData {
  current: {
    temp: number;
    description: string;
    emoji: string;
  };
  hourly: HourlySlot[];
}

export type ChartRange = '1D' | '7D' | '1M' | '1Y';

export interface ChartPoint {
  timestamp: number;
  price: number;
}

export interface ChartData {
  points: ChartPoint[];
}

export type NordPoolRange = 'CURRENT' | '7D' | '1M' | '1Y';

export interface NordPoolCurrentData {
  points: ChartPoint[];
  hasTomorrow: boolean;
  currentHourIndex: number;
  currentHourPrice: number | null;
  todayAvgPrice: number;
}

export interface NordPoolHistoryData {
  points: ChartPoint[];
}

export type NordPoolChartData = NordPoolCurrentData | NordPoolHistoryData;
```

- [ ] **Step 4: Delete the dead files**

```bash
rm /Users/lauri.kongas/Dev/2304/lib/nordpool.ts
rm /Users/lauri.kongas/Dev/2304/lib/__tests__/nordpool.test.ts
```

- [ ] **Step 5: Run the test suite — expect all pass**

```bash
cd /Users/lauri.kongas/Dev/2304 && npx jest --no-coverage 2>&1 | tail -20
```

Expected: PASS — the nordpool tests are gone, energy tests reflect the simplified function.

- [ ] **Step 6: Commit**

```bash
git add lib/energy.ts lib/__tests__/energy.test.ts types.ts
git rm lib/nordpool.ts lib/__tests__/nordpool.test.ts
git commit -m "refactor: remove Nord Pool stats from energy pipeline, simplify EnergyData type"
```

---

## Task 7: Wire `NordPoolCard` into `EnergySection`

**Files:**
- Modify: `app/components/EnergySection.tsx`
- Modify: `app/components/__tests__/EnergySection.test.tsx`

- [ ] **Step 1: Update `EnergySection.tsx`**

Replace the full content of `app/components/EnergySection.tsx`:

```tsx
import type { EnergyData } from '@/types';
import TickerCard from './TickerCard';
import NordPoolCard from './NordPoolCard';
import Widget from './Widget';

interface Props {
  data: EnergyData | null;
  loading: boolean;
  error: string | null;
}

export default function EnergySection({ data, loading, error }: Props) {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
        Energia
      </h2>
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-40">
          {loading ? (
            <Widget label="" value="" loading />
          ) : error || !data ? (
            <p className="text-sm text-red-400">{error ?? 'Pole saadaval'}</p>
          ) : (
            <TickerCard
              label="Brent Crude"
              symbol="BZ=F"
              price={data.brent.price}
              change={data.brent.change}
              changePercent={data.brent.changePercent}
              formatValue={(p) => `$${p.toFixed(2)}`}
            />
          )}
        </div>
        <div className="flex-1 min-w-40">
          <NordPoolCard />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Update `app/components/__tests__/EnergySection.test.tsx`**

Replace the full content:

```tsx
jest.mock('@/lib/useChartData', () => ({
  useChartData: () => ({ points: [], loading: false, error: null }),
}));

jest.mock('@/lib/useNordPoolChartData', () => ({
  useNordPoolChartData: () => ({ data: null, loading: false, error: null }),
}));

jest.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  Bar: () => null,
  Cell: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
}));

import { render, screen } from '@testing-library/react';
import EnergySection from '../EnergySection';
import type { EnergyData } from '@/types';

const MOCK_DATA: EnergyData = {
  brent: { symbol: 'BZ=F', label: 'Brent Crude', price: 83.4, change: -0.3, changePercent: -0.36 },
};

describe('EnergySection', () => {
  it('renders section heading', () => {
    render(<EnergySection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('Energia')).toBeInTheDocument();
  });

  it('renders Brent crude price', () => {
    render(<EnergySection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('$83.40')).toBeInTheDocument();
  });

  it('renders Nord Pool card label', () => {
    render(<EnergySection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('Nord Pool EE')).toBeInTheDocument();
  });

  it('shows loading skeleton for Brent while loading', () => {
    const { container } = render(<EnergySection data={null} loading={true} error={null} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows error message when energy data fails', () => {
    render(<EnergySection data={null} loading={false} error="Energia andmete laadimine ebaõnnestus" />);
    expect(screen.getByText('Energia andmete laadimine ebaõnnestus')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test suite — expect all pass**

```bash
cd /Users/lauri.kongas/Dev/2304 && npx jest --no-coverage 2>&1 | tail -20
```

Expected: PASS — all tests green including the updated `EnergySection.test.tsx`.

- [ ] **Step 4: Commit**

```bash
git add app/components/EnergySection.tsx app/components/__tests__/EnergySection.test.tsx
git commit -m "feat: wire NordPoolCard into EnergySection, replace plain Nord Pool widgets"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run the full test suite with coverage check**

```bash
cd /Users/lauri.kongas/Dev/2304 && npx jest --no-coverage 2>&1 | tail -30
```

Expected: all test suites pass, no `nordpool.test.ts` in output.

- [ ] **Step 2: Check for TypeScript errors**

```bash
cd /Users/lauri.kongas/Dev/2304 && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Check for lint errors**

```bash
cd /Users/lauri.kongas/Dev/2304 && npx eslint app/components/NordPoolCard.tsx lib/nordpool-chart.ts lib/useNordPoolChartData.ts app/api/nordpool-chart/route.ts 2>&1
```

Expected: no errors.

- [ ] **Step 4: Commit any fixes, or confirm done**

If no fixes needed:
```bash
git log --oneline -8
```

Should show the 5 commits from this feature plus any prior history.
