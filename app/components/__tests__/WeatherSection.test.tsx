import { render, screen } from '@testing-library/react';
import WeatherSection from '../WeatherSection';
import type { WeatherData } from '@/types';

const MOCK_DATA: WeatherData = {
  current: {
    temp: 8,
    description: 'Osaliselt pilves',
    emoji: '⛅',
  },
  hourly: [
    { time: '12:00', temp: 11, description: 'Osaliselt pilves', emoji: '⛅' },
    { time: '15:00', temp: 10, description: 'Pilves', emoji: '☁️' },
    { time: '18:00', temp: 8, description: 'Vihm', emoji: '🌧️' },
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
    expect(screen.getByText('12:00')).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();
  });
});
