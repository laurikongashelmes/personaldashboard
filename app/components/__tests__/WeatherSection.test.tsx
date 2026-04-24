import { render, screen } from '@testing-library/react';
import WeatherSection from '../WeatherSection';
import type { WeatherData } from '@/types';

jest.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const MOCK_DATA: WeatherData = {
  current: {
    temp: 8,
    description: 'Osaliselt pilves',
    emoji: '⛅',
  },
  hourly: [
    { time: '06:00', temp: 4,  description: 'Peamiselt selge',  emoji: '🌤️' },
    { time: '12:00', temp: 11, description: 'Osaliselt pilves', emoji: '⛅' },
    { time: '18:00', temp: 8,  description: 'Vihm',             emoji: '🌧️' },
    { time: '00:00', temp: 5,  description: 'Pilves',           emoji: '☁️' },
  ],
  dailyChart: [
    { hour: 0,  temp: 3 },
    { hour: 6,  temp: 4 },
    { hour: 12, temp: 11 },
    { hour: 17, temp: 8 },
    { hour: 23, temp: 5 },
  ],
};

describe('WeatherSection', () => {
  it('renders section heading', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('Ilm · Tallinn')).toBeInTheDocument();
  });

  it('renders current temperature and emoji', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('8°C ⛅')).toBeInTheDocument();
  });

  it('renders current weather description', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('Osaliselt pilves')).toBeInTheDocument();
  });

  it('renders hourly forecast times', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('06:00')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('renders the temperature chart when dailyChart has data', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders the chart section label', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('Temperatuur täna')).toBeInTheDocument();
  });

  it('does not render chart when dailyChart is empty', () => {
    const data = { ...MOCK_DATA, dailyChart: [] };
    render(<WeatherSection data={data} loading={false} error={null} />);
    expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
  });

  it('shows error message on error', () => {
    render(<WeatherSection data={null} loading={false} error="Viga" />);
    expect(screen.getByText('Viga')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    render(<WeatherSection data={null} loading={true} error={null} />);
    // skeleton renders no time slots, chart, or temperature
    expect(screen.queryByText('8°C ⛅')).not.toBeInTheDocument();
    expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
  });

  it('highlights the next upcoming slot with indigo styling', () => {
    // Pin clock to 10:00 Tallinn (07:00 UTC) — 12:00 should be next
    jest.useFakeTimers().setSystemTime(new Date('2024-04-24T07:00:00Z'));
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    const slots = document.querySelectorAll('[class*="rounded-lg"]');
    const slot12 = Array.from(slots).find(el => el.textContent?.includes('12:00'));
    expect(slot12?.className).toMatch(/bg-indigo-50/);
    jest.useRealTimers();
  });

  it('highlights 00:00 slot when current hour is past 18:00', () => {
    // 17:00 UTC = 20:00 Tallinn (UTC+3 in April) — 18:00 has passed, next should be 00:00
    jest.useFakeTimers().setSystemTime(new Date('2024-04-24T17:00:00Z'));
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    const slots = document.querySelectorAll('[class*="rounded-lg"]');
    const slot00 = Array.from(slots).find(el => el.textContent?.includes('00:00'));
    expect(slot00?.className).toMatch(/bg-indigo-50/);
    jest.useRealTimers();
  });
});
