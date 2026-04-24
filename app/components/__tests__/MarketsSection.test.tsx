jest.mock('@/lib/useChartData', () => ({
  useChartData: () => ({ points: [], loading: false, error: null }),
}));

jest.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
}));

import { render, screen } from '@testing-library/react';
import MarketsSection from '../MarketsSection';
import type { TickerData } from '@/types';

const MOCK_TICKERS: TickerData[] = [
  { symbol: '^STOXX50E', label: 'EURO STOXX 50', price: 5142.3, change: 40.5, changePercent: 0.794 },
  { symbol: 'EURUSD=X', label: 'EUR/USD', price: 1.0732, change: -0.002, changePercent: -0.186 },
];

describe('MarketsSection', () => {
  it('renders section heading', () => {
    render(<MarketsSection data={MOCK_TICKERS} loading={false} error={null} />);
    expect(screen.getByText('Turud')).toBeInTheDocument();
  });

  it('renders a card for each ticker', () => {
    render(<MarketsSection data={MOCK_TICKERS} loading={false} error={null} />);
    expect(screen.getByText('EURO STOXX 50')).toBeInTheDocument();
    expect(screen.getByText('EUR/USD')).toBeInTheDocument();
  });

  it('shows positive change in green', () => {
    render(<MarketsSection data={MOCK_TICKERS} loading={false} error={null} />);
    const positive = screen.getByText('▲ +0.79%');
    expect(positive).toHaveClass('text-green-600');
  });

  it('shows negative change in red', () => {
    render(<MarketsSection data={MOCK_TICKERS} loading={false} error={null} />);
    const negative = screen.getByText('▼ −0.19%');
    expect(negative).toHaveClass('text-red-500');
  });

  it('renders loading skeletons when loading=true', () => {
    const { container } = render(<MarketsSection data={[]} loading={true} error={null} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
