// @jest-environment node
import { fetchNordPoolChartData } from '../nordpool-chart';

// NOW = 2024-04-25T12:30:00Z = 15:30 Tallinn (EEST +03:00)
const NOW = new Date('2024-04-25T12:30:00.000Z');

// 2024-04-25 00:00:00 +03:00 = 2024-04-24T21:00:00Z
const TODAY_HOUR_0_UNIX = Math.floor(new Date('2024-04-24T21:00:00.000Z').getTime() / 1000);
// 24 hourly entries, prices 80..103
const TODAY_ENTRIES = Array.from({ length: 24 }, (_, i) => ({
  timestamp: TODAY_HOUR_0_UNIX + i * 3600,
  price: 80 + i,
}));

// 2024-04-26 00:00:00 +03:00 = 2024-04-25T21:00:00Z
const TOMORROW_HOUR_0_UNIX = Math.floor(new Date('2024-04-25T21:00:00.000Z').getTime() / 1000);
const TOMORROW_ENTRIES = Array.from({ length: 24 }, (_, i) => ({
  timestamp: TOMORROW_HOUR_0_UNIX + i * 3600,
  price: 60 + i,
}));

function eleringOk(entries: Array<{ timestamp: number; price: number }>) {
  return { ok: true, json: async () => ({ success: true, data: { ee: entries } }) };
}

beforeEach(() => jest.resetAllMocks());

describe('fetchNordPoolChartData — CURRENT', () => {
  it('returns 48 points and hasTomorrow=true when tomorrow data is available', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(eleringOk(TODAY_ENTRIES))
      .mockResolvedValueOnce(eleringOk(TOMORROW_ENTRIES)) as jest.Mock;

    const result = await fetchNordPoolChartData('CURRENT', NOW);

    expect('currentHourIndex' in result).toBe(true);
    if (!('currentHourIndex' in result)) return;
    expect(result.points).toHaveLength(48);
    expect(result.hasTomorrow).toBe(true);
  });

  it('sets currentHourIndex=15 and currentHourPrice=95 for 15:30 Tallinn', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(eleringOk(TODAY_ENTRIES))
      .mockResolvedValueOnce(eleringOk(TOMORROW_ENTRIES)) as jest.Mock;

    const result = await fetchNordPoolChartData('CURRENT', NOW);

    if (!('currentHourIndex' in result)) throw new Error('expected NordPoolCurrentData');
    // Hour 15 in Tallinn = index 15 in the 00:00-23:00 array
    expect(result.currentHourIndex).toBe(15);
    // price for index 15 = 80 + 15 = 95
    expect(result.currentHourPrice).toBe(95);
  });

  it('computes todayAvgPrice correctly', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(eleringOk(TODAY_ENTRIES))
      .mockResolvedValueOnce(eleringOk(TOMORROW_ENTRIES)) as jest.Mock;

    const result = await fetchNordPoolChartData('CURRENT', NOW);

    if (!('currentHourIndex' in result)) throw new Error('expected NordPoolCurrentData');
    // sum(80..103) = 24*80 + sum(0..23) = 1920+276 = 2196; avg = 2196/24 = 91.5
    expect(result.todayAvgPrice).toBe(91.5);
  });

  it('returns 24 points and hasTomorrow=false when tomorrow fetch returns empty', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(eleringOk(TODAY_ENTRIES))
      .mockResolvedValueOnce(eleringOk([])) as jest.Mock;

    const result = await fetchNordPoolChartData('CURRENT', NOW);

    if (!('currentHourIndex' in result)) throw new Error('expected NordPoolCurrentData');
    expect(result.points).toHaveLength(24);
    expect(result.hasTomorrow).toBe(false);
  });

  it('returns 24 points and hasTomorrow=false when tomorrow fetch throws', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(eleringOk(TODAY_ENTRIES))
      .mockRejectedValueOnce(new Error('Network error')) as jest.Mock;

    const result = await fetchNordPoolChartData('CURRENT', NOW);

    if (!('currentHourIndex' in result)) throw new Error('expected NordPoolCurrentData');
    expect(result.points).toHaveLength(24);
    expect(result.hasTomorrow).toBe(false);
  });

  it('throws when today fetch fails', async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network error')) as jest.Mock;

    await expect(fetchNordPoolChartData('CURRENT', NOW)).rejects.toThrow();
  });

  it('converts Elering seconds timestamps to milliseconds in ChartPoints', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(eleringOk(TODAY_ENTRIES))
      .mockResolvedValueOnce(eleringOk([])) as jest.Mock;

    const result = await fetchNordPoolChartData('CURRENT', NOW);

    if (!('currentHourIndex' in result)) throw new Error('expected NordPoolCurrentData');
    expect(result.points[0].timestamp).toBe(TODAY_HOUR_0_UNIX * 1000);
  });

  it('returns currentHourPrice=null when now does not fall in any point window', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(eleringOk(TODAY_ENTRIES))
      .mockResolvedValueOnce(eleringOk([])) as jest.Mock;

    // Use a time well outside today's entries to force no-match
    const outsideNow = new Date('2024-04-23T12:00:00.000Z');
    const result = await fetchNordPoolChartData('CURRENT', outsideNow);

    if (!('currentHourIndex' in result)) throw new Error('expected NordPoolCurrentData');
    expect(result.currentHourPrice).toBeNull();
  });
});

