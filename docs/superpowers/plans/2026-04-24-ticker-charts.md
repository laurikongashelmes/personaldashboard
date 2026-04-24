# Ticker Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive Recharts area charts with a 1D/7D/1M/1Y range switcher to the Euro STOXX 50, EUR/USD, and Brent Crude ticker widgets.

**Architecture:** A new `/api/charts` route fetches historical data via `yahooFinance.chart()` with range-specific intervals. Each ticker becomes a `TickerCard` component that owns its chart state via a `useChartData` hook. Chart data is fetched client-side independently from the 5-minute dashboard refresh.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Recharts, yahoo-finance2, Tailwind CSS v4, Jest + React Testing Library.

---

## File Map

| Status | File | Purpose |
|--------|------|---------|
| modify | `types.ts` | Add `ChartRange`, `ChartPoint`, `ChartData` |
| modify | `config.ts` | Add `CHART_TICKERS`, `ChartSymbol` |
| create | `lib/charts.ts` | Server-side: `fetchChartData(symbol, range)` |
| create | `lib/__tests__/charts.test.ts` | Tests for `fetchChartData` |
| create | `app/api/charts/route.ts` | GET `/api/charts?symbol=&range=` |
| create | `app/api/charts/__tests__/route.test.ts` | Tests for the route |
| create | `lib/useChartData.ts` | React hook: `useChartData(symbol, range)` |
| create | `lib/__tests__/useChartData.test.tsx` | Tests for the hook |
| create | `app/components/TickerCard.tsx` | Chart-first ticker card component |
| create | `app/components/__tests__/TickerCard.test.tsx` | Tests for TickerCard |
| modify | `app/components/MarketsSection.tsx` | Use `TickerCard` instead of `Widget` |
| modify | `app/components/__tests__/MarketsSection.test.tsx` | Mock `useChartData` |
| modify | `app/components/EnergySection.tsx` | Use `TickerCard` for Brent Crude |
| modify | `app/components/__tests__/EnergySection.test.tsx` | Mock `useChartData` |

---

### Task 1: Install recharts and add types/config

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `types.ts`
- Modify: `config.ts`

- [ ] **Step 1: Install recharts**

```bash
cd /path/to/project && npm install recharts
```

Expected: `added N packages` with no errors.

- [ ] **Step 2: Add new types to `types.ts`**

Append to the end of `types.ts`:

```ts
export type ChartRange = '1D' | '7D' | '1M' | '1Y';

export interface ChartPoint {
  timestamp: number;
  price: number;
}

export interface ChartData {
  points: ChartPoint[];
}
```

- [ ] **Step 3: Add chart config to `config.ts`**

Replace the entire contents of `config.ts` with:

```ts
export const TICKERS = [
  { symbol: '^STOXX50E', label: 'EURO STOXX 50' },
  { symbol: 'EURUSD=X', label: 'EUR/USD' },
];

export const TALLINN_COORDS = { lat: 59.437, lon: 24.7536 };

export const CHART_TICKERS = ['^STOXX50E', 'EURUSD=X', 'BZ=F'] as const;
export type ChartSymbol = typeof CHART_TICKERS[number];
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add types.ts config.ts package.json package-lock.json
git commit -m "feat: add ChartRange/ChartPoint/ChartData types and CHART_TICKERS config

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Server-side chart data fetching (`lib/charts.ts`)

**Files:**
- Create: `lib/charts.ts`
- Create: `lib/__tests__/charts.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/charts.test.ts`:

```ts
// @jest-environment node

jest.mock('yahoo-finance2', () => {
  const mockChart = jest.fn();
  const MockClass = jest.fn(() => ({ chart: mockChart }));
  (MockClass as any).__mockChart = mockChart;
  return { __esModule: true, default: MockClass };
});

import { fetchChartData } from '../charts';
import YahooFinance from 'yahoo-finance2';

const mockChart = (YahooFinance as any).__mockChart as jest.Mock;

