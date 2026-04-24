// @jest-environment node

jest.mock('@/lib/charts', () => ({
  fetchChartData: jest.fn(),
}));

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { fetchChartData } from '@/lib/charts';

const mockFetchChartData = fetchChartData as jest.Mock;

function makeRequest(symbol: string, range: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/charts?symbol=${encodeURIComponent(symbol)}&range=${range}`,
  );
}

describe('GET /api/charts', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns chart data for a valid symbol and range', async () => {
    const mockData = { points: [{ timestamp: 1714000000000, price: 5100 }] };
    mockFetchChartData.mockResolvedValue(mockData);

    const res = await GET(makeRequest('^STOXX50E', '7D'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(mockData);
  });

  it('returns 400 for an unknown symbol', async () => {
    const res = await GET(makeRequest('INVALID_SYM', '7D'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid range', async () => {
    const res = await GET(makeRequest('^STOXX50E', 'BOGUS'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when symbol param is missing', async () => {
    const res = await GET(new NextRequest('http://localhost/api/charts?range=7D'));
    expect(res.status).toBe(400);
  });

  it('returns 503 when fetchChartData throws', async () => {
    mockFetchChartData.mockRejectedValue(new Error('Yahoo down'));
    const res = await GET(makeRequest('^STOXX50E', '7D'));
    expect(res.status).toBe(503);
  });
});
