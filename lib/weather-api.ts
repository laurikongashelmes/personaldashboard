import type { WeatherData } from '../types';
import { mapWeatherCode, filterRemainingHourly, buildDailyChart, getTallinnDateStr } from './weather';

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
    forecast_days: '2',
    timezone: 'UTC',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);
  const json = await res.json();

  const now = new Date();
  const todayStr = getTallinnDateStr(now);
  const tomorrowStr = getTallinnDateStr(new Date(now.getTime() + 86_400_000));

  const times: string[] = json.hourly.time;
  const temps: number[] = json.hourly.temperature_2m;
  const codes: number[] = json.hourly.weather_code;

  const currentTemp = Math.round(json.current.temperature_2m);
  const { description, emoji } = mapWeatherCode(json.current.weather_code);

  return {
    current: { temp: currentTemp, description, emoji },
    hourly: filterRemainingHourly(times, temps, codes, todayStr),
    dailyChart: buildDailyChart(times, temps, todayStr),
    tomorrow: {
      hourly: filterRemainingHourly(times, temps, codes, tomorrowStr),
      dailyChart: buildDailyChart(times, temps, tomorrowStr),
    },
  };
}

