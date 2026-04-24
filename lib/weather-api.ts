import type { WeatherData } from '../types';
import { mapWeatherCode, filterRemainingHourly } from './weather';

interface Coords {
  lat: number;
  lon: number;
}

export async function fetchWeatherData(coords: Coords): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    current: 'temperature_2m,weather_code',
    hourly: 'temperature_2m,weather_code',
    forecast_days: '1',
    timezone: 'UTC',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);
  const json = await res.json();

  const currentTemp = Math.round(json.current.temperature_2m);
  const { description, emoji } = mapWeatherCode(json.current.weather_code);

  const hourly = filterRemainingHourly(
    json.hourly.time,
    json.hourly.temperature_2m,
    json.hourly.weather_code,
  );

  return { currentTemp, description, emoji, hourly };
}
