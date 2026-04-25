// @jest-environment node
import { fetchWeatherData } from '../weather-api';

const MOCK_OPEN_METEO = {
  current: {
    temperature_2m: 8.2,
    weather_code: 2,
  },
  hourly: {
    time: [
      // 2024-04-24 Tallinn (today) — key Tallinn hours at UTC offsets
      '2024-04-23T21:00', // hour 0 Tallinn on 2024-04-24
      '2024-04-24T07:00', // 10:00 Tallinn
      '2024-04-24T11:00', // 14:00 Tallinn
      '2024-04-24T15:00', // 18:00 Tallinn
      '2024-04-24T19:00', // 22:00 Tallinn
      // 2024-04-25 Tallinn (tomorrow)
      '2024-04-24T21:00', // hour 0 Tallinn on 2024-04-25
      '2024-04-25T07:00', // 10:00 Tallinn tomorrow
      '2024-04-25T11:00', // 14:00 Tallinn tomorrow
      '2024-04-25T15:00', // 18:00 Tallinn tomorrow
      '2024-04-25T19:00', // 22:00 Tallinn tomorrow
    ],
    temperature_2m: [3, 9, 12, 10, 7, 2, 8, 13, 11, 8],
    weather_code:   [0, 1,  2,  3, 0, 1,  2,  3,  0, 1],
  },
};

describe('fetchWeatherData', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_OPEN_METEO,
    }) as jest.Mock;
  });

  it('returns current temperature rounded to integer', async () => {
    const result = await fetchWeatherData({ lat: 59.437, lon: 24.7536 });
    expect(result.current.temp).toBe(8);
  });

  it('returns current weather description and emoji', async () => {
    const result = await fetchWeatherData({ lat: 59.437, lon: 24.7536 });
    expect(result.current.description).toBe('Osaliselt pilves');
    expect(result.current.emoji).toBe('⛅');
  });

  it('returns hourly forecast slots', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-04-24T10:00:00Z'));
    const result = await fetchWeatherData({ lat: 59.437, lon: 24.7536 });
    expect(Array.isArray(result.hourly)).toBe(true);
    result.hourly.forEach(slot => {
      expect(slot).toHaveProperty('time');
      expect(slot).toHaveProperty('temp');
      expect(slot).toHaveProperty('emoji');
    });
    jest.useRealTimers();
  });

  it('returns dailyChart with hour and temp properties', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-04-24T10:00:00Z'));
    const result = await fetchWeatherData({ lat: 59.437, lon: 24.7536 });
    expect(result.dailyChart.length).toBeGreaterThan(0);
    result.dailyChart.forEach(point => {
      expect(typeof point.hour).toBe('number');
      expect(typeof point.temp).toBe('number');
      expect(point.hour).toBeGreaterThanOrEqual(0);
      expect(point.hour).toBeLessThanOrEqual(23);
    });
    jest.useRealTimers();
  });

  it('throws when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as jest.Mock;
    await expect(fetchWeatherData({ lat: 59.437, lon: 24.7536 })).rejects.toThrow();
  });

  it('returns tomorrow with hourly and dailyChart arrays', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-04-24T10:00:00Z'));
    const result = await fetchWeatherData({ lat: 59.437, lon: 24.7536 });
    expect(result.tomorrow).toBeDefined();
    expect(Array.isArray(result.tomorrow.hourly)).toBe(true);
    expect(Array.isArray(result.tomorrow.dailyChart)).toBe(true);
    expect(result.tomorrow.hourly.length).toBeGreaterThan(0);
    expect(result.tomorrow.dailyChart.length).toBeGreaterThan(0);
    result.tomorrow.hourly.forEach(slot => {
      expect(slot).toHaveProperty('time');
      expect(slot).toHaveProperty('temp');
      expect(slot).toHaveProperty('emoji');
    });
    jest.useRealTimers();
  });
});
