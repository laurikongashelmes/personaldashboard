import { render, screen } from '@testing-library/react';
import EnergySection from '../EnergySection';
import type { EnergyData } from '@/types';

const MOCK_DATA: EnergyData = {
  brent: { symbol: 'BZ=F', label: 'Brent Crude', price: 83.4, change: -0.3, changePercent: -0.36 },
  nordPool: { avgPrice: 82.0, minPrice: 41.0, minHour: '03:00' },
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

  it('renders Nord Pool average and minimum', () => {
    render(<EnergySection data={MOCK_DATA} loading={false} error={null} />);
    expect(screen.getByText(/82\.0/)).toBeInTheDocument();
    expect(screen.getByText(/41\.0/)).toBeInTheDocument();
    expect(screen.getByText(/03:00/)).toBeInTheDocument();
  });
});
