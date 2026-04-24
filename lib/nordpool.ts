import type { NordPoolStats } from '../types';

interface PriceEntry {
  timestamp: number;
  price: number;
}

export function computeNordPoolStats(prices: PriceEntry[]): NordPoolStats {
  if (prices.length === 0) {
    return { avgPrice: 0, minPrice: 0, minHour: '--:--' };
  }

  const total = prices.reduce((sum, e) => sum + e.price, 0);
  const avgPrice = Math.round((total / prices.length) * 10) / 10;

  const minEntry = prices.reduce((min, e) => (e.price < min.price ? e : min), prices[0]);
  const minPrice = minEntry.price;

  const date = new Date(minEntry.timestamp * 1000);
  const minHour = date.toLocaleTimeString('et-EE', {
    timeZone: 'Europe/Tallinn',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return { avgPrice, minPrice, minHour };
}
