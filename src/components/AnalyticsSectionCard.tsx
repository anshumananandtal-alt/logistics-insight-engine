import { Box, Card, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';
import type { ViewMode } from '../types/logistics';

type AnalyticsSectionCardProps = {
  title: string;
  description: string;
  graphContent: ReactNode;
  tableContent: ReactNode;
  emptyMessage?: string;
};

const AnalyticsSectionCard = ({ title, description, graphContent, tableContent, emptyMessage }: AnalyticsSectionCardProps) => {
  const [view, setView] = useState<ViewMode>('graph');

  return (
    <Card className="panel-card" elevation={0}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} className="section-heading">
        <Box>
          <Typography variant="h6" className="section-title">{title}</Typography>
          <Typography variant="body2" className="section-caption">{description}</Typography>
        </Box>
        <ToggleButtonGroup value={view} exclusive onChange={(_, next) => next && setView(next)} size="small" color="primary">
          <ToggleButton value="graph">Graphical</ToggleButton>
          <ToggleButton value="table">Tabular</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      {view === 'graph' ? (
        <Box className="chart-shell">{graphContent}</Box>
      ) : (
        <Box className="table-shell">{emptyMessage ? <Typography color="text.secondary">{emptyMessage}</Typography> : tableContent}</Box>
      )}
    </Card>
  );
};

export default AnalyticsSectionCard;
