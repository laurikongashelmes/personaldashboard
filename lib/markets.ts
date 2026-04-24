import YahooFinance from 'yahoo-finance2';
import type { TickerData } from '../types';
import type { Quote } from 'yahoo-finance2/modules/quote';

const yahooFinance = new YahooFinance();

interface TickerConfig {
  symbol: string;
  label: string;
}

export async function fetchMarketData(tickers: TickerConfig[]): Promise<TickerData[]> {
  return Promise.all(
    tickers.map(async ({ symbol, label }) => {
      try {
        const quote = await yahooFinance.quote(symbol, {}, { validateResult: true }) as Quote;
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
