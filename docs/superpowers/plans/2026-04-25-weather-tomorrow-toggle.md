# Weather Tomorrow Toggle + Chart Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Täna/Homme day toggle to the weather widget, change hourly snapshot times to 10/14/18/22, and make the temperature chart taller with visible axes.

**Architecture:** Extend `WeatherData` with a `tomorrow` sub-object. Generalize `filterRemainingHourly` and `buildDailyChart` in `lib/weather.ts` to accept a `targetDateStr` string instead of a `Date`, then call them twice in `weather-api.ts` — once for today, once for tomorrow. The component holds `selectedDay` state and renders different content for each day.

**Tech Stack:** TypeScript, React (Next.js), Recharts, Jest + React Testing Library

---

## File Map

| File | Action | What changes |
|---|---|---|
| `types.ts` | Modify | Add `tomorrow: { hourly, dailyChart }` to `WeatherData` |
| `lib/weather.ts` | Modify | Export `getTallinnDateStr`; change `filterRemainingHourly` + `buildDailyChart` signatures to accept `targetDateStr: string`; change target hours to `[10, 14, 18, 22]` |
| `lib/__tests__/weather.test.ts` | Modify | Update all calls to pass `targetDateStr` string; update fixtures and expected values |
| `lib/weather-api.ts` | Modify | Compute `todayStr`/`tomorrowStr`, call both functions twice, return `tomorrow` in result |
| `lib/__tests__/weather-api.test.ts` | Modify | Add `tomorrow` shape assertions; expand mock data to include tomorrow's slots |
| `app/components/WeatherSection.tsx` | Modify | Add `selectedDay` state, tomorrow view, toggle buttons, chart height 140px, visible YAxis |
| `app/components/__tests__/WeatherSection.test.tsx` | Modify | Update `MOCK_DATA` for new hourly times + `tomorrow` field; add toggle tests; update next-slot tests |

---

### Task 1: Update `types.ts` — add `tomorrow` to `WeatherData`

**Files:**
- Modify: `types.ts`

- [ ] **Step 1: Add the `tomorrow` field**

In `types.ts`, replace the `WeatherData` interface with:

```ts
export interface WeatherData {
  current: {
    temp: number;
    description: string;
    emoji: string;
  };
  hourly: HourlySlot[];
  dailyChart: TempPoint[];
  tomorrow: {
    hourly: HourlySlot[];
    dailyChart: TempPoint[];
  };
}
```

