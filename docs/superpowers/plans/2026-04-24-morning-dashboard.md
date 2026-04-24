# Morning Brief Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js personal morning dashboard showing EURO STOXX 50, EUR/USD, Brent crude, Nord Pool EE electricity prices, and Tallinn weather — all fetched fresh on load via server-side API routes.

**Architecture:** A single Next.js App Router page fetches from three internal API routes (`/api/markets`, `/api/energy`, `/api/weather`) in parallel on mount. Each route proxies a free external API server-side, keeping CORS and any future API keys out of the browser. Data transformation logic lives in `lib/` files that are independently tested.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, `yahoo-finance2` (financial data), Elering public API (Nord Pool EE), Open-Meteo API (weather), Jest + React Testing Library

---

## File Map

| File | Responsibility |
|---|---|
| `config.ts` | Ticker list, Tallinn coordinates |
| `types.ts` | Shared TypeScript interfaces |
| `lib/nordpool.ts` | Pure function: compute avg/min/minHour from hourly price array |
| `lib/weather.ts` | Pure functions: map WMO weather code → description + emoji; filter hourly forecast |
| `lib/markets.ts` | Fetch + map market quotes via yahoo-finance2 |
| `lib/energy.ts` | Fetch + map Brent crude + Nord Pool EE data |
| `lib/weather-api.ts` | Fetch + map Tallinn weather from Open-Meteo |
| `app/api/markets/route.ts` | Thin route handler calling `lib/markets.ts` |
| `app/api/energy/route.ts` | Thin route handler calling `lib/energy.ts` |
| `app/api/weather/route.ts` | Thin route handler calling `lib/weather-api.ts` |
| `app/components/Widget.tsx` | Shared card wrapper with label, value, sub-value, loading + error states |
| `app/components/MarketsSection.tsx` | Renders ticker cards from API response |
| `app/components/EnergySection.tsx` | Renders Brent + Nord Pool cards |
| `app/components/WeatherSection.tsx` | Renders current conditions + hourly forecast strip |
| `app/page.tsx` | Dashboard page: fetch orchestration, loading skeletons, refresh button |
| `app/layout.tsx` | Root layout with metadata |
| `app/globals.css` | Tailwind base + minor global overrides |

---

## Task 1: Scaffold Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `jest.config.ts`, `jest.setup.ts`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (boilerplate — replaced in later tasks)

- [ ] **Step 1: Scaffold Next.js app into the existing directory**

```bash
cd /Users/lauri.kongas/Dev/2304
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

When prompted, accept all defaults (or press Enter for each). This creates the Next.js scaffold in the current directory alongside the existing `docs/` folder.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install yahoo-finance2
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/jest
```

- [ ] **Step 4: Configure Jest**

Replace contents of `jest.config.ts` (create if it doesn't exist):

```typescript
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
};

export default createJestConfig(config);
```

Create `jest.setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

Add test script to `package.json` (merge into existing scripts):

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Configure Next.js to transpile yahoo-finance2**

Edit `next.config.ts` to add `transpilePackages`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['yahoo-finance2'],
};

export default nextConfig;
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: `▲ Next.js 14.x.x` ready on `http://localhost:3000`. Stop with Ctrl+C.

- [ ] **Step 7: Add .superpowers to .gitignore**

Append to `.gitignore`:

```
# Brainstorming session files
.superpowers/
```

- [ ] **Step 8: Commit scaffold**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind and Jest"
```

---

## Task 2: Config and Types

**Files:**
- Create: `config.ts`
- Create: `types.ts`

- [ ] **Step 1: Create `config.ts`**

```typescript
export const TICKERS = [
  { symbol: '^STOXX50E', label: 'EURO STOXX 50' },
  { symbol: 'EURUSD=X', label: 'EUR/USD' },
];

export const TALLINN_COORDS = { lat: 59.437, lon: 24.7536 };
```

- [ ] **Step 2: Create `types.ts`**

```typescript
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
  minHour: string; // e.g. "03:00"
}

export interface EnergyData {
  brent: TickerData;
  nordPool: NordPoolStats;
}