describe('fetchChartData', () => {
  beforeEach(() => jest.resetAllMocks());

  it('maps quotes to ChartPoints for 7D range', async () => {
    const date1 = new Date('2026-04-17T00:00:00Z');
    const date2 = new Date('2026-04-18T00:00:00Z');
    mockChart.mockResolvedValue({
      quotes: [
        { date: date1, close: 5100, high: null, low: null, open: null, volume: null },
        { date: date2, close: 5200, high: null, low: null, open: null, volume: null },
      ],
    });

    const result = await fetchChartData('^STOXX50E', '7D');

    expect(result.points).toHaveLength(2);
    expect(result.points[0]).toEqual({ timestamp: date1.getTime(), price: 5100 });
    expect(result.points[1]).toEqual({ timestamp: date2.getTime(), price: 5200 });
  });

  it('filters out null close values', async () => {
    mockChart.mockResolvedValue({
      quotes: [
        { date: new Date('2026-04-17T00:00:00Z'), close: null, high: null, low: null, open: null, volume: null },
        { date: new Date('2026-04-18T00:00:00Z'), close: 5200, high: null, low: null, open: null, volume: null },
      ],
    });

    const result = await fetchChartData('^STOXX50E', '7D');

    expect(result.points).toHaveLength(1);
    expect(result.points[0].price).toBe(5200);
  });

  it('uses 15m interval for 1D range', async () => {
    mockChart.mockResolvedValue({ quotes: [] });
    await fetchChartData('^STOXX50E', '1D');
    expect(mockChart).toHaveBeenCalledWith(
      '^STOXX50E',
      expect.objectContaining({ interval: '15m' }),
    );
  });

  it('uses 1d interval for 7D range', async () => {
    mockChart.mockResolvedValue({ quotes: [] });
    await fetchChartData('^STOXX50E', '7D');
    expect(mockChart).toHaveBeenCalledWith(
      '^STOXX50E',
      expect.objectContaining({ interval: '1d' }),
    );
  });

  it('uses 1d interval for 1M range', async () => {
    mockChart.mockResolvedValue({ quotes: [] });
    await fetchChartData('^STOXX50E', '1M');
    expect(mockChart).toHaveBeenCalledWith(
      '^STOXX50E',
      expect.objectContaining({ interval: '1d' }),
    );
  });

  it('uses 1wk interval for 1Y range', async () => {
    mockChart.mockResolvedValue({ quotes: [] });
    await fetchChartData('^STOXX50E', '1Y');
    expect(mockChart).toHaveBeenCalledWith(
      '^STOXX50E',
      expect.objectContaining({ interval: '1wk' }),
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest lib/__tests__/charts.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../charts'`

- [ ] **Step 3: Implement `lib/charts.ts`**

Create `lib/charts.ts`:

```ts
import YahooFinance from 'yahoo-finance2';
import type { ChartData, ChartRange } from '../types';
import type { ChartSymbol } from '../config';

const yahooFinance = new YahooFinance();

function getPeriod1(range: ChartRange): Date {
  const now = Date.now();
  switch (range) {
    case '1D': {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
    case '7D':  return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '1M':  return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case '1Y':  return new Date(now - 365 * 24 * 60 * 60 * 1000);
  }
}

function getInterval(range: ChartRange): '15m' | '1d' | '1wk' {
  switch (range) {
    case '1D': return '15m';
    case '7D': return '1d';
    case '1M': return '1d';
    case '1Y': return '1wk';
  }
}

export async function fetchChartData(symbol: ChartSymbol, range: ChartRange): Promise<ChartData> {
  const result = await yahooFinance.chart(symbol, {
    period1: getPeriod1(range),
    interval: getInterval(range),
  });

  const points = result.quotes
    .filter(q => q.close !== null)
    .map(q => ({ timestamp: q.date.getTime(), price: q.close as number }));

  return { points };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest lib/__tests__/charts.test.ts --no-coverage
```

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/charts.ts lib/__tests__/charts.test.ts
git commit -m "feat: add fetchChartData with range/interval mapping

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: `/api/charts` route

**Files:**
- Create: `app/api/charts/route.ts`
- Create: `app/api/charts/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/api/charts/__tests__/route.test.ts`:

```ts
// @jest-environment node

jest.mock('@/lib/charts', () => ({
  fetchChartData: jest.fn(),
}));

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { fetchChartData } from '@/lib/charts';

const mockFetchChartData = fetchChartData as jest.Mock;

function makeRequest(symbol: string, range: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/charts?symbol=${encodeURIComponent(symbol)}&range=${range}`,
  );
}

describe('GET /api/charts', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns chart data for a valid symbol and range', async () => {
    const mockData = { points: [{ timestamp: 1714000000000, price: 5100 }] };
    mockFetchChartData.mockResolvedValue(mockData);

    const res = await GET(makeRequest('^STOXX50E', '7D'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(mockData);
  });

  it('returns 400 for an unknown symbol', async () => {
    const res = await GET(makeRequest('INVALID_SYM', '7D'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid range', async () => {
    const res = await GET(makeRequest('^STOXX50E', 'BOGUS'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when symbol param is missing', async () => {
    const res = await GET(new NextRequest('http://localhost/api/charts?range=7D'));
    expect(res.status).toBe(400);
  });

  it('returns 503 when fetchChartData throws', async () => {
    mockFetchChartData.mockRejectedValue(new Error('Yahoo down'));
    const res = await GET(makeRequest('^STOXX50E', '7D'));
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest app/api/charts/__tests__/route.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: Implement `app/api/charts/route.ts`**

Create `app/api/charts/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchChartData } from '@/lib/charts';
import { CHART_TICKERS } from '@/config';
import type { ChartRange } from '@/types';
import type { ChartSymbol } from '@/config';

const VALID_RANGES: ChartRange[] = ['1D', '7D', '1M', '1Y'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') as ChartRange | null;

  if (!symbol || !(CHART_TICKERS as readonly string[]).includes(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  if (!range || !VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  try {
    const data = await fetchChartData(symbol as ChartSymbol, range);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 503 });
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest app/api/charts/__tests__/route.test.ts --no-coverage
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/api/charts/route.ts app/api/charts/__tests__/route.test.ts
git commit -m "feat: add /api/charts route with symbol validation

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: `useChartData` hook

**Files:**
- Create: `lib/useChartData.ts`
- Create: `lib/__tests__/useChartData.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/useChartData.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useChartData } from '../useChartData';

const MOCK_POINTS = [
  { timestamp: 1714000000000, price: 5100 },
  { timestamp: 1714086400000, price: 5150 },
];

beforeEach(() => {
  jest.resetAllMocks();
});

it('starts with loading=true and empty points', () => {
  global.fetch = jest.fn(() => new Promise(() => {})); // never resolves
  const { result } = renderHook(() => useChartData('^STOXX50E', '7D'));
  expect(result.current.loading).toBe(true);
  expect(result.current.points).toEqual([]);
  expect(result.current.error).toBeNull();
});

it('populates points on successful fetch', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ points: MOCK_POINTS }),
    } as Response),
  );

  const { result } = renderHook(() => useChartData('^STOXX50E', '7D'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.points).toEqual(MOCK_POINTS);
  expect(result.current.error).toBeNull();
});

it('sets error on HTTP error response', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: false, status: 503 } as Response),
  );

  const { result } = renderHook(() => useChartData('^STOXX50E', '7D'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('Andmed pole saadaval');
  expect(result.current.points).toEqual([]);
});

it('sets error on network failure', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

  const { result } = renderHook(() => useChartData('^STOXX50E', '7D'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('Andmed pole saadaval');
});

it('re-fetches and resets loading when range changes', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ points: MOCK_POINTS }),
    } as Response),
  );

  const { result, rerender } = renderHook(
    ({ range }: { range: '7D' | '1M' }) => useChartData('^STOXX50E', range),
    { initialProps: { range: '7D' as const } },
  );

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(global.fetch).toHaveBeenCalledTimes(1);

  rerender({ range: '1M' });

  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(global.fetch).toHaveBeenLastCalledWith(
    '/api/charts?symbol=%5ESTOXX50E&range=1M',
  );
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest lib/__tests__/useChartData.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../useChartData'`

