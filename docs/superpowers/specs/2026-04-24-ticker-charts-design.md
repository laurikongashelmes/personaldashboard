# Ticker Charts Design

**Date:** 2026-04-24  
**Status:** Approved

## Problem

The dashboard currently shows current price and daily change for Euro STOXX 50, EUR/USD, and Brent Crude as static widgets. There is no historical context. Users want to see a sparkline-style chart for each of these three tickers, with a time-range switcher.

## Approach

Add interactive area charts (Recharts) to each of the three ticker widgets. The widgets become chart-first cards: chart on top, price + change below, time-range switcher at the bottom. Chart data is fetched client-side independently from the main dashboard refresh. Nord Pool widgets are unchanged.

## Data Layer

### New API route: `/api/charts`

**Query params:** `symbol` (string), `range` (1D | 7D | 1M | 1Y)

**Allowed symbols** (validated server-side via `config.ts`):
- `^STOXX50E` — Euro STOXX 50
- `EURUSD=X` — EUR/USD
- `BZ=F` — Brent Crude

**Range → interval mapping** (using `yahooFinance.chart()`):

| Range | Interval | Look-back |
|-------|----------|-----------|
| 1D    | 15m      | today     |
| 7D    | 1d       | 7 days    |
| 1M    | 1d       | 30 days   |
| 1Y    | 1wk      | 1 year    |

**Response shape:**
```ts
{ points: { timestamp: number; price: number }[] }
```

**Error responses:**
- `400` — unknown symbol
- `503` — upstream Yahoo Finance failure

### `config.ts` additions

```ts
export const CHART_TICKERS = ['^STOXX50E', 'EURUSD=X', 'BZ=F'] as const;
export type ChartSymbol = typeof CHART_TICKERS[number];
```

### New types (`types.ts`)

```ts
export type ChartRange = '1D' | '7D' | '1M' | '1Y';
export interface ChartPoint { timestamp: number; price: number; }
export interface ChartData { points: ChartPoint[]; }
```

## Component Structure

### New: `TickerCard`

Replaces `Widget` for the three chart tickers. Props:

```ts
interface TickerCardProps {
  label: string;
  symbol: string;             // passed to useChartData
  price: number | null;
  change: number | null;
  changePercent: number | null;
}
```

Internal state: `selectedRange: ChartRange` (default `'7D'`).

Layout (top to bottom):
1. Label (small uppercase, gray)
2. Recharts `AreaChart` with `Tooltip` — chart line/fill color green if `changePercent >= 0`, red otherwise
3. Price (large, bold) + change % (colored arrow)
4. Range switcher: `1D | 7D | 1M | 1Y` buttons — active range highlighted in indigo

Loading state: skeleton placeholder in the chart area (pulse animation). Price + change remain visible during range switches.

Error/empty state: "Andmed pole saadaval" inline in the chart area.

### New: `useChartData(symbol, range)`

Custom hook. Fetches `/api/charts?symbol=<symbol>&range=<range>` on mount and on `range` change.

Returns `{ points: ChartPoint[]; loading: boolean; error: string | null }`.

### Updated: `MarketsSection`

Replaces both `Widget` instances with `TickerCard`. Receives the same `TickerData[]` prop as today; passes `symbol`, `price`, `change`, `changePercent` down to `TickerCard`.

### Updated: `EnergySection`

Replaces the Brent Crude `Widget` with `TickerCard`. Nord Pool widgets are unchanged.

## Data Flow

```
page.tsx (every 5 min)
  └─ /api/markets  →  MarketsSection  →  TickerCard (price/change)
  └─ /api/energy   →  EnergySection   →  TickerCard (price/change, Brent)
                                          └─ useChartData (on mount + range change)
                                               └─ /api/charts?symbol=&range=
```

Chart data is **not** re-fetched on the main 5-minute refresh. Users can switch ranges at any time; each switch triggers a new fetch.

## Error Handling & Edge Cases

- **1D on weekends/holidays:** Yahoo returns empty data. Chart area shows "Andmed pole saadaval"; price + change still displayed.
- **Yahoo Finance failure:** `/api/charts` returns 503; hook sets `error`; card shows inline error in chart area.
- **1Y data volume:** Weekly interval keeps ~52 points — appropriate for an area chart.
- **Chart color:** Derived from `changePercent` sign — green (`#16a34a` / indigo `#6366f1`) if positive, red (`#dc2626`) if negative. Uses indigo as the neutral/positive color consistent with the range button active state.

## Testing

### `/api/charts` route (`app/api/charts/__tests__/route.test.ts`)
- Valid symbol + range returns `{ points: [...] }`
- Unknown symbol returns `400`
- Yahoo Finance throw returns `503`

### `useChartData` hook (`lib/__tests__/useChartData.test.ts`)
- Returns `loading: true` on mount
- Populates `points` on successful fetch
- Sets `error` on fetch failure
- Re-fetches when `range` changes

### `TickerCard` component (`app/components/__tests__/TickerCard.test.tsx`)
- Renders label, price, and change from props
- Renders all four range buttons; active button matches `selectedRange`
- Shows skeleton while `useChartData` loading
- Shows error message when `useChartData` returns error
- Chart internals (Recharts) not tested

### Updated tests
- `MarketsSection.test.tsx` — updated to expect `TickerCard` instead of `Widget`
- `EnergySection.test.tsx` — updated for Brent Crude using `TickerCard`

## Dependencies

New production dependency: `recharts`

No other new dependencies.
