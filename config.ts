export const TICKERS = [
  { symbol: '^STOXX50E', label: 'EURO STOXX 50' },
  { symbol: 'EURUSD=X', label: 'EUR/USD' },
];

export const TALLINN_COORDS = { lat: 59.437, lon: 24.7536 };

export const CHART_TICKERS = ['^STOXX50E', 'EURUSD=X', 'BZ=F'] as const;
export type ChartSymbol = typeof CHART_TICKERS[number];
