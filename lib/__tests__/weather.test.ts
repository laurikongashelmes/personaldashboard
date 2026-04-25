// @jest-environment node
import { mapWeatherCode, filterRemainingHourly, buildDailyChart } from '../weather';
import type { HourlySlot } from '../../types';

describe('mapWeatherCode', () => {
  it('maps code 0 to clear sky', () => {
    expect(mapWeatherCode(0)).toEqual({ description: 'Selge taevas', emoji: '☀️' });
  });

  it('maps code 2 to partly cloudy', () => {
    expect(mapWeatherCode(2)).toEqual({ description: 'Osaliselt pilves', emoji: '⛅' });
  });

  it('maps code 61 to rain', () => {
    expect(mapWeatherCode(61)).toEqual({ description: 'Kerge vihm', emoji: '🌧️' });
  });

  it('returns unknown for unmapped codes', () => {
    const result = mapWeatherCode(999);
    expect(result.description).toBe('Teadmata');
  });
});

describe('filterRemainingHourly', () => {
  // April 2024: Tallinn is UTC+3 (EEST)
  // 10:00 Tallinn = 07:00 UTC = '2024-04-24T07:00'
  // 14:00 Tallinn = 11:00 UTC = '2024-04-24T11:00'
  // 18:00 Tallinn = 15:00 UTC = '2024-04-24T15:00'
  // 22:00 Tallinn = 19:00 UTC = '2024-04-24T19:00'
  const times = [
    '2024-04-24T00:00', '2024-04-24T01:00', '2024-04-24T02:00',
    '2024-04-24T03:00', '2024-04-24T04:00', '2024-04-24T05:00',
    '2024-04-24T06:00',
    '2024-04-24T07:00', // 10:00 Tallinn
    '2024-04-24T08:00', '2024-04-24T09:00', '2024-04-24T10:00',
    '2024-04-24T11:00', // 14:00 Tallinn
    '2024-04-24T12:00', '2024-04-24T13:00', '2024-04-24T14:00',
    '2024-04-24T15:00', // 18:00 Tallinn
    '2024-04-24T16:00', '2024-04-24T17:00', '2024-04-24T18:00',
    '2024-04-24T19:00', // 22:00 Tallinn
    '2024-04-24T20:00', '2024-04-24T21:00', '2024-04-24T22:00', '2024-04-24T23:00',
  ];
  const temps = times.map((_, i) => 10 + i);
  const codes = times.map(() => 0);

  it('returns slots at 10:00, 14:00, 18:00, 22:00 for the given date', () => {
    const result = filterRemainingHourly(times, temps, codes, '2024-04-24');
    expect(result.map(s => s.time)).toEqual(['10:00', '14:00', '18:00', '22:00']);
  });

  it('returns correct temperatures for matched slots', () => {
    const result = filterRemainingHourly(times, temps, codes, '2024-04-24');
    // index 7 → 10:00 Tallinn: temp = 10+7 = 17
    // index 11 → 14:00 Tallinn: temp = 10+11 = 21
    expect(result[0].temp).toBe(17);
    expect(result[1].temp).toBe(21);
  });

  it('returns empty array when no slots match the given date', () => {
    const result = filterRemainingHourly(times, temps, codes, '2024-04-25');
    expect(result).toEqual([]);
  });

  it('returns correct emoji and description for each slot', () => {
    const result = filterRemainingHourly(times, temps, codes, '2024-04-24');
    result.forEach((slot: HourlySlot) => {
      expect(slot.time).toMatch(/^\d{2}:\d{2}$/);
      expect(slot.emoji).toBeTruthy();
      expect(slot.description).toBeTruthy();
    });
  });
});

describe('buildDailyChart', () => {
  // April 2024: Tallinn is UTC+3 (EEST)
  // today (2024-04-24 Tallinn) spans 2024-04-23T21:00Z → 2024-04-24T20:00Z (24 hours)
  const todayTimes = [
    '2024-04-23T21:00', // hour 0
    '2024-04-23T22:00', // hour 1
    '2024-04-23T23:00', // hour 2
    '2024-04-24T00:00', // hour 3
    '2024-04-24T01:00', // hour 4
    '2024-04-24T02:00', // hour 5
    '2024-04-24T03:00', // hour 6
    '2024-04-24T04:00', // hour 7
    '2024-04-24T05:00', // hour 8
    '2024-04-24T06:00', // hour 9
    '2024-04-24T07:00', // hour 10
    '2024-04-24T08:00', // hour 11
    '2024-04-24T09:00', // hour 12
    '2024-04-24T10:00', // hour 13
    '2024-04-24T11:00', // hour 14
    '2024-04-24T12:00', // hour 15
    '2024-04-24T13:00', // hour 16
    '2024-04-24T14:00', // hour 17
    '2024-04-24T15:00', // hour 18
    '2024-04-24T16:00', // hour 19
    '2024-04-24T17:00', // hour 20
    '2024-04-24T18:00', // hour 21
    '2024-04-24T19:00', // hour 22
    '2024-04-24T20:00', // hour 23
  ];
  // wrap with one slot before today and one after to verify exclusion
  const times = ['2024-04-23T20:00', ...todayTimes, '2024-04-24T21:00'];
  const temps = times.map((_, i) => i); // 0, 1, 2, …

  it('returns exactly 24 points for a full day', () => {
    const result = buildDailyChart(times, temps, '2024-04-24');
    expect(result).toHaveLength(24);
  });

  it('returns hours 0 through 23 in order', () => {
    const result = buildDailyChart(times, temps, '2024-04-24');
    expect(result.map(p => p.hour)).toEqual(
      Array.from({ length: 24 }, (_, i) => i),
    );
  });

  it('rounds temperatures to integers', () => {
    const fracTemps = times.map((_, i) => i + 0.7);
    const result = buildDailyChart(times, fracTemps, '2024-04-24');
    result.forEach(p => expect(Number.isInteger(p.temp)).toBe(true));
  });

  it('excludes slots outside the target date in Tallinn', () => {
    const result = buildDailyChart(times, temps, '2024-04-24');
    expect(result).toHaveLength(24); // 26 inputs → only 24 pass the date filter
  });

  it('returns empty array when no data matches the date', () => {
    const result = buildDailyChart([], [], '2024-04-24');
    expect(result).toEqual([]);
  });

  it('maps correct temp to each hour (spot check)', () => {
    const result = buildDailyChart(times, temps, '2024-04-24');
    // todayTimes[0] is at index 1 in `times`, so temp = 1 → hour 0
    expect(result[0]).toEqual({ hour: 0, temp: 1 });
    // todayTimes[23] is at index 24 in `times`, so temp = 24 → hour 23
    expect(result[23]).toEqual({ hour: 23, temp: 24 });
  });

  it('returns only tomorrow data when given tomorrow date', () => {
    // todayTimes are all 2024-04-24 Tallinn, so requesting 2024-04-25 returns only the last slot (21:00 UTC = 00:00 Tallinn 2024-04-25)
    const result = buildDailyChart(times, temps, '2024-04-25');
    expect(result).toEqual([{ hour: 0, temp: 25 }]);
  });
});
