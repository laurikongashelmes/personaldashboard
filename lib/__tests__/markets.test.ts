// @jest-environment node

jest.mock('yahoo-finance2', () => {
  const mockQuote = jest.fn();
  const MockClass = jest.fn(() => ({ quote: mockQuote }));
  (MockClass as any).__mockQuote = mockQuote;
  return { __esModule: true, default: MockClass };
});

import { fetchMarketData } from '../markets';
import YahooFinance from 'yahoo-finance2';

const mockQuote = (YahooFinance as any).__mockQuote as jest.Mock;

describe('fetchMarketData', () => {
  it('returns mapped ticker data for each configured ticker', async () => {
    mockQuote.mockResolvedValue({
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
    mockQuote.mockRejectedValue(new Error('Network error'));

    const result = await fetchMarketData([{ symbol: 'BAD', label: 'Bad Ticker' }]);

    expect(result).toHaveLength(1);
    expect(result[0].price).toBeNull();
  });
});
