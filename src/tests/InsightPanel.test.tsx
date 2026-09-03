import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import InsightPanel from '../components/InsightPanel';

describe('InsightPanel', () => {
  it('renders insight narrative and recommendations', () => {
    render(
      <InsightPanel
        narrative="Bengaluru is the highest-risk corridor at 100% delay exposure."
        recommendations={[
          'Prioritize vehicle breakdown with proactive dispatch checks.',
          'Review the Whitefield Hub and similar flagged routes.',
        ]}
      />,
    );

    expect(screen.getByText('What the data says')).toBeInTheDocument();
    expect(screen.getByText('A sharper read on the delay story')).toBeInTheDocument();
    expect(screen.getByText(/Bengaluru is the highest-risk corridor/i)).toBeInTheDocument();
    expect(screen.getByText('Prioritize vehicle breakdown with proactive dispatch checks.')).toBeInTheDocument();
    expect(screen.getByText('Review the Whitefield Hub and similar flagged routes.')).toBeInTheDocument();
  });
});
