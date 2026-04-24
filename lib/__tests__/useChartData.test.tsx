import { renderHook, waitFor } from '@testing-library/react';
import { useChartData } from '../useChartData';

const MOCK_POINTS = [
  { timestamp: 1714000000000, price: 5100 },
  { timestamp: 1714086400000, price: 5150 },
];

beforeEach(() => {
  jest.resetAllMocks();
});

it('starts with loading=true and empty points', () => {
  global.fetch = jest.fn(() => new Promise(() => {})); // never resolves
  const { result } = renderHook(() => useChartData('^STOXX50E', '7D'));
  expect(result.current.loading).toBe(true);
  expect(result.current.points).toEqual([]);
  expect(result.current.error).toBeNull();
});

it('populates points on successful fetch', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ points: MOCK_POINTS }),
    } as Response),
  );

  const { result } = renderHook(() => useChartData('^STOXX50E', '7D'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.points).toEqual(MOCK_POINTS);
  expect(result.current.error).toBeNull();
});

it('sets error on HTTP error response', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: false, status: 503 } as Response),
  );

  const { result } = renderHook(() => useChartData('^STOXX50E', '7D'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('Andmed pole saadaval');
  expect(result.current.points).toEqual([]);
});

it('sets error on network failure', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

  const { result } = renderHook(() => useChartData('^STOXX50E', '7D'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('Andmed pole saadaval');
});

it('re-fetches and resets loading when range changes', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ points: MOCK_POINTS }),
    } as Response),
  );

  const { result, rerender } = renderHook(
    ({ range }: { range: '7D' | '1M' }) => useChartData('^STOXX50E', range),
    { initialProps: { range: '7D' as '7D' | '1M' } },
  );

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(global.fetch).toHaveBeenCalledTimes(1);

  rerender({ range: '1M' });

  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(global.fetch).toHaveBeenLastCalledWith(
    '/api/charts?symbol=%5ESTOXX50E&range=1M',
  );
});
