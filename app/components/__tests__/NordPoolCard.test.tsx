import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NordPoolCard from '../NordPoolCard';

jest.mock('@/lib/useNordPoolChartData');
import { useNordPoolChartData } from '@/lib/useNordPoolChartData';
const mockUseNordPoolChartData = useNordPoolChartData as jest.Mock;

jest.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  // Call label at index 15 (matches MOCK_CURRENT_DATA.currentHourIndex) to surface "now" in DOM
  Bar: ({ children, label }: { children?: React.ReactNode; label?: (props: Record<string, unknown>) => React.ReactNode }) => (
    <div>
      {typeof label === 'function' && label({ x: 0, y: 0, width: 10, index: 15 })}
      {children}
    </div>
  ),
  Cell: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
}));

const MOCK_CURRENT_DATA = {
  points: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date('2024-04-24T21:00:00.000Z').getTime() + i * 3600 * 1000,
    price: 80 + i,
  })),
  hasTomorrow: false,
  currentHourIndex: 15,
  currentHourPrice: 95,
  todayAvgPrice: 91.5,
};

const MOCK_HISTORY_DATA = {
  points: [
    { timestamp: 1714046400000, price: 88.3 },
    { timestamp: 1714132800000, price: 92.1 },
  ],
};

describe('NordPoolCard', () => {
  beforeEach(() => {
    mockUseNordPoolChartData.mockReturnValue({ data: null, loading: false, error: null });
    localStorage.clear();
  });

  it('renders the label "Nord Pool EE"', () => {
    render(<NordPoolCard />);
    expect(screen.getByText('Nord Pool EE')).toBeInTheDocument();
  });

  it('shows skeleton while loading', () => {
    mockUseNordPoolChartData.mockReturnValue({ data: null, loading: true, error: null });
    const { container } = render(<NordPoolCard />);
    expect(container.querySelector('[data-testid="nordpool-chart-skeleton"]')).toBeInTheDocument();
  });

  it('shows error message when hook returns error', () => {
    mockUseNordPoolChartData.mockReturnValue({ data: null, loading: false, error: 'Andmed pole saadaval' });
    render(<NordPoolCard />);
    expect(screen.getByText('Andmed pole saadaval')).toBeInTheDocument();
  });

  it('renders all four range buttons', () => {
    render(<NordPoolCard />);
    expect(screen.getByRole('button', { name: 'CURRENT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7D' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1M' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1Y' })).toBeInTheDocument();
  });

  it('CURRENT is active by default', () => {
    render(<NordPoolCard />);
    expect(screen.getByRole('button', { name: 'CURRENT' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows current hour price and avg for CURRENT data', () => {
    mockUseNordPoolChartData.mockReturnValue({ data: MOCK_CURRENT_DATA, loading: false, error: null });
    render(<NordPoolCard />);
    expect(screen.getByText(/95\.0 €\/MWh/)).toBeInTheDocument();
    expect(screen.getByText(/avg 91\.5 €\/MWh/)).toBeInTheDocument();
  });

  it('renders "now" label over the current hour bar', () => {
    mockUseNordPoolChartData.mockReturnValue({ data: MOCK_CURRENT_DATA, loading: false, error: null });
    render(<NordPoolCard />);
    expect(screen.getByText('now')).toBeInTheDocument();
  });

  it('shows last point price for history data', async () => {
    mockUseNordPoolChartData.mockReturnValue({ data: MOCK_HISTORY_DATA, loading: false, error: null });
    localStorage.setItem('chart-range-nordpool-ee', '7D');
    render(<NordPoolCard />);
    await waitFor(() => expect(screen.getByText(/7D kesk\./)).toBeInTheDocument());
    expect(screen.getByText(/92\.1 €\/MWh/)).toBeInTheDocument();
  });

  it('switches active range when a button is clicked', async () => {
    render(<NordPoolCard />);
    await userEvent.click(screen.getByRole('button', { name: '7D' }));
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'CURRENT' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('persists selected range to localStorage on click', async () => {
    render(<NordPoolCard />);
    await userEvent.click(screen.getByRole('button', { name: '1M' }));
    expect(localStorage.getItem('chart-range-nordpool-ee')).toBe('1M');
  });

  it('initialises to stored range from localStorage', async () => {
    localStorage.setItem('chart-range-nordpool-ee', '1Y');
    render(<NordPoolCard />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '1Y' })).toHaveAttribute('aria-pressed', 'true'),
    );
  });
});
