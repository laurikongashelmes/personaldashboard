// @jest-environment node

jest.mock('yahoo-finance2', () => {
  const mockQuoteSummary = jest.fn();
  const MockClass = jest.fn(() => ({ quoteSummary: mockQuoteSummary }));
  (MockClass as any).__mockQuoteSummary = mockQuoteSummary;
  return { __esModule: true, default: MockClass };
});

import { fetchEnergy } from '../energy';
import YahooFinance from 'yahoo-finance2';

const mockQuoteSummary = (YahooFinance as any).__mockQuoteSummary as jest.Mock;

describe('fetchEnergy', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns brent data on success', async () => {
    mockQuoteSummary.mockResolvedValue({
      price: {
        regularMarketPrice: 75.5,
        regularMarketChange: -1.2,
        regularMarketChangePercent: -1.56,
      },
    });

    const result = await fetchEnergy();

    expect(result.brent.price).toBe(75.5);
    expect(result.brent.change).toBe(-1.2);
    expect(result.brent.changePercent).toBe(-1.56);
    expect(result.brent.symbol).toBe('BZ=F');
  });

  it('returns null brent fields on Yahoo Finance error', async () => {
    mockQuoteSummary.mockRejectedValue(new Error('Yahoo error'));

    const result = await fetchEnergy();

    expect(result.brent.price).toBeNull();
    expect(result.brent.change).toBeNull();
    expect(result.brent.changePercent).toBeNull();
  });
});
