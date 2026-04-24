import YahooFinance from 'yahoo-finance2';
import type { EnergyData } from '../types';
import type { QuoteSummaryResult } from 'yahoo-finance2/modules/quoteSummary-iface';

const yahooFinance = new YahooFinance();

export async function fetchEnergy(): Promise<EnergyData> {
  let brent: EnergyData['brent'] = {
    symbol: 'BZ=F',
    label: 'Brent Crude',
    price: null,
    change: null,
    changePercent: null,
  };
  try {
    const summary = await yahooFinance.quoteSummary(
      'BZ=F',
      { modules: ['price'] },
      { validateResult: true },
    ) as QuoteSummaryResult;
    const p = summary.price;
    brent = {
      symbol: 'BZ=F',
      label: 'Brent Crude',
      price: p?.regularMarketPrice ?? null,
      change: p?.regularMarketChange ?? null,
      changePercent: p?.regularMarketChangePercent ?? null,
    };
  } catch {
    // leave nulls
  }
  return { brent };
}
