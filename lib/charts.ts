import YahooFinance from 'yahoo-finance2';
import type { ChartData, ChartRange } from '../types';
import type { ChartSymbol } from '../config';

const yahooFinance = new YahooFinance();

function getPeriod1(range: ChartRange): Date {
  const now = Date.now();
  switch (range) {
    case '1D': {
      const today = new Date(now);
      today.setUTCHours(0, 0, 0, 0);
      return today;
    }
    case '7D':  return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '1M':  return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case '1Y':  return new Date(now - 365 * 24 * 60 * 60 * 1000);
  }
}

function getInterval(range: ChartRange): '15m' | '1h' | '1d' | '1wk' {
  switch (range) {
    case '1D': return '15m';
    case '7D': return '1h';
    case '1M': return '1d';
    case '1Y': return '1wk';
  }
}

/**
 * Fetches historical chart data from Yahoo Finance.
 * Throws if the API call fails — callers are responsible for error handling.
 */
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
