import { Card, Stack, Typography } from '@mui/material';

type MetricCardsProps = {
  totalOrders: number;
  incidents: number;
  failureRate: number;
  activeWarehouses: number;
};

const MetricCards = ({ totalOrders, incidents, failureRate, activeWarehouses }: MetricCardsProps) => {
  const items = [
    { label: 'Total orders', value: totalOrders.toLocaleString() },
    { label: 'Incidents flagged', value: incidents.toLocaleString() },
    { label: 'Failure rate', value: `${failureRate}%` },
    { label: 'Active warehouses', value: activeWarehouses.toString() },
  ];

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}className="metric-grid">
      {items.map((item) => (
        <Card key={item.label} className="metric-card" elevation={0}>
          <Typography variant="subtitle2" color="text.secondary">{item.label}</Typography>
          <Typography variant="h4" className="metric-value">{item.value}</Typography>
        </Card>
      ))}
    </Stack>
  );
};

export default MetricCards;
