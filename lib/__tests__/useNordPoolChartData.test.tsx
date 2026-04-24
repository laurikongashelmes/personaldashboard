import { renderHook, waitFor } from '@testing-library/react';
import { useNordPoolChartData } from '../useNordPoolChartData';

const MOCK_CURRENT_DATA = {
  points: [{ timestamp: 1714046400000, price: 95 }],
  hasTomorrow: false,
  currentHourIndex: 0,
  currentHourPrice: 95,
  todayAvgPrice: 91.5,
};

beforeEach(() => jest.resetAllMocks());

it('starts with loading=true and data=null', () => {
  global.fetch = jest.fn(() => new Promise(() => {})); // never resolves
  const { result } = renderHook(() => useNordPoolChartData('CURRENT'));
  expect(result.current.loading).toBe(true);
  expect(result.current.data).toBeNull();
  expect(result.current.error).toBeNull();
});

it('populates data on successful fetch', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(MOCK_CURRENT_DATA),
    } as Response),
  );

  const { result } = renderHook(() => useNordPoolChartData('CURRENT'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual(MOCK_CURRENT_DATA);
  expect(result.current.error).toBeNull();
});

it('sets error on HTTP error response', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: false, status: 503 } as Response),
  );

  const { result } = renderHook(() => useNordPoolChartData('CURRENT'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('Andmed pole saadaval');
  expect(result.current.data).toBeNull();
});

it('sets error on network failure', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

  const { result } = renderHook(() => useNordPoolChartData('CURRENT'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('Andmed pole saadaval');
});

it('calls the correct URL', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ points: [] }),
    } as Response),
  );

  const { result } = renderHook(() => useNordPoolChartData('7D'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(global.fetch).toHaveBeenCalledWith('/api/nordpool-chart?range=7D');
});

it('re-fetches when range changes', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ points: [] }),
    } as Response),
  );

  const { result, rerender } = renderHook(
    ({ range }: { range: 'CURRENT' | '7D' }) => useNordPoolChartData(range),
    { initialProps: { range: 'CURRENT' as const } },
  );

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(global.fetch).toHaveBeenCalledTimes(1);

  rerender({ range: '7D' });

  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(global.fetch).toHaveBeenLastCalledWith('/api/nordpool-chart?range=7D');
});

it('does not update state after unmount (cancellation)', async () => {
  let resolveStale!: (v: Response) => void;
  const stalePromise = new Promise<Response>(res => { resolveStale = res; });

  global.fetch = jest.fn().mockReturnValueOnce(stalePromise);

  const { result, unmount } = renderHook(() => useNordPoolChartData('CURRENT'));

  unmount(); // triggers cancelled = true

  resolveStale({ ok: true, json: () => Promise.resolve(MOCK_CURRENT_DATA) } as Response);
  await new Promise(r => setTimeout(r, 50));

  // State should remain in its initial form — no update after cancellation
  expect(result.current.data).toBeNull();
  expect(result.current.loading).toBe(true);
});
