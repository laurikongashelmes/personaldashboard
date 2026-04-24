// @jest-environment node
import { fetchWeatherData } from '../weather-api';

const MOCK_OPEN_METEO = {
  current: {
    temperature_2m: 8.2,
    weather_code: 2,
  },
  hourly: {
    time: [
      '2024-04-24T00:00', '2024-04-24T03:00', '2024-04-24T06:00',
      '2024-04-24T09:00', '2024-04-24T12:00', '2024-04-24T15:00',
      '2024-04-24T18:00', '2024-04-24T21:00',
    ],
    temperature_2m: [5, 5, 6, 8, 11, 10, 8, 7],
    weather_code: [0, 0, 1, 2, 2, 3, 61, 61],
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
    const result = await fetchWeatherData({ lat: 59.437, lon: 24.7536 });
    expect(Array.isArray(result.hourly)).toBe(true);
    result.hourly.forEach(slot => {
      expect(slot).toHaveProperty('time');
      expect(slot).toHaveProperty('temp');
      expect(slot).toHaveProperty('emoji');
    });
  });

  it('throws when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as jest.Mock;
    await expect(fetchWeatherData({ lat: 59.437, lon: 24.7536 })).rejects.toThrow();
  });
});
