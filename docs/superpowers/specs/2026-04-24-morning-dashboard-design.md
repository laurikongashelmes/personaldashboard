# Morning Brief Dashboard — Design Spec

**Date:** 2026-04-24  
**Stack:** Next.js (App Router) + Tailwind CSS  
**Theme:** Light (white/slate)

---

## Problem Statement

A personal morning dashboard that opens in the browser and shows a scannable overview of financial markets, energy prices, and Tallinn weather for the current day. Designed to be opened once each morning — no always-on display, no real-time polling.

---

## Data Widgets

### Markets
- **EURO STOXX 50** — current price + % change vs previous close
- **EUR/USD** — current rate + % change vs previous close
- Driven by a `config.ts` ticker array so new tickers can be added with one line

### Energy
- **Brent Crude** — current price (USD) + % change
- **Nord Pool EE (electricity)** — today's average spot price (€/MWh), lowest spot price (€/MWh), and the hour at which the lowest price occurs

### Weather — Tallinn
- Current temperature (°C) + weather condition + emoji
- Hourly forecast strip for the remaining hours of today (temp + condition)

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | API routes proxy external APIs server-side, avoiding CORS and keeping any future API keys out of the browser |
| Styling | Tailwind CSS | Fast to write, consistent, looks polished with minimal effort |
| Financial data | `yahoo-finance2` (npm) | Free, no API key, Node.js-native, covers all needed tickers |
| Electricity data | Elering public API | Free, no auth, returns hourly Nord Pool prices for Estonia |
| Weather data | Open-Meteo API | Free, no API key, returns current conditions + hourly forecast |

---

## Architecture

```
app/
  page.tsx                  # Main dashboard page (client component)
  api/
    markets/route.ts        # Fetches EURO STOXX 50 + EUR/USD via yahoo-finance2
    energy/route.ts         # Fetches Brent crude (yahoo-finance2) + Nord Pool EE (Elering)
    weather/route.ts        # Fetches Tallinn current + hourly forecast (Open-Meteo)
  components/
    MarketsSection.tsx      # Renders ticker cards from config
    EnergySection.tsx       # Renders Brent + Nord Pool cards
    WeatherSection.tsx      # Renders current weather + hourly strip
    Widget.tsx              # Shared card wrapper (title, value, sub-value, error state)
config.ts                   # Ticker list, Tallinn coordinates
```

### API Route Responsibilities

**`/api/markets`**  
Calls `yahoo-finance2.quote()` for each ticker in config. Returns `{ symbol, name, price, change, changePercent }[]`.

**`/api/energy`**  
- Brent: `yahoo-finance2.quote('BZ=F')` → price + % change  
- Nord Pool EE: `GET https://dashboard.elering.ee/api/nps/price?fields=ee&start=<today 00:00 EET>&end=<today 23:59 EET>` → hourly price array → computes `avg`, `min`, `minHour`. Use `Europe/Tallinn` timezone when constructing the date range.

**`/api/weather`**  
`GET https://api.open-meteo.com/v1/forecast` with params:  
- `latitude=59.437&longitude=24.7536` (Tallinn)  
- `current=temperature_2m,weathercode`  
- `hourly=temperature_2m,weathercode`  
- `forecast_days=1`  
Returns current conditions + remaining hourly slots for today.

---

## UI Layout

```
┌─────────────────────────────────────────────────┐
│  Morning Brief          Thu 24 Apr      [↻]     │
├─────────────────────────────────────────────────┤
│  MARKETS                                        │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ EURO STOXX50 │  │   EUR/USD    │            │
│  │    5,142     │  │   1.0732     │            │
│  │   ▲ +0.8%   │  │   ▼ −0.2%   │            │
│  └──────────────┘  └──────────────┘            │
├─────────────────────────────────────────────────┤
│  ENERGY                    │  WEATHER           │
│  ┌──────────┐ ┌──────────┐ │  ┌──────────────┐ │
│  │  BRENT   │ │NORD POOL │ │  │   8°C ⛅     │ │
│  │  $83.4   │ │ Avg 82 € │ │  │ Partly cloudy│ │
│  │  ▼ −0.4% │ │ Low 41 € │ │  │ at 03:00    │ │
│  └──────────┘ │ @ 03:00  │ │  │ 12° 15° 11° │ │
│               └──────────┘ │  └──────────────┘ │
└─────────────────────────────────────────────────┘
```

- **Header:** Date, title, manual refresh button (↻)  
- **Markets row:** Horizontally arranged ticker cards, one per configured ticker  
- **Bottom row:** Energy section (left 60%) and Weather section (right 40%) side by side  
- Each card has: label, primary value, secondary value (% change or sub-detail)  
- Positive % change = green; negative = red

---

## Data Fetching

- Client component calls all three API routes in parallel via `Promise.all` on mount
- Loading skeleton displayed while fetching
- Manual refresh button re-triggers the fetch
- No auto-polling (morning brief use case — open once)
- Each section is independently fault-tolerant: if one API route fails, that section shows an error state while others render normally

---

## Configuration (`config.ts`)

```ts
export const TICKERS = [
  { symbol: '^STOXX50E', label: 'EURO STOXX 50' },
  { symbol: 'EURUSD=X', label: 'EUR/USD' },
];

export const TALLINN_COORDS = { lat: 59.437, lon: 24.7536 };
```

Adding a new ticker requires only a new entry in `TICKERS`.

---

## Out of Scope

- User authentication
- Persistent storage or history
- Mobile-specific layout (desktop browser is the target)
- Auto-refresh / real-time updates
- News headlines, calendar, or other data sources
