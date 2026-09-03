import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AnalyticsSectionCard from '../components/AnalyticsSectionCard';

describe('AnalyticsSectionCard', () => {
  it('toggles between graph and table views and shows the empty state in table mode', () => {
    render(
      <AnalyticsSectionCard
        title="Delay exposure"
        description="Regional visibility for on-time performance"
        graphContent={<div>Graph content</div>}
        tableContent={<div>Tabular data</div>}
        emptyMessage="No table data available"
      />,
    );

    expect(screen.getByText('Delay exposure')).toBeInTheDocument();
    expect(screen.getByText('Regional visibility for on-time performance')).toBeInTheDocument();
    expect(screen.getByText('Graph content')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tabular' }));

    expect(screen.getByText('No table data available')).toBeInTheDocument();
    expect(screen.queryByText('Graph content')).not.toBeInTheDocument();
  });
});
