import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import MetricCards from '../components/MetricCards';

describe('MetricCards', () => {
  it('renders metric cards with the expected KPI values', () => {
    render(<MetricCards totalOrders={128} incidents={22} failureRate={17.2} activeWarehouses={9} />);

    expect(screen.getByText('Total orders')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('Incidents flagged')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText('17.2%')).toBeInTheDocument();
    expect(screen.getByText('Active warehouses')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });
});
