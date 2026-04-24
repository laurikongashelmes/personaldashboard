import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TickerCard from '../TickerCard';

jest.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
}));

jest.mock('@/lib/useChartData');
import { useChartData } from '@/lib/useChartData';
const mockUseChartData = useChartData as jest.Mock;

const BASE_PROPS = {
  label: 'EURO STOXX 50',
  symbol: '^STOXX50E',
  price: 5241.0,
  change: 32.4,
  changePercent: 0.62,
  formatValue: (p: number) => p.toFixed(1),
};

describe('TickerCard', () => {
  beforeEach(() => {
    mockUseChartData.mockReturnValue({ points: [], loading: false, error: null });
    localStorage.clear();
  });

  it('renders the label', () => {
    render(<TickerCard {...BASE_PROPS} />);
    expect(screen.getByText('EURO STOXX 50')).toBeInTheDocument();
  });

  it('renders the formatted price', () => {
    render(<TickerCard {...BASE_PROPS} />);
    expect(screen.getByText('5241.0')).toBeInTheDocument();
  });

  it('renders positive change in green', () => {
    render(<TickerCard {...BASE_PROPS} />);
    const el = screen.getByText('▲ +0.62%');
    expect(el).toHaveClass('text-green-600');
  });

  it('renders negative change in red', () => {
    render(<TickerCard {...BASE_PROPS} changePercent={-0.14} change={-0.002} />);
    const el = screen.getByText('▼ −0.14%');
    expect(el).toHaveClass('text-red-500');
  });

  it('renders all four range buttons', () => {
    render(<TickerCard {...BASE_PROPS} />);
    expect(screen.getByRole('button', { name: '1D' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7D' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1M' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1Y' })).toBeInTheDocument();
  });

  it('7D is active by default', () => {
    render(<TickerCard {...BASE_PROPS} />);
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '1D' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches active range when a button is clicked', async () => {
    render(<TickerCard {...BASE_PROPS} />);
    await userEvent.click(screen.getByRole('button', { name: '1M' }));
    expect(screen.getByRole('button', { name: '1M' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows skeleton in chart area while loading', () => {
    mockUseChartData.mockReturnValue({ points: [], loading: true, error: null });
    const { container } = render(<TickerCard {...BASE_PROPS} />);
    expect(container.querySelector('[data-testid="chart-skeleton"]')).toBeInTheDocument();
  });

  it('shows error message when chart data fails', () => {
    mockUseChartData.mockReturnValue({ points: [], loading: false, error: 'Andmed pole saadaval' });
    render(<TickerCard {...BASE_PROPS} />);
    expect(screen.getByText('Andmed pole saadaval')).toBeInTheDocument();
  });

  it('shows dash and no change when price is null', () => {
    render(<TickerCard {...BASE_PROPS} price={null} change={null} changePercent={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText(/▲|▼/)).not.toBeInTheDocument();
  });

  it('initialises to stored range from localStorage', () => {
    localStorage.setItem('chart-range-^STOXX50E', '1M');
    render(<TickerCard {...BASE_PROPS} />);
    expect(screen.getByRole('button', { name: '1M' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('persists selected range to localStorage on click', async () => {
    render(<TickerCard {...BASE_PROPS} />);
    await userEvent.click(screen.getByRole('button', { name: '1Y' }));
    expect(localStorage.getItem('chart-range-^STOXX50E')).toBe('1Y');
  });
});
