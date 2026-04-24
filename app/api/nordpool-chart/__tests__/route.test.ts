// @jest-environment node

jest.mock('next/server', () => {
  class MockNextRequest {
    url: string;
    constructor(url: string) {
      this.url = url;
    }
  }
  const MockNextResponse = {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  };
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

jest.mock('@/lib/nordpool-chart', () => ({
  fetchNordPoolChartData: jest.fn(),
}));

import { GET } from '../route';
import { fetchNordPoolChartData } from '@/lib/nordpool-chart';

const mockFetch = fetchNordPoolChartData as jest.Mock;

function makeRequest(range: string) {
  return { url: `http://localhost/api/nordpool-chart?range=${range}` };
}

describe('GET /api/nordpool-chart', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns chart data for a valid range', async () => {
    const mockData = { points: [{ timestamp: 1714000000000, price: 95 }], hasTomorrow: false, currentHourIndex: 0, currentHourPrice: 95, todayAvgPrice: 91.5 };
    mockFetch.mockResolvedValue(mockData);

    const res = await GET(makeRequest('CURRENT') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(mockData);
  });

  it('returns 400 for an invalid range', async () => {
    const res = await GET(makeRequest('BOGUS') as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when range param is missing', async () => {
    const res = await GET({ url: 'http://localhost/api/nordpool-chart' } as any);
    expect(res.status).toBe(400);
  });

  it('returns 503 when fetchNordPoolChartData throws', async () => {
    mockFetch.mockRejectedValue(new Error('Elering down'));
    const res = await GET(makeRequest('7D') as any);
    expect(res.status).toBe(503);
  });
});