- [ ] **Step 3: Implement `lib/useChartData.ts`**

Create `lib/useChartData.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest lib/__tests__/useChartData.test.tsx --no-coverage
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/useChartData.ts lib/__tests__/useChartData.test.tsx
git commit -m "feat: add useChartData hook

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: `TickerCard` component

**Files:**
- Create: `app/components/TickerCard.tsx`
- Create: `app/components/__tests__/TickerCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `app/components/__tests__/TickerCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TickerCard from '../TickerCard';

jest.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
}));

jest.mock('@/lib/useChartData');
import { useChartData } from '@/lib/useChartData';
const mockUseChartData = useChartData as jest.Mock;

const BASE_PROPS = {
  label: 'EURO STOXX 50',
  symbol: '^STOXX50E',
  price: 5241.0,
  change: 32.4,
  changePercent: 0.62,
  formatValue: (p: number) => p.toFixed(1),
};

describe('TickerCard', () => {
  beforeEach(() => {
    mockUseChartData.mockReturnValue({ points: [], loading: false, error: null });
  });

  it('renders the label', () => {
    render(<TickerCard {...BASE_PROPS} />);
    expect(screen.getByText('EURO STOXX 50')).toBeInTheDocument();
  });

  it('renders the formatted price', () => {
    render(<TickerCard {...BASE_PROPS} />);
    expect(screen.getByText('5241.0')).toBeInTheDocument();
  });

  it('renders positive change in green', () => {
    render(<TickerCard {...BASE_PROPS} />);
    const el = screen.getByText('▲ +0.62%');
    expect(el).toHaveClass('text-green-600');
  });

  it('renders negative change in red', () => {
    render(<TickerCard {...BASE_PROPS} changePercent={-0.14} change={-0.002} />);
    const el = screen.getByText('▼ −0.14%');
    expect(el).toHaveClass('text-red-500');
  });

  it('renders all four range buttons', () => {
    render(<TickerCard {...BASE_PROPS} />);
    expect(screen.getByRole('button', { name: '1D' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7D' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1M' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1Y' })).toBeInTheDocument();
  });

  it('7D is active by default', () => {
    render(<TickerCard {...BASE_PROPS} />);
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '1D' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches active range when a button is clicked', async () => {
    render(<TickerCard {...BASE_PROPS} />);
    await userEvent.click(screen.getByRole('button', { name: '1M' }));
    expect(screen.getByRole('button', { name: '1M' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows skeleton in chart area while loading', () => {
    mockUseChartData.mockReturnValue({ points: [], loading: true, error: null });
    const { container } = render(<TickerCard {...BASE_PROPS} />);
    expect(container.querySelector('[data-testid="chart-skeleton"]')).toBeInTheDocument();
  });

  it('shows error message when chart data fails', () => {
    mockUseChartData.mockReturnValue({ points: [], loading: false, error: 'Andmed pole saadaval' });
    render(<TickerCard {...BASE_PROPS} />);
    expect(screen.getByText('Andmed pole saadaval')).toBeInTheDocument();
  });

  it('shows dash and no change when price is null', () => {
    render(<TickerCard {...BASE_PROPS} price={null} change={null} changePercent={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText(/▲|▼/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest app/components/__tests__/TickerCard.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../TickerCard'`

