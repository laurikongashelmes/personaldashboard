import type { HourlySlot } from '../types';

interface WeatherCondition {
  description: string;
  emoji: string;
}

const WMO_CODES: Record<number, WeatherCondition> = {
  0:  { description: 'Clear sky',          emoji: '☀️' },
  1:  { description: 'Mainly clear',       emoji: '🌤️' },
  2:  { description: 'Partly cloudy',      emoji: '⛅' },
  3:  { description: 'Overcast',           emoji: '☁️' },
  45: { description: 'Fog',               emoji: '🌫️' },
  48: { description: 'Icy fog',           emoji: '🌫️' },
  51: { description: 'Light drizzle',     emoji: '🌦️' },
  53: { description: 'Drizzle',           emoji: '🌦️' },
  55: { description: 'Heavy drizzle',     emoji: '🌧️' },
  61: { description: 'Light rain',        emoji: '🌧️' },
  63: { description: 'Rain',              emoji: '🌧️' },
  65: { description: 'Heavy rain',        emoji: '🌧️' },
  71: { description: 'Light snow',        emoji: '🌨️' },
  73: { description: 'Snow',              emoji: '🌨️' },
  75: { description: 'Heavy snow',        emoji: '❄️' },
  80: { description: 'Rain showers',      emoji: '🌦️' },
  81: { description: 'Heavy showers',     emoji: '🌧️' },
  82: { description: 'Violent showers',   emoji: '⛈️' },
  95: { description: 'Thunderstorm',      emoji: '⛈️' },
  96: { description: 'Thunderstorm+hail', emoji: '⛈️' },
  99: { description: 'Thunderstorm+hail', emoji: '⛈️' },
};

export function mapWeatherCode(code: number): WeatherCondition {
  return WMO_CODES[code] ?? { description: 'Unknown', emoji: '🌡️' };
}

export function filterRemainingHourly(
  times: string[],
  temps: number[],
  codes: number[],
  now: Date = new Date(),
): HourlySlot[] {
  const currentHour = now.getUTCHours();
  const results: HourlySlot[] = [];

  for (let i = 0; i < times.length; i++) {
    const slotHour = new Date(times[i] + 'Z').getUTCHours();
    if (slotHour < currentHour) continue;
    if ((slotHour - currentHour) % 3 !== 0) continue;

    const { description, emoji } = mapWeatherCode(codes[i]);
    results.push({
      time: `${String(slotHour).padStart(2, '0')}:00`,
      temp: Math.round(temps[i]),
      description,
      emoji,
    });

    if (results.length >= 6) break;
  }

  return results;
}
