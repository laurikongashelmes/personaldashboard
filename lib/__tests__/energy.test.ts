// @jest-environment node
import { fetchEnergy } from '../energy';

jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: {
    quoteSummary: jest.fn(),
  },
}));

import yahooFinance from 'yahoo-finance2';

const MOCK_EE_PRICES = [
  { timestamp: 1714003200, price: 80.0 },
  { timestamp: 1714006800, price: 41.0 },
  { timestamp: 1714010400, price: 95.5 },
  { timestamp: 1714014000, price: 100.0 },
];

const ELERING_OK_RESPONSE = {
  success: true,
  data: { ee: MOCK_EE_PRICES },
};

describe('fetchEnergy', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('happy path: returns nordpool stats and brent data', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ELERING_OK_RESPONSE,
    }) as jest.Mock;

    (yahooFinance.quoteSummary as jest.Mock).mockResolvedValue({
      price: {
        regularMarketPrice: 75.5,
        regularMarketChange: -1.2,
        regularMarketChangePercent: -1.56,
      },
    });

    const result = await fetchEnergy();

    expect(result.nordPool.avgPrice).toBe(79.1);
    expect(result.nordPool.minPrice).toBe(41.0);
    expect(result.nordPool.minHour).toMatch(/^\d{2}:\d{2}$/);

    expect(result.brent.price).toBe(75.5);
    expect(result.brent.change).toBe(-1.2);
    expect(result.brent.changePercent).toBe(-1.56);
    expect(result.brent.symbol).toBe('BZ=F');
  });

  it('Elering API error → nordpool stats are zeros/fallback', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.Mock;

    (yahooFinance.quoteSummary as jest.Mock).mockResolvedValue({
      price: {
        regularMarketPrice: 75.5,
        regularMarketChange: -1.2,
        regularMarketChangePercent: -1.56,
      },
    });

    const result = await fetchEnergy();

    expect(result.nordPool.avgPrice).toBe(0);
    expect(result.nordPool.minPrice).toBe(0);
    expect(result.nordPool.minHour).toBe('--:--');
  });

  it('Brent error → brent fields are null', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ELERING_OK_RESPONSE,
    }) as jest.Mock;

    (yahooFinance.quoteSummary as jest.Mock).mockRejectedValue(new Error('Yahoo error'));

    const result = await fetchEnergy();

    expect(result.brent.price).toBeNull();
    expect(result.brent.change).toBeNull();
    expect(result.brent.changePercent).toBeNull();
    // nordpool should still work
    expect(result.nordPool.avgPrice).toBe(79.1);
  });
});