- [ ] **Step 3: Implement `app/components/TickerCard.tsx`**

Create `app/components/TickerCard.tsx`:

```tsx
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
  const [selectedRange, setSelectedRange] = useState<ChartRange>('7D');
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
            onClick={() => setSelectedRange(r)}
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

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest app/components/__tests__/TickerCard.test.tsx --no-coverage
```

Expected: PASS — 10 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/components/TickerCard.tsx app/components/__tests__/TickerCard.test.tsx
git commit -m "feat: add TickerCard component with interactive Recharts area chart

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Wire up `MarketsSection`

**Files:**
- Modify: `app/components/MarketsSection.tsx`
- Modify: `app/components/__tests__/MarketsSection.test.tsx`

- [ ] **Step 1: Add `useChartData` mock to the existing test file**

At the top of `app/components/__tests__/MarketsSection.test.tsx`, add a `jest.mock` call immediately before the imports. The full updated file:

```tsx
jest.mock('@/lib/useChartData', () => ({
  useChartData: () => ({ points: [], loading: false, error: null }),
}));

import { render, screen } from '@testing-library/react';
import MarketsSection from '../MarketsSection';
import type { TickerData } from '@/types';

const MOCK_TICKERS: TickerData[] = [
  { symbol: '^STOXX50E', label: 'EURO STOXX 50', price: 5142.3, change: 40.5, changePercent: 0.794 },
  { symbol: 'EURUSD=X', label: 'EUR/USD', price: 1.0732, change: -0.002, changePercent: -0.186 },
];

describe('MarketsSection', () => {
  it('renders section heading', () => {
    render(<MarketsSection data={MOCK_TICKERS} loading={false} error={null} />);
    expect(screen.getByText('Turud')).toBeInTheDocument();
  });

  it('renders a card for each ticker', () => {
    render(<MarketsSection data={MOCK_TICKERS} loading={false} error={null} />);
    expect(screen.getByText('EURO STOXX 50')).toBeInTheDocument();
    expect(screen.getByText('EUR/USD')).toBeInTheDocument();
  });

  it('shows positive change in green', () => {
    render(<MarketsSection data={MOCK_TICKERS} loading={false} error={null} />);
    const positive = screen.getByText('▲ +0.79%');
    expect(positive).toHaveClass('text-green-600');
  });

  it('shows negative change in red', () => {
    render(<MarketsSection data={MOCK_TICKERS} loading={false} error={null} />);
    const negative = screen.getByText('▼ −0.19%');
    expect(negative).toHaveClass('text-red-500');
  });

  it('renders loading skeletons when loading=true', () => {
    const { container } = render(<MarketsSection data={[]} loading={true} error={null} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
```

