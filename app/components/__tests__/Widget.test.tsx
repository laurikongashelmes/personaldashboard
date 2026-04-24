import { render, screen } from '@testing-library/react';
import Widget from '../Widget';

describe('Widget', () => {
  it('renders label and value', () => {
    render(<Widget label="EURO STOXX 50" value="5,142" />);
    expect(screen.getByText('EURO STOXX 50')).toBeInTheDocument();
    expect(screen.getByText('5,142')).toBeInTheDocument();
  });

  it('renders sub-value when provided', () => {
    render(<Widget label="Test" value="100" subValue="+0.8%" />);
    expect(screen.getByText('+0.8%')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading=true', () => {
    const { container } = render(<Widget label="Test" value="" loading />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error message when error is provided', () => {
    render(<Widget label="Test" value="" error="Failed to load" />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });
});
