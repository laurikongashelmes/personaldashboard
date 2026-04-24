// @jest-environment node
import { fetchMarketData } from '../markets';

jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: {
    quote: jest.fn(),
  },
}));

import yahooFinance from 'yahoo-finance2';

describe('fetchMarketData', () => {
  it('returns mapped ticker data for each configured ticker', async () => {
    (yahooFinance.quote as jest.Mock).mockResolvedValue({
      regularMarketPrice: 5142.3,
      regularMarketChange: 40.5,
      regularMarketChangePercent: 0.794,
    });

    const result = await fetchMarketData([
      { symbol: '^STOXX50E', label: 'EURO STOXX 50' },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      symbol: '^STOXX50E',
      label: 'EURO STOXX 50',
      price: 5142.3,
      change: 40.5,
      changePercent: 0.794,
    });
  });

  it('handles quote failure gracefully by returning null price', async () => {
    (yahooFinance.quote as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await fetchMarketData([{ symbol: 'BAD', label: 'Bad Ticker' }]);

    expect(result).toHaveLength(1);
    expect(result[0].price).toBeNull();
  });
});
