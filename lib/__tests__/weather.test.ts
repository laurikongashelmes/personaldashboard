// @jest-environment node
import { mapWeatherCode, filterRemainingHourly } from '../weather';
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
  it('returns slots from current hour onwards, up to 6 slots, every 3 hours', () => {
    const times = ['2024-04-24T08:00', '2024-04-24T09:00', '2024-04-24T10:00',
                   '2024-04-24T11:00', '2024-04-24T12:00', '2024-04-24T13:00',
                   '2024-04-24T14:00', '2024-04-24T15:00', '2024-04-24T16:00',
                   '2024-04-24T17:00', '2024-04-24T18:00', '2024-04-24T19:00',
                   '2024-04-24T20:00', '2024-04-24T21:00', '2024-04-24T22:00',
                   '2024-04-24T23:00'];
    const temps = times.map((_, i) => 10 + i);
    const codes = times.map(() => 0);
    const currentHour = new Date('2024-04-24T09:00:00Z');

    const result = filterRemainingHourly(times, temps, codes, currentHour);
    expect(result.length).toBeLessThanOrEqual(6);
    result.forEach((slot: HourlySlot) => {
      expect(slot.time).toMatch(/^\d{2}:\d{2}$/);
      expect(slot.emoji).toBeTruthy();
    });
  });
});
