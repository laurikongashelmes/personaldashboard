// @jest-environment node

jest.mock('yahoo-finance2', () => {
  const mockChart = jest.fn();
  const MockClass = jest.fn(() => ({ chart: mockChart }));
  (MockClass as any).__mockChart = mockChart;
  return { __esModule: true, default: MockClass };
});

import { fetchChartData } from '../charts';
import YahooFinance from 'yahoo-finance2';

const mockChart = (YahooFinance as any).__mockChart as jest.Mock;

describe('fetchChartData', () => {
  beforeEach(() => jest.resetAllMocks());

  it('maps quotes to ChartPoints for 7D range', async () => {
    const date1 = new Date('2026-04-17T00:00:00Z');
    const date2 = new Date('2026-04-18T00:00:00Z');
    mockChart.mockResolvedValue({
      quotes: [
        { date: date1, close: 5100, high: null, low: null, open: null, volume: null },
        { date: date2, close: 5200, high: null, low: null, open: null, volume: null },
      ],
    });

    const result = await fetchChartData('^STOXX50E', '7D');

    expect(result.points).toHaveLength(2);
    expect(result.points[0]).toEqual({ timestamp: date1.getTime(), price: 5100 });
    expect(result.points[1]).toEqual({ timestamp: date2.getTime(), price: 5200 });
  });

  it('filters out null close values', async () => {
    mockChart.mockResolvedValue({
      quotes: [
        { date: new Date('2026-04-17T00:00:00Z'), close: null, high: null, low: null, open: null, volume: null },
        { date: new Date('2026-04-18T00:00:00Z'), close: 5200, high: null, low: null, open: null, volume: null },
      ],
    });

    const result = await fetchChartData('^STOXX50E', '7D');

    expect(result.points).toHaveLength(1);
    expect(result.points[0].price).toBe(5200);
  });

  it('uses 15m interval for 1D range', async () => {
    mockChart.mockResolvedValue({ quotes: [] });
    await fetchChartData('^STOXX50E', '1D');
    expect(mockChart).toHaveBeenCalledWith(
      '^STOXX50E',
      expect.objectContaining({ interval: '15m' }),
    );
  });

  it('uses 1h interval for 7D range', async () => {
    mockChart.mockResolvedValue({ quotes: [] });
    await fetchChartData('^STOXX50E', '7D');
    expect(mockChart).toHaveBeenCalledWith(
      '^STOXX50E',
      expect.objectContaining({ interval: '1h' }),
    );
  });

  it('uses 1d interval for 1M range', async () => {
    mockChart.mockResolvedValue({ quotes: [] });
    await fetchChartData('^STOXX50E', '1M');
    expect(mockChart).toHaveBeenCalledWith(
      '^STOXX50E',
      expect.objectContaining({ interval: '1d' }),
    );
  });

  it('uses 1wk interval for 1Y range', async () => {
    mockChart.mockResolvedValue({ quotes: [] });
    await fetchChartData('^STOXX50E', '1Y');
    expect(mockChart).toHaveBeenCalledWith(
      '^STOXX50E',
      expect.objectContaining({ interval: '1wk' }),
    );
  });

  describe('period1 calculation', () => {
    const FIXED_NOW = new Date('2024-01-15T12:00:00.000Z').getTime(); // 1705320000000

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it.each([
      ['1D', new Date(FIXED_NOW - 24 * 60 * 60 * 1000)],
      ['7D', new Date(FIXED_NOW - 7 * 24 * 60 * 60 * 1000)],
      ['1M', new Date(FIXED_NOW - 30 * 24 * 60 * 60 * 1000)],
      ['1Y', new Date(FIXED_NOW - 365 * 24 * 60 * 60 * 1000)],
    ] as any[])('range %s returns correct period1', async (range, expectedPeriod1) => {
      jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
      mockChart.mockResolvedValue({ quotes: [] });
      await fetchChartData('^STOXX50E', range);
      expect(mockChart).toHaveBeenCalledWith(
        '^STOXX50E',
        expect.objectContaining({ period1: expectedPeriod1 })
      );
    });
  });
});