export interface HourlySlot {
  time: string;  // e.g. "15:00"
  temp: number;
  description: string;
  emoji: string;
}

export interface WeatherData {
  currentTemp: number;
  description: string;
  emoji: string;
  hourly: HourlySlot[];
}
```

- [ ] **Step 3: Commit**

```bash
git add config.ts types.ts
git commit -m "feat: add config and shared types"
```

---

## Task 3: Nord Pool Utility

**Files:**
- Create: `lib/nordpool.ts`
- Create: `lib/__tests__/nordpool.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/nordpool.test.ts`:

```typescript
// @jest-environment node
import { computeNordPoolStats } from '../nordpool';

const SAMPLE_PRICES = [
  { timestamp: 1714003200, price: 80.0 },
  { timestamp: 1714006800, price: 41.0 }, // lowest — 01:00 EET
  { timestamp: 1714010400, price: 95.5 },
  { timestamp: 1714014000, price: 100.0 },
];

describe('computeNordPoolStats', () => {
  it('computes average price rounded to one decimal', () => {
    const result = computeNordPoolStats(SAMPLE_PRICES);
    expect(result.avgPrice).toBe(79.1);
  });

  it('finds the minimum price', () => {
    const result = computeNordPoolStats(SAMPLE_PRICES);
    expect(result.minPrice).toBe(41.0);
  });

  it('returns the hour label of the minimum price in EET', () => {
    const result = computeNordPoolStats(SAMPLE_PRICES);
    // timestamp 1714006800 = 2024-04-25 01:00 UTC = 04:00 EEST
    // (exact hour depends on timezone — just check it's a valid HH:MM string)
    expect(result.minHour).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns minPrice 0 and avgPrice 0 for empty array', () => {
    const result = computeNordPoolStats([]);
    expect(result.avgPrice).toBe(0);
    expect(result.minPrice).toBe(0);
    expect(result.minHour).toBe('--:--');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/nordpool.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../nordpool'`

- [ ] **Step 3: Create `lib/nordpool.ts`**

```typescript
import type { NordPoolStats } from '../types';

interface PriceEntry {
  timestamp: number;
  price: number;
}

export function computeNordPoolStats(prices: PriceEntry[]): NordPoolStats {
  if (prices.length === 0) {
    return { avgPrice: 0, minPrice: 0, minHour: '--:--' };
  }

  const total = prices.reduce((sum, e) => sum + e.price, 0);
  const avgPrice = Math.round((total / prices.length) * 10) / 10;

  const minEntry = prices.reduce((min, e) => (e.price < min.price ? e : min), prices[0]);
  const minPrice = minEntry.price;

  const date = new Date(minEntry.timestamp * 1000);
  const minHour = date.toLocaleTimeString('et-EE', {
    timeZone: 'Europe/Tallinn',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return { avgPrice, minPrice, minHour };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest lib/__tests__/nordpool.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/nordpool.ts lib/__tests__/nordpool.test.ts
git commit -m "feat: add Nord Pool stats utility with tests"
```

---

## Task 4: Weather Code Utility

**Files:**
- Create: `lib/weather.ts`
- Create: `lib/__tests__/weather.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/weather.test.ts`:

```typescript
// @jest-environment node
import { mapWeatherCode, filterRemainingHourly } from '../weather';
import type { HourlySlot } from '../../types';

describe('mapWeatherCode', () => {
  it('maps code 0 to clear sky', () => {
    expect(mapWeatherCode(0)).toEqual({ description: 'Clear sky', emoji: '☀️' });
  });

  it('maps code 2 to partly cloudy', () => {
    expect(mapWeatherCode(2)).toEqual({ description: 'Partly cloudy', emoji: '⛅' });
  });

  it('maps code 61 to rain', () => {
    expect(mapWeatherCode(61)).toEqual({ description: 'Light rain', emoji: '🌧️' });
  });

  it('returns unknown for unmapped codes', () => {
    const result = mapWeatherCode(999);
    expect(result.description).toBe('Unknown');
  });
});

describe('filterRemainingHourly', () => {
  it('returns slots from current hour onwards, up to 6 slots, every 3 hours', () => {
    const times = ['2024-04-24T08:00', '2024-04-24T09:00', '2024-04-24T10:00',
                   '2024-04-24T11:00', '2024-04-24T12:00', '2024-04-24T13:00',
                   '2024-04-24T14:00', '2024-04-24T15:00', '2024-04-24T16:00',
                   '2024-04-24T17:00', '2024-04-24T18:00', '2024-04-24T19:00',
                   '2024-04-24T20:00', '2024-04-24T21:00', '2024-04-24T22:00',
                   '2024-04-24T23:00'];
    const temps = times.map((_, i) => 10 + i);
    const codes = times.map(() => 0);
    const currentHour = new Date('2024-04-24T09:00:00Z');

    const result = filterRemainingHourly(times, temps, codes, currentHour);
    expect(result.length).toBeLessThanOrEqual(6);
    result.forEach((slot: HourlySlot) => {
      expect(slot.time).toMatch(/^\d{2}:\d{2}$/);
      expect(slot.emoji).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/weather.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../weather'`

- [ ] **Step 3: Create `lib/weather.ts`**

```typescript
import type { HourlySlot } from '../types';

interface WeatherCondition {
  description: string;
  emoji: string;
}

const WMO_CODES: Record<number, WeatherCondition> = {
  0:  { description: 'Clear sky',          emoji: '☀️' },
  1:  { description: 'Mainly clear',       emoji: '🌤️' },
  2:  { description: 'Partly cloudy',      emoji: '⛅' },
  3:  { description: 'Overcast',           emoji: '☁️' },
  45: { description: 'Fog',               emoji: '🌫️' },
  48: { description: 'Icy fog',           emoji: '🌫️' },
  51: { description: 'Light drizzle',     emoji: '🌦️' },
  53: { description: 'Drizzle',           emoji: '🌦️' },
  55: { description: 'Heavy drizzle',     emoji: '🌧️' },
  61: { description: 'Light rain',        emoji: '🌧️' },
  63: { description: 'Rain',              emoji: '🌧️' },
  65: { description: 'Heavy rain',        emoji: '🌧️' },
  71: { description: 'Light snow',        emoji: '🌨️' },
  73: { description: 'Snow',              emoji: '🌨️' },
  75: { description: 'Heavy snow',        emoji: '❄️' },
  80: { description: 'Rain showers',      emoji: '🌦️' },
  81: { description: 'Heavy showers',     emoji: '🌧️' },
  82: { description: 'Violent showers',   emoji: '⛈️' },
  95: { description: 'Thunderstorm',      emoji: '⛈️' },
  96: { description: 'Thunderstorm+hail', emoji: '⛈️' },
  99: { description: 'Thunderstorm+hail', emoji: '⛈️' },
};

export function mapWeatherCode(code: number): WeatherCondition {
  return WMO_CODES[code] ?? { description: 'Unknown', emoji: '🌡️' };
}

export function filterRemainingHourly(
  times: string[],
  temps: number[],
  codes: number[],
  now: Date = new Date(),
): HourlySlot[] {
  const currentHour = now.getUTCHours();
  const results: HourlySlot[] = [];

  for (let i = 0; i < times.length; i++) {
    const slotHour = new Date(times[i] + 'Z').getUTCHours();
    if (slotHour < currentHour) continue;
    if ((slotHour - currentHour) % 3 !== 0) continue;

    const { description, emoji } = mapWeatherCode(codes[i]);
    results.push({
      time: `${String(slotHour).padStart(2, '0')}:00`,
      temp: Math.round(temps[i]),
      description,
      emoji,
    });

    if (results.length >= 6) break;
  }

  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest lib/__tests__/weather.test.ts --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/weather.ts lib/__tests__/weather.test.ts
git commit -m "feat: add weather code mapping and hourly filter utilities"
```

---

## Task 5: Markets Library + API Route

**Files:**
- Create: `lib/markets.ts`
- Create: `lib/__tests__/markets.test.ts`
- Create: `app/api/markets/route.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/markets.test.ts`:

```typescript
// @jest-environment node
import { fetchMarketData } from '../markets';

jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: {
    quote: jest.fn(),
  },
}));

import yahooFinance from 'yahoo-finance2';

describe('fetchMarketData', () => {
  it('returns mapped ticker data for each configured ticker', async () => {
    (yahooFinance.quote as jest.Mock).mockResolvedValue({
      regularMarketPrice: 5142.3,
      regularMarketChange: 40.5,
      regularMarketChangePercent: 0.794,
    });

    const result = await fetchMarketData([
      { symbol: '^STOXX50E', label: 'EURO STOXX 50' },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      symbol: '^STOXX50E',
      label: 'EURO STOXX 50',
      price: 5142.3,
      change: 40.5,
      changePercent: 0.794,
    });
  });

  it('handles quote failure gracefully by returning null price', async () => {
    (yahooFinance.quote as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await fetchMarketData([{ symbol: 'BAD', label: 'Bad Ticker' }]);

    expect(result).toHaveLength(1);
    expect(result[0].price).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/markets.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../markets'`

- [ ] **Step 3: Create `lib/markets.ts`**

```typescript
import yahooFinance from 'yahoo-finance2';
import type { TickerData } from '../types';

interface TickerConfig {
  symbol: string;
  label: string;
}

export async function fetchMarketData(tickers: TickerConfig[]): Promise<TickerData[]> {
  return Promise.all(
    tickers.map(async ({ symbol, label }) => {
      try {
        const quote = await yahooFinance.quote(symbol);
        return {
          symbol,
          label,
          price: quote.regularMarketPrice ?? null,
          change: quote.regularMarketChange ?? null,
          changePercent: quote.regularMarketChangePercent ?? null,
        };
      } catch {
        return { symbol, label, price: null, change: null, changePercent: null };
      }
    }),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest lib/__tests__/markets.test.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Create `app/api/markets/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { fetchMarketData } from '@/lib/markets';
import { TICKERS } from '@/config';

export async function GET() {
  try {
    const data = await fetchMarketData(TICKERS);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/markets.ts lib/__tests__/markets.test.ts app/api/markets/route.ts types.ts
git commit -m "feat: markets library and API route"
```

---

## Task 6: Energy Library + API Route

**Files:**
- Create: `lib/energy.ts`
- Create: `lib/__tests__/energy.test.ts`
- Create: `app/api/energy/route.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/energy.test.ts`:

```typescript
// @jest-environment node
import { fetchEnergyData } from '../energy';

jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: {
    quote: jest.fn(),
  },
}));

import yahooFinance from 'yahoo-finance2';

const MOCK_ELERING_RESPONSE = {
  success: true,
  data: {
    ee: [
      { timestamp: 1714003200, price: 80.0 },
      { timestamp: 1714006800, price: 41.0 },
      { timestamp: 1714010400, price: 95.5 },
      { timestamp: 1714014000, price: 100.0 },
    ],
  },
};

describe('fetchEnergyData', () => {
  beforeEach(() => {
    (yahooFinance.quote as jest.Mock).mockResolvedValue({
      regularMarketPrice: 83.4,
      regularMarketChange: -0.3,
      regularMarketChangePercent: -0.36,
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ELERING_RESPONSE,
    }) as jest.Mock;
  });

  it('returns Brent crude data from yahoo-finance2', async () => {
    const result = await fetchEnergyData();
    expect(result.brent.price).toBe(83.4);
    expect(result.brent.label).toBe('Brent Crude');
  });

  it('returns Nord Pool stats computed from Elering data', async () => {
    const result = await fetchEnergyData();
    expect(result.nordPool.minPrice).toBe(41.0);
    expect(result.nordPool.avgPrice).toBe(79.1);
    expect(result.nordPool.minHour).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns null prices when Elering fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.Mock;
    const result = await fetchEnergyData();
    expect(result.nordPool.avgPrice).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/energy.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../energy'`

- [ ] **Step 3: Create `lib/energy.ts`**

```typescript
import yahooFinance from 'yahoo-finance2';
import type { EnergyData } from '../types';
import { computeNordPoolStats } from './nordpool';

function getTodayEETRange(): { start: string; end: string } {
  const dateStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Tallinn' });
  // EEST is UTC+3 in summer (Apr–Oct), EET is UTC+2 in winter.
  // Hardcoding +03:00 is correct for the hackathon (April). A production version
  // would derive the offset dynamically.
  return {
    start: `${dateStr}T00:00:00+03:00`,
    end: `${dateStr}T23:59:59+03:00`,
  };
}

export async function fetchEnergyData(): Promise<EnergyData> {
  const [brentQuote, nordPoolData] = await Promise.allSettled([
    yahooFinance.quote('BZ=F'),
    fetchNordPool(),
  ]);

  const brent = {
    symbol: 'BZ=F',
    label: 'Brent Crude',
    price: brentQuote.status === 'fulfilled' ? (brentQuote.value.regularMarketPrice ?? null) : null,
    change: brentQuote.status === 'fulfilled' ? (brentQuote.value.regularMarketChange ?? null) : null,
    changePercent: brentQuote.status === 'fulfilled' ? (brentQuote.value.regularMarketChangePercent ?? null) : null,
  };

  const nordPool =
    nordPoolData.status === 'fulfilled'
      ? nordPoolData.value
      : { avgPrice: 0, minPrice: 0, minHour: '--:--' };

  return { brent, nordPool };
}

async function fetchNordPool() {
  const { start, end } = getTodayEETRange();
  const url = `https://dashboard.elering.ee/api/nps/price?fields=ee&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Elering API error: ${res.status}`);
  const json = await res.json();
  const prices: { timestamp: number; price: number }[] = json.data.ee;
  return computeNordPoolStats(prices);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest lib/__tests__/energy.test.ts --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Create `app/api/energy/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { fetchEnergyData } from '@/lib/energy';

export async function GET() {
  try {
    const data = await fetchEnergyData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch energy data' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/energy.ts lib/__tests__/energy.test.ts app/api/energy/route.ts
git commit -m "feat: energy library and API route"
```

---

## Task 7: Weather Library + API Route

**Files:**
- Create: `lib/weather-api.ts`
- Create: `lib/__tests__/weather-api.test.ts`
- Create: `app/api/weather/route.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/weather-api.test.ts`:

```typescript
// @jest-environment node
import { fetchWeatherData } from '../weather-api';

const MOCK_OPEN_METEO = {
  current: {
    temperature_2m: 8.2,
    weather_code: 2,
  },
  hourly: {
    time: [
      '2024-04-24T00:00', '2024-04-24T03:00', '2024-04-24T06:00',
      '2024-04-24T09:00', '2024-04-24T12:00', '2024-04-24T15:00',
      '2024-04-24T18:00', '2024-04-24T21:00',
    ],
    temperature_2m: [5, 5, 6, 8, 11, 10, 8, 7],
    weather_code: [0, 0, 1, 2, 2, 3, 61, 61],
  },
};

describe('fetchWeatherData', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_OPEN_METEO,
    }) as jest.Mock;
  });

  it('returns current temperature rounded to integer', async () => {
    const result = await fetchWeatherData({ lat: 59.437, lon: 24.7536 });
    expect(result.currentTemp).toBe(8);
  });

  it('returns current weather description and emoji', async () => {
    const result = await fetchWeatherData({ lat: 59.437, lon: 24.7536 });
    expect(result.description).toBe('Partly cloudy');
    expect(result.emoji).toBe('⛅');
  });

  it('returns hourly forecast slots', async () => {
    const result = await fetchWeatherData({ lat: 59.437, lon: 24.7536 });
    expect(Array.isArray(result.hourly)).toBe(true);
    result.hourly.forEach(slot => {
      expect(slot).toHaveProperty('time');
      expect(slot).toHaveProperty('temp');
      expect(slot).toHaveProperty('emoji');
    });
  });

  it('throws when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as jest.Mock;
    await expect(fetchWeatherData({ lat: 59.437, lon: 24.7536 })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/weather-api.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../weather-api'`

- [ ] **Step 3: Create `lib/weather-api.ts`**

```typescript
import type { WeatherData } from '../types';
import { mapWeatherCode, filterRemainingHourly } from './weather';

interface Coords {
  lat: number;
  lon: number;
}

export async function fetchWeatherData(coords: Coords): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    current: 'temperature_2m,weather_code',
    hourly: 'temperature_2m,weather_code',
    forecast_days: '1',
    timezone: 'Europe/Tallinn',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);
  const json = await res.json();

  const currentTemp = Math.round(json.current.temperature_2m);
  const { description, emoji } = mapWeatherCode(json.current.weather_code);

  const hourly = filterRemainingHourly(
    json.hourly.time,
    json.hourly.temperature_2m,
    json.hourly.weather_code,
  );

  return { currentTemp, description, emoji, hourly };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest lib/__tests__/weather-api.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Create `app/api/weather/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { fetchWeatherData } from '@/lib/weather-api';
import { TALLINN_COORDS } from '@/config';

export async function GET() {
  try {
    const data = await fetchWeatherData(TALLINN_COORDS);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Run all tests to make sure nothing is broken**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/weather-api.ts lib/__tests__/weather-api.test.ts app/api/weather/route.ts
git commit -m "feat: weather library and API route"
```

---

## Task 8: Widget Component

**Files:**
- Create: `app/components/Widget.tsx`
- Create: `app/components/__tests__/Widget.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/components/__tests__/Widget.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import Widget from '../Widget';

describe('Widget', () => {
  it('renders label and value', () => {
    render(<Widget label="EURO STOXX 50" value="5,142" />);
    expect(screen.getByText('EURO STOXX 50')).toBeInTheDocument();
    expect(screen.getByText('5,142')).toBeInTheDocument();
  });

  it('renders sub-value when provided', () => {
    render(<Widget label="Test" value="100" subValue="+0.8%" />);
    expect(screen.getByText('+0.8%')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading=true', () => {
    const { container } = render(<Widget label="Test" value="" loading />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error message when error is provided', () => {
    render(<Widget label="Test" value="" error="Failed to load" />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest app/components/__tests__/Widget.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../Widget'`

- [ ] **Step 3: Create `app/components/Widget.tsx`**

```typescript
interface WidgetProps {
  label: string;
  value: string;
  subValue?: string;
  subValueColor?: 'green' | 'red' | 'neutral';
  loading?: boolean;
  error?: string;
}

export default function Widget({
  label,
  value,
  subValue,
  subValueColor = 'neutral',
  loading = false,
  error,
}: WidgetProps) {
  const subColors = {
    green: 'text-green-600',
    red: 'text-red-500',
    neutral: 'text-gray-500',
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
        <div className="h-7 bg-gray-200 rounded w-20 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-16" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">
        {label}
      </p>
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subValue && (
            <p className={`text-sm mt-1 font-medium ${subColors[subValueColor]}`}>
              {subValue}
            </p>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest app/components/__tests__/Widget.test.tsx --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/components/Widget.tsx app/components/__tests__/Widget.test.tsx
git commit -m "feat: Widget shared card component"
```

---

## Task 9: MarketsSection Component

**Files:**
- Create: `app/components/MarketsSection.tsx`
- Create: `app/components/__tests__/MarketsSection.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/components/__tests__/MarketsSection.test.tsx`:

```typescript
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
    expect(screen.getByText('Markets')).toBeInTheDocument();
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

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest app/components/__tests__/MarketsSection.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../MarketsSection'`

- [ ] **Step 3: Create `app/components/MarketsSection.tsx`**

```typescript
import type { TickerData } from '@/types';
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

function formatChange(change: number, changePercent: number): { text: string; color: 'green' | 'red' } {
  const arrow = change >= 0 ? '▲' : '▼';
  const sign = changePercent >= 0 ? '+' : '−';
  const abs = Math.abs(changePercent).toFixed(2);
  return {
    text: `${arrow} ${sign}${abs}%`,
    color: change >= 0 ? 'green' : 'red',
  };
}

export default function MarketsSection({ data, loading, error }: Props) {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
        Markets
      </h2>
      <div className="flex gap-4 flex-wrap">
        {loading
          ? [1, 2].map(i => <div key={i} className="flex-1 min-w-40"><Widget label="" value="" loading /></div>)
          : error
          ? <p className="text-sm text-red-400">{error}</p>
          : data.map(ticker => {
              if (ticker.price == null) {
                return <Widget key={ticker.symbol} label={ticker.label} value="—" error="Unavailable" />;
              }
              const { text, color } = formatChange(ticker.change!, ticker.changePercent!);
              return (
                <div key={ticker.symbol} className="flex-1 min-w-40">
                  <Widget
                    label={ticker.label}
                    value={formatPrice(ticker.price, ticker.symbol)}
                    subValue={text}
                    subValueColor={color}
                  />
                </div>
              );
            })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest app/components/__tests__/MarketsSection.test.tsx --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/components/MarketsSection.tsx app/components/__tests__/MarketsSection.test.tsx
git commit -m "feat: MarketsSection component"
```

---

## Task 10: EnergySection Component

**Files:**
- Create: `app/components/EnergySection.tsx`
- Create: `app/components/__tests__/EnergySection.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/components/__tests__/EnergySection.test.tsx`:

```typescript
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
    expect(screen.getByText('Energy')).toBeInTheDocument();
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

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest app/components/__tests__/EnergySection.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../EnergySection'`

- [ ] **Step 3: Create `app/components/EnergySection.tsx`**

```typescript
import type { EnergyData } from '@/types';
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
        Energy
      </h2>
      <div className="flex gap-4 flex-wrap">
        {loading ? (
          <>
            <div className="flex-1 min-w-40"><Widget label="" value="" loading /></div>
            <div className="flex-1 min-w-40"><Widget label="" value="" loading /></div>
          </>
        ) : error || !data ? (
          <p className="text-sm text-red-400">{error ?? 'Unavailable'}</p>
        ) : (
          <>
            <div className="flex-1 min-w-40">
              <Widget
                label="Brent Crude"
                value={data.brent.price != null ? `$${data.brent.price.toFixed(2)}` : '—'}
                subValue={
                  data.brent.changePercent != null
                    ? `${data.brent.changePercent >= 0 ? '▲ +' : '▼ −'}${Math.abs(data.brent.changePercent).toFixed(2)}%`
                    : undefined
                }
                subValueColor={
                  data.brent.changePercent != null
                    ? data.brent.changePercent >= 0 ? 'green' : 'red'
                    : 'neutral'
                }
              />
            </div>
            <div className="flex-1 min-w-40">
              <Widget
                label="Nord Pool EE"
                value={`${data.nordPool.avgPrice} €/MWh`}
                subValue={`Low ${data.nordPool.minPrice} € @ ${data.nordPool.minHour}`}
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

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest app/components/__tests__/EnergySection.test.tsx --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/components/EnergySection.tsx app/components/__tests__/EnergySection.test.tsx
git commit -m "feat: EnergySection component"
```

---

## Task 11: WeatherSection Component

**Files:**
- Create: `app/components/WeatherSection.tsx`
- Create: `app/components/__tests__/WeatherSection.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/components/__tests__/WeatherSection.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import WeatherSection from '../WeatherSection';
import type { WeatherData } from '@/types';

const MOCK_DATA: WeatherData = {
  currentTemp: 8,
  description: 'Partly cloudy',
  emoji: '⛅',
  hourly: [
    { time: '12:00', temp: 11, description: 'Partly cloudy', emoji: '⛅' },
    { time: '15:00', temp: 10, description: 'Overcast', emoji: '☁️' },
    { time: '18:00', temp: 8, description: 'Rain', emoji: '🌧️' },
  ],
};

describe('WeatherSection', () => {
  it('renders section heading', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('Weather · Tallinn')).toBeInTheDocument();
  });

  it('renders current temperature and emoji', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('8°C ⛅')).toBeInTheDocument();
  });

  it('renders current weather description', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument();
  });

  it('renders hourly forecast times', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('12:00')).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest app/components/__tests__/WeatherSection.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../WeatherSection'`

- [ ] **Step 3: Create `app/components/WeatherSection.tsx`**

```typescript
import type { WeatherData } from '@/types';

interface Props {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
}

export default function WeatherSection({ data, loading, error }: Props) {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
        Weather · Tallinn
      </h2>
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-28 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
          <div className="flex gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-200 rounded flex-1" />)}
          </div>
        </div>
      ) : error || !data ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-red-400">{error ?? 'Unavailable'}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-4xl font-bold text-gray-900 mb-1">
            {data.currentTemp}°C {data.emoji}
          </p>
          <p className="text-sm text-gray-500 mb-4">{data.description}</p>
          {data.hourly.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {data.hourly.map(slot => (
                <div
                  key={slot.time}
                  className="flex flex-col items-center bg-gray-50 rounded-lg px-3 py-2 min-w-14"
                >
                  <span className="text-xs text-gray-400 mb-1">{slot.time}</span>
                  <span className="text-lg">{slot.emoji}</span>
                  <span className="text-sm font-semibold text-gray-700">{slot.temp}°</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest app/components/__tests__/WeatherSection.test.tsx --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/components/WeatherSection.tsx app/components/__tests__/WeatherSection.test.tsx
git commit -m "feat: WeatherSection component"
```

---

## Task 12: Dashboard Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Run all existing tests to confirm baseline**

```bash
npx jest --no-coverage
```

Expected: All previous tests pass.

- [ ] **Step 2: Replace `app/page.tsx` with the dashboard**

```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EnergyData, TickerData, WeatherData } from '@/types';
import EnergySection from './components/EnergySection';
import MarketsSection from './components/MarketsSection';
import WeatherSection from './components/WeatherSection';

interface DashboardState {
  markets: { data: TickerData[]; loading: boolean; error: string | null };
  energy: { data: EnergyData | null; loading: boolean; error: string | null };
  weather: { data: WeatherData | null; loading: boolean; error: string | null };
}

const INITIAL_STATE: DashboardState = {
  markets: { data: [], loading: true, error: null },
  energy: { data: null, loading: true, error: null },
  weather: { data: null, loading: true, error: null },
};

function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Tallinn',
  });
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>(INITIAL_STATE);

  const fetchAll = useCallback(async () => {
    setState(INITIAL_STATE);

    const [marketsRes, energyRes, weatherRes] = await Promise.allSettled([
      fetch('/api/markets').then(r => r.json()),
      fetch('/api/energy').then(r => r.json()),
      fetch('/api/weather').then(r => r.json()),
    ]);

    setState({
      markets: {
        data: marketsRes.status === 'fulfilled' ? marketsRes.value : [],
        loading: false,
        error: marketsRes.status === 'rejected' ? 'Failed to load markets' : null,
      },
      energy: {
        data: energyRes.status === 'fulfilled' ? energyRes.value : null,
        loading: false,
        error: energyRes.status === 'rejected' ? 'Failed to load energy data' : null,
      },
      weather: {
        data: weatherRes.status === 'fulfilled' ? weatherRes.value : null,
        loading: false,
        error: weatherRes.status === 'rejected' ? 'Failed to load weather' : null,
      },
    });
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Morning Brief</h1>
            <p className="text-sm text-gray-400 mt-0.5">{todayLabel()}</p>
          </div>
          <button
            onClick={fetchAll}
            className="text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
            title="Refresh"
            aria-label="Refresh dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        </header>

        <div className="space-y-6">
          <MarketsSection
            data={state.markets.data}
            loading={state.markets.loading}
            error={state.markets.error}
          />
          <div className="grid grid-cols-5 gap-6">
            <div className="col-span-3">
              <EnergySection
                data={state.energy.data}
                loading={state.energy.loading}
                error={state.energy.error}
              />
            </div>
            <div className="col-span-2">
              <WeatherSection
                data={state.weather.data}
                loading={state.weather.loading}
                error={state.weather.error}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: dashboard page with fetch orchestration and loading states"
```

---

## Task 13: Layout Polish and Final Cleanup

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Update `app/layout.tsx` with metadata**

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Morning Brief',
  description: 'Personal morning dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Simplify `app/globals.css` to just Tailwind directives**

Replace the entire file content:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Run all tests one final time**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 4: Verify the app runs and looks correct**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: Dashboard loads with skeleton cards, then populates with live data within a few seconds. Verify all three sections appear. Stop with Ctrl+C.

- [ ] **Step 5: Final commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: dashboard layout polish and final cleanup"
```