- [ ] **Step 2: Verify TypeScript catches existing usages**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: errors in `weather-api.ts` (doesn't return `tomorrow` yet) and `WeatherSection.test.tsx` (mock missing `tomorrow`). These will be fixed in later tasks. No errors in `types.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add types.ts
git commit -m "feat(types): add tomorrow field to WeatherData"
```

---

### Task 2: Refactor `lib/weather.ts` — new signatures and target hours

**Files:**
- Modify: `lib/weather.ts`
- Modify: `lib/__tests__/weather.test.ts`

- [ ] **Step 1: Write failing tests for the new `filterRemainingHourly` signature**

Replace the entire `describe('filterRemainingHourly', ...)` block in `lib/__tests__/weather.test.ts` with:

```ts
describe('filterRemainingHourly', () => {
  // April 2024: Tallinn is UTC+3 (EEST)
  // 10:00 Tallinn = 07:00 UTC = '2024-04-24T07:00'
  // 14:00 Tallinn = 11:00 UTC = '2024-04-24T11:00'
  // 18:00 Tallinn = 15:00 UTC = '2024-04-24T15:00'
  // 22:00 Tallinn = 19:00 UTC = '2024-04-24T19:00'
  const times = [
    '2024-04-24T00:00', '2024-04-24T01:00', '2024-04-24T02:00',
    '2024-04-24T03:00', '2024-04-24T04:00', '2024-04-24T05:00',
    '2024-04-24T06:00',
    '2024-04-24T07:00', // 10:00 Tallinn
    '2024-04-24T08:00', '2024-04-24T09:00', '2024-04-24T10:00',
    '2024-04-24T11:00', // 14:00 Tallinn
    '2024-04-24T12:00', '2024-04-24T13:00', '2024-04-24T14:00',
    '2024-04-24T15:00', // 18:00 Tallinn
    '2024-04-24T16:00', '2024-04-24T17:00', '2024-04-24T18:00',
    '2024-04-24T19:00', // 22:00 Tallinn
    '2024-04-24T20:00', '2024-04-24T21:00', '2024-04-24T22:00', '2024-04-24T23:00',
  ];
  const temps = times.map((_, i) => 10 + i);
  const codes = times.map(() => 0);

  it('returns slots at 10:00, 14:00, 18:00, 22:00 for the given date', () => {
    const result = filterRemainingHourly(times, temps, codes, '2024-04-24');
    expect(result.map(s => s.time)).toEqual(['10:00', '14:00', '18:00', '22:00']);
  });

  it('returns correct temperatures for matched slots', () => {
    const result = filterRemainingHourly(times, temps, codes, '2024-04-24');
    // index 7 → 10:00 Tallinn: temp = 10+7 = 17
    // index 11 → 14:00 Tallinn: temp = 10+11 = 21
    expect(result[0].temp).toBe(17);
    expect(result[1].temp).toBe(21);
  });

  it('returns empty array when no slots match the given date', () => {
    const result = filterRemainingHourly(times, temps, codes, '2024-04-25');
    expect(result).toEqual([]);
  });

  it('returns correct emoji and description for each slot', () => {
    const result = filterRemainingHourly(times, temps, codes, '2024-04-24');
    result.forEach((slot: HourlySlot) => {
      expect(slot.time).toMatch(/^\d{2}:\d{2}$/);
      expect(slot.emoji).toBeTruthy();
      expect(slot.description).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Update the `buildDailyChart` tests to use `targetDateStr`**

Replace the `const now = new Date('2024-04-24T10:00:00Z');` line and all calls to `buildDailyChart(times, temps, now)` in the `describe('buildDailyChart', ...)` block with `buildDailyChart(times, temps, '2024-04-24')`:

```ts
describe('buildDailyChart', () => {
  // April 2024: Tallinn is UTC+3 (EEST)
  // today (2024-04-24 Tallinn) spans 2024-04-23T21:00Z → 2024-04-24T20:00Z (24 hours)
  const todayTimes = [
    '2024-04-23T21:00', // hour 0
    '2024-04-23T22:00', // hour 1
    '2024-04-23T23:00', // hour 2
    '2024-04-24T00:00', // hour 3
    '2024-04-24T01:00', // hour 4
    '2024-04-24T02:00', // hour 5
    '2024-04-24T03:00', // hour 6
    '2024-04-24T04:00', // hour 7
    '2024-04-24T05:00', // hour 8
    '2024-04-24T06:00', // hour 9
    '2024-04-24T07:00', // hour 10
    '2024-04-24T08:00', // hour 11
    '2024-04-24T09:00', // hour 12
    '2024-04-24T10:00', // hour 13
    '2024-04-24T11:00', // hour 14
    '2024-04-24T12:00', // hour 15
    '2024-04-24T13:00', // hour 16
    '2024-04-24T14:00', // hour 17
    '2024-04-24T15:00', // hour 18
    '2024-04-24T16:00', // hour 19
    '2024-04-24T17:00', // hour 20
    '2024-04-24T18:00', // hour 21
    '2024-04-24T19:00', // hour 22
    '2024-04-24T20:00', // hour 23
  ];
  // wrap with one slot before today and one after to verify exclusion
  const times = ['2024-04-23T20:00', ...todayTimes, '2024-04-24T21:00'];
  const temps = times.map((_, i) => i); // 0, 1, 2, …

  it('returns exactly 24 points for a full day', () => {
    const result = buildDailyChart(times, temps, '2024-04-24');
    expect(result).toHaveLength(24);
  });

  it('returns hours 0 through 23 in order', () => {
    const result = buildDailyChart(times, temps, '2024-04-24');
    expect(result.map(p => p.hour)).toEqual(
      Array.from({ length: 24 }, (_, i) => i),
    );
  });

  it('rounds temperatures to integers', () => {
    const fracTemps = times.map((_, i) => i + 0.7);
    const result = buildDailyChart(times, fracTemps, '2024-04-24');
    result.forEach(p => expect(Number.isInteger(p.temp)).toBe(true));
  });

  it('excludes slots outside the target date in Tallinn', () => {
    const result = buildDailyChart(times, temps, '2024-04-24');
    expect(result).toHaveLength(24); // 26 inputs → only 24 pass the date filter
  });

  it('returns empty array when no data matches the date', () => {
    const result = buildDailyChart([], [], '2024-04-24');
    expect(result).toEqual([]);
  });

  it('maps correct temp to each hour (spot check)', () => {
    const result = buildDailyChart(times, temps, '2024-04-24');
    // todayTimes[0] is at index 1 in `times`, so temp = 1 → hour 0
    expect(result[0]).toEqual({ hour: 0, temp: 1 });
    // todayTimes[23] is at index 24 in `times`, so temp = 24 → hour 23
    expect(result[23]).toEqual({ hour: 23, temp: 24 });
  });

  it('returns only tomorrow data when given tomorrow date', () => {
    // todayTimes are all 2024-04-24 Tallinn, so requesting 2024-04-25 returns nothing
    const result = buildDailyChart(times, temps, '2024-04-25');
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

```bash
npx jest lib/__tests__/weather.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — TypeScript errors because `filterRemainingHourly` and `buildDailyChart` still expect `now: Date` as 4th argument.

- [ ] **Step 4: Update `lib/weather.ts` — export `getTallinnDateStr`, new signatures, new target hours**

Replace the entire contents of `lib/weather.ts` with:

```ts
import type { HourlySlot, TempPoint } from '../types';

interface WeatherCondition {
  description: string;
  emoji: string;
}

const WMO_CODES: Record<number, WeatherCondition> = {
  0:  { description: 'Selge taevas',          emoji: '☀️' },
  1:  { description: 'Peamiselt selge',        emoji: '🌤️' },
  2:  { description: 'Osaliselt pilves',       emoji: '⛅' },
  3:  { description: 'Pilves',                 emoji: '☁️' },
  45: { description: 'Udu',                   emoji: '🌫️' },
  48: { description: 'Jäine udu',             emoji: '🌫️' },
  51: { description: 'Kerge uduvihm',         emoji: '🌦️' },
  53: { description: 'Uduvihm',               emoji: '🌦️' },
  55: { description: 'Tugev uduvihm',         emoji: '🌧️' },
  61: { description: 'Kerge vihm',            emoji: '🌧️' },
  63: { description: 'Vihm',                  emoji: '🌧️' },
  65: { description: 'Tugev vihm',            emoji: '🌧️' },
  71: { description: 'Kerge lumesadu',        emoji: '🌨️' },
  73: { description: 'Lumi',                  emoji: '🌨️' },
  75: { description: 'Tugev lumesadu',        emoji: '❄️' },
  80: { description: 'Vihmahoog',             emoji: '🌦️' },
  81: { description: 'Tugev vihmahoog',       emoji: '🌧️' },
  82: { description: 'Väga tugev vihmahoog',  emoji: '⛈️' },
  95: { description: 'Äike',                  emoji: '⛈️' },
  96: { description: 'Äike ja rahe',          emoji: '⛈️' },
  99: { description: 'Äike ja rahe',          emoji: '⛈️' },
};

export function mapWeatherCode(code: number): WeatherCondition {
  return WMO_CODES[code] ?? { description: 'Teadmata', emoji: '🌡️' };
}

const TALLINN_TZ = 'Europe/Tallinn';

function getTallinnHour(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      hourCycle: 'h23',
      timeZone: TALLINN_TZ,
    }).format(date),
    10,
  );
}

export function getTallinnDateStr(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: TALLINN_TZ });
}

const TARGET_HOURS = [10, 14, 18, 22];

export function filterRemainingHourly(
  times: string[],
  temps: number[],
  codes: number[],
  targetDateStr: string,
): HourlySlot[] {
  const results: HourlySlot[] = [];

  for (let i = 0; i < times.length; i++) {
    const slotDate = new Date(times[i] + 'Z');
    if (getTallinnDateStr(slotDate) !== targetDateStr) continue;
    const hour = getTallinnHour(slotDate);
    if (!TARGET_HOURS.includes(hour)) continue;

    const { description, emoji } = mapWeatherCode(codes[i]);
    results.push({
      time: `${String(hour).padStart(2, '0')}:00`,
      temp: Math.round(temps[i]),
      description,
      emoji,
    });
  }

  return results;
}

export function buildDailyChart(
  times: string[],
  temps: number[],
  targetDateStr: string,
): TempPoint[] {
  const results: TempPoint[] = [];

  for (let i = 0; i < times.length; i++) {
    const slotDate = new Date(times[i] + 'Z');
    if (getTallinnDateStr(slotDate) !== targetDateStr) continue;
    results.push({
      hour: getTallinnHour(slotDate),
      temp: Math.round(temps[i]),
    });
  }

  return results;
}
```

- [ ] **Step 5: Run tests and confirm they pass**

```bash
npx jest lib/__tests__/weather.test.ts --no-coverage 2>&1 | tail -20
```

Expected: PASS — all `filterRemainingHourly` and `buildDailyChart` tests green.

- [ ] **Step 6: Commit**

```bash
git add lib/weather.ts lib/__tests__/weather.test.ts
git commit -m "feat(weather): generalize filterRemainingHourly and buildDailyChart to accept targetDateStr; change hourly slots to 10/14/18/22"
```

---

### Task 3: Update `lib/weather-api.ts` — build today + tomorrow data

**Files:**
- Modify: `lib/weather-api.ts`
- Modify: `lib/__tests__/weather-api.test.ts`

- [ ] **Step 1: Write failing test for `tomorrow` shape**

Add the following test to `lib/__tests__/weather-api.test.ts`. First, expand `MOCK_OPEN_METEO` to include tomorrow's slots (replace the existing `MOCK_OPEN_METEO` constant):

```ts
const MOCK_OPEN_METEO = {
  current: {
    temperature_2m: 8.2,
    weather_code: 2,
  },
  hourly: {
    time: [
      // 2024-04-24 Tallinn (today) — key Tallinn hours at UTC offsets
      '2024-04-23T21:00', // hour 0 Tallinn on 2024-04-24
      '2024-04-24T07:00', // 10:00 Tallinn
      '2024-04-24T11:00', // 14:00 Tallinn
      '2024-04-24T15:00', // 18:00 Tallinn
      '2024-04-24T19:00', // 22:00 Tallinn
      // 2024-04-25 Tallinn (tomorrow)
      '2024-04-24T21:00', // hour 0 Tallinn on 2024-04-25
      '2024-04-25T07:00', // 10:00 Tallinn tomorrow
      '2024-04-25T11:00', // 14:00 Tallinn tomorrow
      '2024-04-25T15:00', // 18:00 Tallinn tomorrow
      '2024-04-25T19:00', // 22:00 Tallinn tomorrow
    ],
    temperature_2m: [3, 9, 12, 10, 7, 2, 8, 13, 11, 8],
    weather_code:   [0, 1,  2,  3, 0, 1,  2,  3,  0, 1],
  },
};
```

Then add this test inside `describe('fetchWeatherData', ...)`:

```ts
it('returns tomorrow with hourly and dailyChart arrays', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2024-04-24T10:00:00Z'));
  const result = await fetchWeatherData({ lat: 59.437, lon: 24.7536 });
  expect(result.tomorrow).toBeDefined();
  expect(Array.isArray(result.tomorrow.hourly)).toBe(true);
  expect(Array.isArray(result.tomorrow.dailyChart)).toBe(true);
  result.tomorrow.hourly.forEach(slot => {
    expect(slot).toHaveProperty('time');
    expect(slot).toHaveProperty('temp');
    expect(slot).toHaveProperty('emoji');
  });
  jest.useRealTimers();
});
```

- [ ] **Step 2: Run tests to confirm the new test fails**

```bash
npx jest lib/__tests__/weather-api.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `result.tomorrow` is undefined.

- [ ] **Step 3: Update `lib/weather-api.ts`**

Replace the entire contents of `lib/weather-api.ts` with:

```ts
import type { WeatherData } from '../types';
import { mapWeatherCode, filterRemainingHourly, buildDailyChart, getTallinnDateStr } from './weather';

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
    forecast_days: '2',
    timezone: 'UTC',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);
  const json = await res.json();

  const now = new Date();
  const todayStr = getTallinnDateStr(now);
  const tomorrowStr = getTallinnDateStr(new Date(now.getTime() + 86_400_000));

  const times: string[] = json.hourly.time;
  const temps: number[] = json.hourly.temperature_2m;
  const codes: number[] = json.hourly.weather_code;

  const currentTemp = Math.round(json.current.temperature_2m);
  const { description, emoji } = mapWeatherCode(json.current.weather_code);

  return {
    current: { temp: currentTemp, description, emoji },
    hourly: filterRemainingHourly(times, temps, codes, todayStr),
    dailyChart: buildDailyChart(times, temps, todayStr),
    tomorrow: {
      hourly: filterRemainingHourly(times, temps, codes, tomorrowStr),
      dailyChart: buildDailyChart(times, temps, tomorrowStr),
    },
  };
}
```

- [ ] **Step 4: Run tests and confirm all pass**

```bash
npx jest lib/__tests__/weather-api.test.ts --no-coverage 2>&1 | tail -20
```

Expected: PASS — all tests including the new `tomorrow` test green.

- [ ] **Step 5: Commit**

```bash
git add lib/weather-api.ts lib/__tests__/weather-api.test.ts
git commit -m "feat(weather-api): build today and tomorrow data; export getTallinnDateStr"
```

---

### Task 4: Write failing component tests for toggle behaviour

**Files:**
- Modify: `app/components/__tests__/WeatherSection.test.tsx`

- [ ] **Step 1: Update `MOCK_DATA` and add `fireEvent` import**

Replace the entire content of `app/components/__tests__/WeatherSection.test.tsx` with:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import WeatherSection from '../WeatherSection';
import type { WeatherData } from '@/types';

jest.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const MOCK_DATA: WeatherData = {
  current: {
    temp: 8,
    description: 'Osaliselt pilves',
    emoji: '⛅',
  },
  hourly: [
    { time: '10:00', temp: 7,  description: 'Peamiselt selge',  emoji: '🌤️' },
    { time: '14:00', temp: 11, description: 'Osaliselt pilves', emoji: '⛅' },
    { time: '18:00', temp: 8,  description: 'Vihm',             emoji: '🌧️' },
    { time: '22:00', temp: 5,  description: 'Pilves',           emoji: '☁️' },
  ],
  dailyChart: [
    { hour: 0,  temp: 3 },
    { hour: 6,  temp: 4 },
    { hour: 12, temp: 11 },
    { hour: 17, temp: 8 },
    { hour: 23, temp: 5 },
  ],
  tomorrow: {
    hourly: [
      { time: '10:00', temp: 6,  description: 'Peamiselt selge',  emoji: '🌤️' },
      { time: '14:00', temp: 10, description: 'Osaliselt pilves', emoji: '⛅' },
      { time: '18:00', temp: 9,  description: 'Vihm',             emoji: '🌧️' },
      { time: '22:00', temp: 4,  description: 'Pilves',           emoji: '☁️' },
    ],
    dailyChart: [
      { hour: 0,  temp: 2 },
      { hour: 12, temp: 10 },
      { hour: 23, temp: 4 },
    ],
  },
};

describe('WeatherSection', () => {
  it('renders section heading', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('Ilm · Tallinn')).toBeInTheDocument();
  });

  it('renders current temperature and emoji', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('8°C ⛅')).toBeInTheDocument();
  });

  it('renders current weather description', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('Osaliselt pilves')).toBeInTheDocument();
  });

  it('renders hourly forecast times', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
  });

  it('renders the temperature chart when dailyChart has data', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders the chart section label', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('Temperatuur täna')).toBeInTheDocument();
  });

  it('does not render chart when dailyChart is empty', () => {
    const data = { ...MOCK_DATA, dailyChart: [] };
    render(<WeatherSection data={data} loading={false} error={null} />);
    expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
  });

  it('shows error message on error', () => {
    render(<WeatherSection data={null} loading={false} error="Viga" />);
    expect(screen.getByText('Viga')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    render(<WeatherSection data={null} loading={true} error={null} />);
    expect(screen.queryByText('8°C ⛅')).not.toBeInTheDocument();
    expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
  });

  it('renders Täna and Homme toggle buttons', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByRole('button', { name: 'Täna' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Homme' })).toBeInTheDocument();
  });

  it('clicking Homme shows Homne prognoos and hides current temp', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Homme' }));
    expect(screen.getByText('Homne prognoos')).toBeInTheDocument();
    expect(screen.queryByText('8°C ⛅')).not.toBeInTheDocument();
  });

  it('clicking Homme switches to tomorrow slot temperatures', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    // Today's 14:00 slot shows 11° (unique to today — tomorrow has no 11° slot)
    expect(screen.getByText('11°')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Homme' }));
    // Tomorrow's 14:00 slot shows 10° (unique to tomorrow — today has no 10° slot)
    expect(screen.getByText('10°')).toBeInTheDocument();
    expect(screen.queryByText('11°')).not.toBeInTheDocument();
  });

  it('clicking Homme shows Temperatuur homme chart label', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Homme' }));
    expect(screen.getByText('Temperatuur homme')).toBeInTheDocument();
    expect(screen.queryByText('Temperatuur täna')).not.toBeInTheDocument();
  });

  it('clicking Täna after Homme restores today view', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Homme' }));
    fireEvent.click(screen.getByRole('button', { name: 'Täna' }));
    expect(screen.getByText('8°C ⛅')).toBeInTheDocument();
    expect(screen.queryByText('Homne prognoos')).not.toBeInTheDocument();
  });

  it('highlights the next upcoming slot with indigo styling', () => {
    // Pin clock to 10:00 Tallinn (07:00 UTC) — next slot after hour 10 is 14:00
    jest.useFakeTimers().setSystemTime(new Date('2024-04-24T07:00:00Z'));
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    const slots = document.querySelectorAll('[class*="rounded-lg"]');
    const slot14 = Array.from(slots).find(el => el.textContent?.includes('14:00'));
    expect(slot14?.className).toMatch(/bg-indigo-50/);
    jest.useRealTimers();
  });

  it('highlights first tomorrow slot (10:00) when Homme is selected', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Homme' }));
    const slots = document.querySelectorAll('[class*="rounded-lg"]');
    const slot10 = Array.from(slots).find(el => el.textContent?.includes('10:00'));
    expect(slot10?.className).toMatch(/bg-indigo-50/);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest app/components/__tests__/WeatherSection.test.tsx --no-coverage 2>&1 | tail -30
```

Expected: FAIL — `tomorrow` missing from `WeatherData`, toggle buttons not rendered, etc.

---

### Task 5: Implement `WeatherSection.tsx` changes

**Files:**
- Modify: `app/components/WeatherSection.tsx`

- [ ] **Step 1: Replace the component with the updated implementation**

Replace the entire contents of `app/components/WeatherSection.tsx` with:

```tsx
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
          <div className="h-[140px] bg-gray-200 rounded" />
        </div>
      ) : error || !data ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-red-400">{error ?? 'Pole saadaval'}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          {isTomorrow ? (
            <p className="text-xl font-semibold text-gray-400 mb-4">Homne prognoos</p>
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
              <ResponsiveContainer width="100%" height={140} minWidth={0}>
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
```

- [ ] **Step 2: Run the component tests**

```bash
npx jest app/components/__tests__/WeatherSection.test.tsx --no-coverage 2>&1 | tail -30
```

Expected: PASS — all tests green.

- [ ] **Step 3: Commit**

```bash
git add app/components/WeatherSection.tsx app/components/__tests__/WeatherSection.test.tsx
git commit -m "feat(WeatherSection): add Täna/Homme toggle, tomorrow view, 140px chart with axes"
```

---

### Task 6: Full test suite verification

**Files:** none

- [ ] **Step 1: Run the full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -30
```

Expected: All tests pass. No regressions.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: No errors.

- [ ] **Step 3: If any tests fail, fix before continuing**

Common issues to check:
- `weather-api.test.ts`: the existing `dailyChart` test uses `jest.useFakeTimers()` — verify it still works with the new `getTallinnDateStr` call in `fetchWeatherData` (it calls `new Date()` internally which respects fake timers).
- Any test that imported from `lib/weather.ts` with the old `now: Date` parameter — should all be updated in Task 2.
