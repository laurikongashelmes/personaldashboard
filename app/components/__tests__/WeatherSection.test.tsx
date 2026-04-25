import { render, screen, fireEvent } from '@testing-library/react';
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
    { time: '10:00', temp: 7,  description: 'Peamiselt selge',  emoji: '🌤️' },
    { time: '14:00', temp: 11, description: 'Osaliselt pilves', emoji: '⛅' },
    { time: '18:00', temp: 8,  description: 'Vihm',             emoji: '🌧️' },
    { time: '22:00', temp: 5,  description: 'Pilves',           emoji: '☁️' },
  ],
  dailyChart: [
    { hour: 0,  temp: 3 },
    { hour: 6,  temp: 4 },
    { hour: 12, temp: 11 },
    { hour: 17, temp: 8 },
    { hour: 23, temp: 5 },
  ],
  tomorrow: {
    hourly: [
      { time: '10:00', temp: 6,  description: 'Peamiselt selge',  emoji: '🌤️' },
      { time: '14:00', temp: 10, description: 'Osaliselt pilves', emoji: '⛅' },
      { time: '18:00', temp: 9,  description: 'Vihm',             emoji: '🌧️' },
      { time: '22:00', temp: 4,  description: 'Pilves',           emoji: '☁️' },
    ],
    dailyChart: [
      { hour: 0,  temp: 2 },
      { hour: 12, temp: 10 },
      { hour: 23, temp: 4 },
    ],
  },
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
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
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
    expect(screen.queryByText('8°C ⛅')).not.toBeInTheDocument();
    expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
  });

  it('renders Täna and Homme toggle buttons', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByRole('button', { name: 'Täna' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Homme' })).toBeInTheDocument();
  });

  it('clicking Homme shows Homne prognoos and hides current temp', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Homme' }));
    expect(screen.getByText('Homne prognoos')).toBeInTheDocument();
    expect(screen.queryByText('8°C ⛅')).not.toBeInTheDocument();
  });

  it('clicking Homme switches to tomorrow slot temperatures', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    // Today's 14:00 slot shows 11° (unique to today — tomorrow has no 11° slot)
    expect(screen.getByText('11°')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Homme' }));
    // Tomorrow's 14:00 slot shows 10° (unique to tomorrow — today has no 10° slot)
    expect(screen.getByText('10°')).toBeInTheDocument();
    expect(screen.queryByText('11°')).not.toBeInTheDocument();
  });

  it('clicking Homme shows Temperatuur homme chart label', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Homme' }));
    expect(screen.getByText('Temperatuur homme')).toBeInTheDocument();
    expect(screen.queryByText('Temperatuur täna')).not.toBeInTheDocument();
  });

  it('clicking Täna after Homme restores today view', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Homme' }));
    fireEvent.click(screen.getByRole('button', { name: 'Täna' }));
    expect(screen.getByText('8°C ⛅')).toBeInTheDocument();
    expect(screen.queryByText('Homne prognoos')).not.toBeInTheDocument();
  });

  it('highlights the next upcoming slot with indigo styling', () => {
    // Pin clock to 10:00 Tallinn (07:00 UTC) — next slot after hour 10 is 14:00
    jest.useFakeTimers().setSystemTime(new Date('2024-04-24T07:00:00Z'));
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    const slots = document.querySelectorAll('[class*="rounded-lg"]');
    const slot14 = Array.from(slots).find(el => el.textContent?.includes('14:00'));
    expect(slot14?.className).toMatch(/bg-indigo-50/);
    jest.useRealTimers();
  });

  it('highlights first tomorrow slot (10:00) when Homme is selected', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Homme' }));
    const slots = document.querySelectorAll('[class*="rounded-lg"]');
    const slot10 = Array.from(slots).find(el => el.textContent?.includes('10:00'));
    expect(slot10?.className).toMatch(/bg-indigo-50/);
  });

  it('Homme view renders Homne prognoos with the same large text size as today temperature', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Homme' }));
    const heading = screen.getByText('Homne prognoos');
    expect(heading.className).toMatch(/text-4xl/);
  });

  it('Homme view renders a same-height description placeholder to preserve card height', () => {
    render(<WeatherSection data={MOCK_DATA} loading={false} error={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Homme' }));
    const heading = screen.getByText('Homne prognoos');
    const placeholder = heading.nextElementSibling;
    expect(placeholder).not.toBeNull();
    expect(placeholder?.className).toMatch(/text-sm/);
    expect(placeholder?.className).toMatch(/mb-4/);
  });
});
