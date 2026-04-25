# Weather Widget: Tomorrow Toggle + Chart Improvements

## Problem

The weather widget only shows today's conditions. Users cannot see tomorrow's forecast. The hourly snapshot times (06:00, 12:00, 18:00, 00:00) are poorly timed for daily use. The temperature chart is too small (72px) and has no axis labels, making it hard to read actual temperatures.

## Proposed Approach

Extend the existing `WeatherData` type with tomorrow's data (already fetched from Open-Meteo via `forecast_days: 2`). Add a `Täna` / `Homme` toggle to the weather card — styled identically to the range buttons on NordPool and other charts. Update hourly snapshot times to 10:00, 14:00, 18:00, 22:00. Make the temperature chart taller (140px) and show both axes.

---

## Data Model

**`types.ts`** — add `tomorrow` sub-object to `WeatherData`:

```ts
export interface WeatherData {
  current: {
    temp: number;
    description: string;
    emoji: string;
  };
  hourly: HourlySlot[];     // today: 10:00, 14:00, 18:00, 22:00
  dailyChart: TempPoint[];  // today: full 24h
  tomorrow: {
    hourly: HourlySlot[];     // tomorrow: 10:00, 14:00, 18:00, 22:00
    dailyChart: TempPoint[];  // tomorrow: full 24h
  };
}
```

`current` remains today-only (it is a live reading with no tomorrow equivalent). Existing consumers of the top-level fields (`hourly`, `dailyChart`, `current`) are unaffected except for needing to handle the new `tomorrow` field.

---

## Backend / Data Logic

### `lib/weather.ts`

**`filterRemainingHourly`** is generalized to accept a `targetDateStr: string` (Tallinn local date as `YYYY-MM-DD`) instead of always computing today + tomorrow internally. Target hours change from `[6, 12, 18]` (today) + `[0]` (tomorrow midnight) to `[10, 14, 18, 22]` for the given target date.

```ts
export function filterRemainingHourly(
  times: string[],
  temps: number[],
  codes: number[],
  targetDateStr: string,  // new param replaces now-based logic
): HourlySlot[]
```

**`buildDailyChart`** is generalized the same way, accepting `targetDateStr` instead of computing today from `now`:

```ts
export function buildDailyChart(
  times: string[],
  temps: number[],
  targetDateStr: string,
): TempPoint[]
```

The existing `now: Date` parameter is removed from both functions — the caller derives the date strings and passes them in. This makes the functions purely deterministic given a date string, which is easier to test.

### `lib/weather-api.ts`

`fetchWeatherData` computes today and tomorrow date strings once, then calls the generalized functions for each:

```ts
const todayStr = getTallinnDateStr(now)
// addOneDay: new Date(now.getTime() + 86_400_000)
const tomorrowStr = getTallinnDateStr(new Date(now.getTime() + 86_400_000))

return {
  current: { ... },
  hourly:    filterRemainingHourly(times, temps, codes, todayStr),
  dailyChart: buildDailyChart(times, temps, todayStr),
  tomorrow: {
    hourly:    filterRemainingHourly(times, temps, codes, tomorrowStr),
    dailyChart: buildDailyChart(times, temps, tomorrowStr),
  },
}
```

No change to the Open-Meteo API request — `forecast_days: '2'` already returns both days.

---

## Component (`WeatherSection.tsx`)

### State

```ts
const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow'>('today')
```

Defaults to `'today'`. Not persisted to `localStorage` — tomorrow becomes today every day, so persistence would be counterproductive.

### Today view (unchanged)

- Big current temperature + emoji (`data.current.temp`, `data.current.emoji`)
- Weather description (`data.current.description`)
- 4 hourly slots from `data.hourly`; next upcoming slot highlighted with indigo (existing logic)
- Temperature chart of `data.dailyChart` with "now" reference line
- Chart label: `"Temperatuur täna"`

### Tomorrow view

- `"Homne prognoos"` label (medium weight, muted gray) replaces the big temp block — no current reading exists for tomorrow
- 4 hourly slots from `data.tomorrow.hourly`; first slot (10:00) always highlighted (all slots are future)
- Temperature chart of `data.tomorrow.dailyChart` — no "now" reference line
- Chart label: `"Temperatuur homme"`

### Toggle buttons

Two buttons at the bottom of the card, styled identically to the NordPool range buttons:

```tsx
{['today', 'tomorrow'].map(day => (
  <button
    key={day}
    onClick={() => setSelectedDay(day)}
    aria-pressed={selectedDay === day}
    className={selectedDay === day
      ? 'text-xs px-2 py-0.5 rounded bg-indigo-500 text-white font-semibold'
      : 'text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200'}
  >
    {day === 'today' ? 'Täna' : 'Homme'}
  </button>
))}
```

### Chart changes (both views)

| Property | Before | After |
|---|---|---|
| Height | 72px | 140px |
| `YAxis` | `hide` | visible, `width={28}`, `tickFormatter={v => \`${v}°\`}`, `tick={{ fontSize: 9, fill: '#9ca3af' }}` |
| Left margin | `0` | `0` (YAxis `width` handles the space) |
| `XAxis` ticks | `[0, 6, 12, 18]` | `[0, 6, 12, 18]` (unchanged — marks full-day context) |

---

## Tests

### `lib/weather.ts` unit tests

- `filterRemainingHourly(times, temps, codes, todayStr)` returns slots at 10:00, 14:00, 18:00, 22:00
- `buildDailyChart(times, temps, tomorrowStr)` returns only tomorrow's data points
- Old test helpers updated to pass `targetDateStr` instead of relying on `now`

### `WeatherSection.test.tsx` updates

- `MOCK_DATA` updated: today `hourly` times changed to `10:00, 14:00, 18:00, 22:00`; `tomorrow` field added with its own `hourly` and `dailyChart`
- New tests:
  - Clicking "Homme" toggle shows `"Homne prognoos"` and hides the big current temp
  - Clicking "Homme" shows tomorrow's hourly times
  - `"Temperatuur homme"` label appears when tomorrow is selected
  - Clicking "Täna" restores today's view
- Updated tests: slot time assertions (`06:00` → `10:00`, `12:00` → `14:00`)
- Updated next-slot highlight tests to reference new hours

---

## Out of scope

- Persisting the day toggle to `localStorage`
- Fetching weather for days beyond tomorrow
- Showing tomorrow's min/max temperature summary
