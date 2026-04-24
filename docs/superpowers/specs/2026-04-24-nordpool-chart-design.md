# Nord Pool Electricity Price Chart

**Date:** 2026-04-24  
**Status:** Approved

## Problem & Goal

The Energia section currently displays Nord Pool EE prices as two plain stat widgets (daily average and minimum hour). The goal is to replace these with a chart card — similar in form to the Brent Crude `TickerCard` — showing hourly and historical electricity prices with selectable ranges.

## Design Decisions

- **Summary stat:** Current hour's price (large) + today's average (secondary label)
- **CURRENT chart style:** Bar chart — one bar per hour, industry standard for block-rate electricity pricing
- **Layout:** The new `NordPoolCard` replaces both existing plain widgets; Energia section becomes a clean 2-card layout (Brent + Nord Pool)

---

## Architecture & Data Flow

`NordPoolCard` is fully self-contained. It fetches its own chart data via a React hook and derives all displayed stats from the API response. It receives no props from the energy API.

### New files

| File | Purpose |
|------|---------|
| `lib/nordpool-chart.ts` | Fetches Elering API for any range; returns typed chart data |
| `app/api/nordpool-chart/route.ts` | `GET /api/nordpool-chart?range=CURRENT\|7D\|1M\|1Y` |
| `lib/useNordPoolChartData.ts` | React hook — mirrors `useChartData`, calls the new endpoint |
| `app/components/NordPoolCard.tsx` | Self-contained chart card component |

### Modified files

| File | Change |
|------|--------|
| `lib/energy.ts` | Remove Nord Pool stats fetch; return only Brent data |
| `app/api/energy/route.ts` | No logic change — automatically simpler via `lib/energy.ts` |
| `types.ts` | Remove `NordPoolStats`; update `EnergyData` to `{ brent: TickerData }` |
| `app/components/EnergySection.tsx` | Replace two `Widget` cards with `<NordPoolCard />` |

### Deleted files / removed code

- `lib/nordpool.ts` — `computeNordPoolStats` is no longer needed
- `lib/__tests__/nordpool.test.ts` — tests for the removed function

---

## API Endpoint

`GET /api/nordpool-chart?range=CURRENT|7D|1M|1Y`

All data sourced from the Elering API: `https://dashboard.elering.ee/api/nps/price`

### Fetch strategy per range

| Range | Elering window | Aggregation | Points |
|-------|---------------|-------------|--------|
| CURRENT | today 00:00 → today 23:59:59 + tomorrow 00:00 → 23:59:59 | none (raw hourly) | 24–48 |
| 7D | 7 days ago → now | daily average | ~7 |
| 1M | 30 days ago → now | daily average | ~30 |
| 1Y | 365 days ago → now | weekly average | ~52 |

### Response shapes

**CURRENT:**
```ts
{
  points: ChartPoint[];       // hourly, today + tomorrow (if available)
  hasTomorrow: boolean;       // whether next-day data was returned
  currentHourIndex: number;   // index of the bar for the ongoing hour
  currentHourPrice: number | null;
  todayAvgPrice: number;
}
```

**7D / 1M / 1Y:**
```ts
{
  points: ChartPoint[];       // daily or weekly averages
}
```

`ChartPoint` is the existing `{ timestamp: number; price: number }` type.

Tomorrow's prices for the next day are published by Nord Pool around 13:00 EET. When the Elering API returns no data for tomorrow, `hasTomorrow` is `false` and only today's 24 bars are shown.

---

## `NordPoolCard` Component

### Layout (mirrors `TickerCard`)

```
┌─────────────────────────────────────────┐
│ NORD POOL EE          (label)           │
│                                         │
│  [bar chart — 72px tall]                │
│                                         │
│  112.5 €/MWh   avg 87.4 €/MWh today    │
│                                         │
│  [CURRENT]  [7D]  [1M]  [1Y]           │
└─────────────────────────────────────────┘
```

### Chart behaviour per range

**CURRENT (bar chart):**
- Each bar = one hour's price
- Today's bars: indigo (`#6366f1`) with lower opacity fill (`#c7d2fe`)
- Current hour's bar: full indigo (`#6366f1`), slightly taller visually via `maxBarSize` or highlighted with a darker stroke
- Tomorrow's bars (if `hasTomorrow`): light indigo (`#e0e7ff`) with a `#c7d2fe` border
- A thin vertical line (or gap) separates today from tomorrow
- A small `"now"` label floats above the current hour bar
- Tooltip: shows `HH:mm` + price in `€/MWh`

**7D / 1M / 1Y (bar chart):**
- Each bar = daily or weekly average
- Uniform indigo bar colour (no future / current distinction)
- Tooltip: shows date + avg price in `€/MWh`

### Stats below chart

| Range | Large number | Secondary |
|-------|-------------|-----------|
| CURRENT | Current hour price (`€/MWh`) | `avg X.X €/MWh today` |
| 7D / 1M / 1Y | Most recent point's price | `(range label)` e.g. `7D avg` |

### Range persistence

Selected range stored in `localStorage` under key `chart-range-nordpool-ee`, defaulting to `CURRENT`.

### Loading / error states

- Loading: pulse skeleton (same pattern as `TickerCard`)
- Error: small red error text inside the chart area
- No data: treated as error

---

## Types

New types added to `types.ts`:

```ts
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
export type NordPoolRange = 'CURRENT' | '7D' | '1M' | '1Y';
```

---

## Out of Scope

- Price alerts or notifications
- Country selection (only EE)
- Negative price handling (shown as-is on the chart)
- Caching / ISR on the API route (can be added later)