Note: Recharts also needs to be mocked because TickerCard imports it. Add this mock too, after the `useChartData` mock:

```tsx
jest.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
}));
```

The complete updated test file (both mocks at the top):

```tsx
jest.mock('@/lib/useChartData', () => ({
  useChartData: () => ({ points: [], loading: false, error: null }),
}));

jest.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
}));

import { render, screen } from '@testing-library/react';
import MarketsSection from '../MarketsSection';
import type { TickerData } from '@/types';

const MOCK_TICKERS: TickerData[] = [
  { symbol: '^STOXX50E', label: 'EURO STOXX 50', price: 5142.3, change: 40.5, changePercent: 0.794 },
  { symbol: 'EURUSD=X', label: 'EUR/USD', price: 1.0732, change: -0.002, changePercent: -0.186 },
];

describe('MarketsSection', () => {
  it('renders section heading', () => {
    render(<MarketsSection data={MOCK_TICKERS} loading={false} error={null} />);
    expect(screen.getByText('Turud')).toBeInTheDocument();
  });

  it('renders a card for each ticker', () => {
    render(<MarketsSection data={MOCK_TICKERS} loading={false} error={null} />);
    expect(screen.getByText('EURO STOXX 50')).toBeInTheDocument();
    expect(screen.getByText('EUR/USD')).toBeInTheDocument();
  });

  it('shows positive change in green', () => {
    render(<MarketsSection data={MOCK_TICKERS} loading={false} error={null} />);
    const positive = screen.getByText('▲ +0.79%');
    expect(positive).toHaveClass('text-green-600');
  });

  it('shows negative change in red', () => {
    render(<MarketsSection data={MOCK_TICKERS} loading={false} error={null} />);
    const negative = screen.getByText('▼ −0.19%');
    expect(negative).toHaveClass('text-red-500');
  });

  it('renders loading skeletons when loading=true', () => {
    const { container } = render(<MarketsSection data={[]} loading={true} error={null} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run existing tests to confirm they still pass (they should)**

```bash
npx jest app/components/__tests__/MarketsSection.test.tsx --no-coverage
```

Expected: PASS — 5 tests still passing (MarketsSection still uses the old Widget).

- [ ] **Step 3: Replace `app/components/MarketsSection.tsx` with TickerCard version**

Replace the entire file:

```tsx
import type { TickerData } from '@/types';
import TickerCard from './TickerCard';
import Widget from './Widget';