describe('fetchNordPoolChartData — 1M', () => {
  it('makes one Elering fetch and returns daily averages', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(eleringOk([])) as jest.Mock;

    const result = await fetchNordPoolChartData('1M', NOW);

    expect(!('currentHourIndex' in result)).toBe(true);
    expect(result.points).toHaveLength(0);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('fetchNordPoolChartData — 7D', () => {
  it('returns one ChartPoint per day (daily averages)', async () => {
    // 7 days * 24 entries each = 168 entries, all on different Tallinn days
    const sevenDaysAgo = new Date('2024-04-18T21:00:00.000Z'); // 2024-04-19 00:00 Tallinn
    const weekEntries = Array.from({ length: 7 }, (_, dayIdx) =>
      Array.from({ length: 24 }, (_, hourIdx) => ({
        timestamp: Math.floor(sevenDaysAgo.getTime() / 1000) + dayIdx * 86400 + hourIdx * 3600,
        price: 100 + dayIdx, // same price all 24h each day → avg = 100+dayIdx
      })),
    ).flat();

    global.fetch = jest.fn().mockResolvedValueOnce(eleringOk(weekEntries)) as jest.Mock;

    const result = await fetchNordPoolChartData('7D', NOW);

    expect(!('currentHourIndex' in result)).toBe(true);
    // 7 days of data → 7 daily averages
    expect(result.points).toHaveLength(7);
    expect(result.points[0].price).toBe(100);
    expect(result.points[6].price).toBe(106);
  });
});

describe('fetchNordPoolChartData — 1Y', () => {
  it('groups daily averages into weekly averages', async () => {
    // 14 days (2 weeks) of hourly data
    const twoWeeksAgo = new Date('2024-04-11T21:00:00.000Z'); // 2024-04-12 00:00 Tallinn
    const entries = Array.from({ length: 14 }, (_, dayIdx) =>
      Array.from({ length: 24 }, (_, hourIdx) => ({
        timestamp: Math.floor(twoWeeksAgo.getTime() / 1000) + dayIdx * 86400 + hourIdx * 3600,
        price: 10 * (dayIdx + 1), // day 1 = 10, day 2 = 20, ..., day 14 = 140
      })),
    ).flat();

    global.fetch = jest.fn().mockResolvedValueOnce(eleringOk(entries)) as jest.Mock;

    const result = await fetchNordPoolChartData('1Y', NOW);

    expect(!('currentHourIndex' in result)).toBe(true);
    // 14 days → 2 weeks (7 days each)
    expect(result.points).toHaveLength(2);
    // week 1 avg: (10+20+30+40+50+60+70)/7 = 280/7 = 40
    expect(result.points[0].price).toBe(40);
    // week 2 avg: (80+90+100+110+120+130+140)/7 = 770/7 = 110
    expect(result.points[1].price).toBe(110);
  });
});
