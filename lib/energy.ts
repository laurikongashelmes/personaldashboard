import YahooFinance from 'yahoo-finance2';
import type { EnergyData } from '../types';
import type { QuoteSummaryResult } from 'yahoo-finance2/modules/quoteSummary-iface';
import { computeNordPoolStats } from './nordpool';

const yahooFinance = new YahooFinance();

const ELERING_API = 'https://dashboard.elering.ee/api/nps/price';

function getTodayRange(): { start: string; end: string } {
  const now = new Date();
  // Midnight-to-midnight in Europe/Tallinn (hardcoded +03:00 for EEST, Apr–Oct)
  const dateStr = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Tallinn' });
  const start = `${dateStr}T00:00:00+03:00`;
  const end = `${dateStr}T23:59:59+03:00`;
  return { start, end };
}

export async function fetchEnergy(): Promise<EnergyData> {
  const { start, end } = getTodayRange();
  const url = `${ELERING_API}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

  let nordPool = computeNordPoolStats([]);
  try {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json?.success && Array.isArray(json?.data?.ee)) {
        nordPool = computeNordPoolStats(json.data.ee);
      }
    }
  } catch {
    // fallback to zeros
  }

  let brent: EnergyData['brent'] = {
    symbol: 'BZ=F',
    label: 'Brent Crude',
    price: null,
    change: null,
    changePercent: null,
  };
  try {
    const summary = await yahooFinance.quoteSummary('BZ=F', { modules: ['price'] }, { validateResult: true }) as QuoteSummaryResult;
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

  return { nordPool, brent };
}
