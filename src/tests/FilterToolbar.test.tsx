import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FilterToolbar from '../components/FilterToolbar';

describe('FilterToolbar', () => {
  it('renders filter summary chips and triggers apply callback', () => {
    const handleFilterChange = vi.fn();
    const handleApply = vi.fn();

    render(
      <FilterToolbar
        cityOptions={['All', 'Bengaluru', 'Chennai']}
        clientOptions={['All', 'C1', 'C2']}
        warehouseOptions={['All', 'W1', 'W2']}
        clients={[
          { client_id: 'C1', client_name: 'Northwind Logistics' },
          { client_id: 'C2', client_name: 'BluePeak Retail' },
        ]}
        warehouses={[
          { warehouse_id: 'W1', warehouse_name: 'Whitefield Hub' },
          { warehouse_id: 'W2', warehouse_name: 'Mount Road Hub' },
        ]}
        filters={{ city: 'All', client: 'All', warehouse: 'All' }}
        appliedFilters={{ city: 'All', client: 'All', warehouse: 'All' }}
        onFilterChange={handleFilterChange}
        onApply={handleApply}
        isApplying={false}
      />,
    );

    expect(screen.getByText('Refine the delivery view')).toBeInTheDocument();
    expect(screen.getByText('City: All')).toBeInTheDocument();
    expect(screen.getByText('Client: All')).toBeInTheDocument();
    expect(screen.getByText('Warehouse: All')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /get/i }));
    expect(handleApply).toHaveBeenCalledTimes(1);
  });
});
