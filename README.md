# Daily Brief

A personal dashboard built with Next.js 16, React 19, and Tailwind CSS 4.

Displays at a glance:
- **Markets** — EURO STOXX 50 and EUR/USD (via Yahoo Finance)
- **Energy** — Brent crude oil price and Nord Pool EE electricity prices (avg + cheapest hour)
- **Weather** — Current conditions and hourly forecast for Tallinn (via Open-Meteo)

All data is fetched fresh on page load via server-side API routes that proxy public APIs, keeping CORS and credentials out of the browser. The page auto-refreshes every 5 minutes.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Running tests

```bash
npx jest --no-coverage
```

## Tech stack

- **Next.js 16** App Router — server-side API routes + client-side data fetching
- **React 19** — `useState` / `useEffect` / `useCallback`
- **Tailwind CSS 4** — CSS-based config in `app/globals.css`
- **yahoo-finance2** — market data
- **Elering public API** — Nord Pool EE hourly prices
- **Open-Meteo** — weather data (no API key required)
- **Jest 30 + React Testing Library** — 34 tests
