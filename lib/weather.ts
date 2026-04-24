import type { HourlySlot, TempPoint } from '../types';

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

const TALLINN_TZ = 'Europe/Tallinn';

function getTallinnHour(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      hourCycle: 'h23',
      timeZone: TALLINN_TZ,
    }).format(date),
    10,
  );
}

function getTallinnDateStr(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: TALLINN_TZ });
}

export function filterRemainingHourly(
  times: string[],
  temps: number[],
  codes: number[],
  now: Date = new Date(),
): HourlySlot[] {
  const todayStr = getTallinnDateStr(now);
  const [y, m, d] = todayStr.split('-').map(Number);
  const tomorrowStr = getTallinnDateStr(new Date(Date.UTC(y, m - 1, d + 1)));

  const results: HourlySlot[] = [];

  for (let i = 0; i < times.length; i++) {
    const slotDate = new Date(times[i] + 'Z');
    const slotDateStr = getTallinnDateStr(slotDate);
    const hour = getTallinnHour(slotDate);

    const isTarget =
      (slotDateStr === todayStr && (hour === 6 || hour === 12 || hour === 18)) ||
      (slotDateStr === tomorrowStr && hour === 0);

    if (!isTarget) continue;

    const { description, emoji } = mapWeatherCode(codes[i]);
    results.push({
      time: `${String(hour).padStart(2, '0')}:00`,
      temp: Math.round(temps[i]),
      description,
      emoji,
    });
  }

  return results;
}

export function buildDailyChart(
  times: string[],
  temps: number[],
  now: Date = new Date(),
): TempPoint[] {
  const todayStr = getTallinnDateStr(now);
  const results: TempPoint[] = [];

  for (let i = 0; i < times.length; i++) {
    const slotDate = new Date(times[i] + 'Z');
    if (getTallinnDateStr(slotDate) !== todayStr) continue;
    results.push({
      hour: getTallinnHour(slotDate),
      temp: Math.round(temps[i]),
    });
  }

  return results;
}
