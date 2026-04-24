import type { HourlySlot } from '../types';

interface WeatherCondition {
  description: string;
  emoji: string;
}

const WMO_CODES: Record<number, WeatherCondition> = {
  0:  { description: 'Selge taevas',          emoji: '☀️' },
  1:  { description: 'Peamiselt selge',        emoji: '🌤️' },
  2:  { description: 'Osaliselt pilves',       emoji: '⛅' },
  3:  { description: 'Pilves',                 emoji: '☁️' },
  45: { description: 'Udu',                   emoji: '🌫️' },
  48: { description: 'Jäine udu',             emoji: '🌫️' },
  51: { description: 'Kerge uduvihm',         emoji: '🌦️' },
  53: { description: 'Uduvihm',               emoji: '🌦️' },
  55: { description: 'Tugev uduvihm',         emoji: '🌧️' },
  61: { description: 'Kerge vihm',            emoji: '🌧️' },
  63: { description: 'Vihm',                  emoji: '🌧️' },
  65: { description: 'Tugev vihm',            emoji: '🌧️' },
  71: { description: 'Kerge lumesadu',        emoji: '🌨️' },
  73: { description: 'Lumi',                  emoji: '🌨️' },
  75: { description: 'Tugev lumesadu',        emoji: '❄️' },
  80: { description: 'Vihmahoog',             emoji: '🌦️' },
  81: { description: 'Tugev vihmahoog',       emoji: '🌧️' },
  82: { description: 'Väga tugev vihmahoog',  emoji: '⛈️' },
  95: { description: 'Äike',                  emoji: '⛈️' },
  96: { description: 'Äike ja rahe',          emoji: '⛈️' },
  99: { description: 'Äike ja rahe',          emoji: '⛈️' },
};

export function mapWeatherCode(code: number): WeatherCondition {
  return WMO_CODES[code] ?? { description: 'Teadmata', emoji: '🌡️' };
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