interface Props {
  data: TickerData[];
  loading: boolean;
  error: string | null;
}

function formatPrice(price: number, symbol: string): string {
  if (symbol === 'EURUSD=X') return price.toFixed(4);
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return price.toFixed(2);
}

export default function MarketsSection({ data, loading, error }: Props) {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
        Turud
      </h2>
      <div className="flex gap-4 flex-wrap">
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="flex-1 min-w-40">
              <Widget label="" value="" loading />
            </div>
          ))
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          data.map(ticker => (
            <div key={ticker.symbol} className="flex-1 min-w-40">
              <TickerCard
                label={ticker.label}
                symbol={ticker.symbol}
                price={ticker.price}
                change={ticker.change}
                changePercent={ticker.changePercent}
                formatValue={(p) => formatPrice(p, ticker.symbol)}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run tests to confirm they still pass**

```bash
npx jest app/components/__tests__/MarketsSection.test.tsx --no-coverage
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/components/MarketsSection.tsx app/components/__tests__/MarketsSection.test.tsx
git commit -m "feat: use TickerCard in MarketsSection

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Wire up `EnergySection` + full test run

**Files:**
- Modify: `app/components/EnergySection.tsx`
- Modify: `app/components/__tests__/EnergySection.test.tsx`

- [ ] **Step 1: Update the EnergySection test file**

Replace the entire `app/components/__tests__/EnergySection.test.tsx`:

```tsx
jest.mock('@/lib/useChartData', () => ({
  useChartData: () => ({ points: [], loading: false, error: null }),
}));

jest.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
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
  nordPool: { avgPrice: 82.0, minPrice: 41.0, minHour: '03:00' },
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

  it('renders Nord Pool average and minimum', () => {
    render(<EnergySection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText(/82\.0/)).toBeInTheDocument();
    expect(screen.getByText(/41\.0/)).toBeInTheDocument();
    expect(screen.getByText(/03:00/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run existing tests to confirm they still pass**

```bash
npx jest app/components/__tests__/EnergySection.test.tsx --no-coverage
```

Expected: PASS — 3 tests passing (EnergySection still uses the old Widget for Brent).

- [ ] **Step 3: Replace `app/components/EnergySection.tsx` with TickerCard version**

Replace the entire file:

```tsx
import type { EnergyData } from '@/types';
import TickerCard from './TickerCard';
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
        {loading ? (
          <>
            <div className="flex-1 min-w-40"><Widget label="" value="" loading /></div>
            <div className="flex-1 min-w-40"><Widget label="" value="" loading /></div>
            <div className="flex-1 min-w-40"><Widget label="" value="" loading /></div>
          </>
        ) : error || !data ? (
          <p className="text-sm text-red-400">{error ?? 'Pole saadaval'}</p>
        ) : (
          <>
            <div className="flex-1 min-w-40">
              <TickerCard
                label="Brent Crude"
                symbol="BZ=F"
                price={data.brent.price}
                change={data.brent.change}
                changePercent={data.brent.changePercent}
                formatValue={(p) => `$${p.toFixed(2)}`}
              />
            </div>
            <div className="flex-1 min-w-40">
              <Widget
                label="Nord Pool Kesk"
                value={`${data.nordPool.avgPrice.toFixed(1)} €/MWh`}
                subValueColor="neutral"
              />
            </div>
            <div className="flex-1 min-w-40">
              <Widget
                label="Nord Pool Min"
                value={`${data.nordPool.minPrice.toFixed(1)} €/MWh`}
                subValue={data.nordPool.minHour}
                subValueColor="neutral"
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run EnergySection tests to confirm they pass**

```bash
npx jest app/components/__tests__/EnergySection.test.tsx --no-coverage
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests passing. If any test fails, fix before committing.

- [ ] **Step 6: Commit**

```bash
git add app/components/EnergySection.tsx app/components/__tests__/EnergySection.test.tsx
git commit -m "feat: use TickerCard in EnergySection for Brent Crude

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
