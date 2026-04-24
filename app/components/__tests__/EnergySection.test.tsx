jest.mock('@/lib/useChartData', () => ({
  useChartData: () => ({ points: [], loading: false, error: null }),
}));

jest.mock('@/lib/useNordPoolChartData', () => ({
  useNordPoolChartData: () => ({ data: null, loading: false, error: null }),
}));

jest.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  Bar: () => null,
  Cell: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
}));

import { render, screen } from '@testing-library/react';
import EnergySection from '../EnergySection';
import type { EnergyData } from '@/types';

const MOCK_DATA: EnergyData = {
  brent: { symbol: 'BZ=F', label: 'Brent Crude', price: 83.4, change: -0.3, changePercent: -0.36 },
};

describe('EnergySection', () => {
  it('renders section heading', () => {
    render(<EnergySection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('Energia')).toBeInTheDocument();
  });

  it('renders Brent crude price', () => {
    render(<EnergySection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('$83.40')).toBeInTheDocument();
  });

  it('renders Nord Pool card label', () => {
    render(<EnergySection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText('Nord Pool EE')).toBeInTheDocument();
  });

  it('shows loading skeleton for Brent while loading', () => {
    const { container } = render(<EnergySection data={null} loading={true} error={null} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows error message when energy data fails', () => {
    render(<EnergySection data={null} loading={false} error="Energia andmete laadimine ebaõnnestus" />);
    expect(screen.getByText('Energia andmete laadimine ebaõnnestus')).toBeInTheDocument();
  });
});
