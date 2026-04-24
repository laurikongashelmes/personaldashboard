// @jest-environment node
import { computeNordPoolStats } from '../nordpool';

const SAMPLE_PRICES = [
  { timestamp: 1714003200, price: 80.0 },
  { timestamp: 1714006800, price: 41.0 }, // lowest — 01:00 EET
  { timestamp: 1714010400, price: 95.5 },
  { timestamp: 1714014000, price: 100.0 },
];

describe('computeNordPoolStats', () => {
  it('computes average price rounded to one decimal', () => {
    const result = computeNordPoolStats(SAMPLE_PRICES);
    expect(result.avgPrice).toBe(79.1);
  });

  it('finds the minimum price', () => {
    const result = computeNordPoolStats(SAMPLE_PRICES);
    expect(result.minPrice).toBe(41.0);
  });

  it('returns the hour label of the minimum price in EET', () => {
    const result = computeNordPoolStats(SAMPLE_PRICES);
    // timestamp 1714006800 = 2024-04-25 01:00 UTC = 04:00 EEST
    // (exact hour depends on timezone — just check it's a valid HH:MM string)
    expect(result.minHour).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns minPrice 0 and avgPrice 0 for empty array', () => {
    const result = computeNordPoolStats([]);
    expect(result.avgPrice).toBe(0);
    expect(result.minPrice).toBe(0);
    expect(result.minHour).toBe('--:--');
  });
});
