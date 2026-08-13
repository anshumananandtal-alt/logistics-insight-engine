import { Alert, Box, Chip, CircularProgress, Container, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AnalyticsSectionCard from './components/AnalyticsSectionCard';
import FilterToolbar from './components/FilterToolbar';
import InsightPanel from './components/InsightPanel';
import MetricCards from './components/MetricCards';
import { useLogisticsAnalytics } from './hooks/useLogisticsAnalytics';
import './App.css';

const App = () => {
  const {
    loading,
    error,
    filters,
    isApplyingFilters,
    failureOrders,
    filteredOrders,
    cityInsights,
    topReasons,
    warehouseInsights,
    feedbackSummary,
    narrative,
    recommendations,
    cityOptions,
    clientOptions,
    warehouseOptions,
    clients,
    warehouses,
    handleFilterChange,
    applyFilters,
    appliedFilters
  } = useLogisticsAnalytics();

  const failureRate = filteredOrders.length ? Math.round((failureOrders.length / filteredOrders.length) * 1000) / 10 : 0;

  if (loading) {
    return (
      <div className="loading-shell">
        <Paper elevation={3} className="loading-card">
          <Stack spacing={2} alignItems="center">
            <CircularProgress size={48} />
            <Typography variant="h5">Loading the logistics intelligence view</Typography>
            <Typography color="text.secondary">We are preparing the analytics from your sample CSV files.</Typography>
          </Stack>
        </Paper>
      </div>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" className="error-shell">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <div className="app-shell">
      <Container maxWidth="xl" className="app-container">
        <Paper elevation={0} className="hero-card">
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }}>
            <Box className="hero-content">
              <Typography variant="overline" className="hero-eyebrow">Delivery analytics studio</Typography>
              <Typography variant="h3" className="hero-title">Turn delayed shipments into a clear, explainable story.</Typography>
              <Typography variant="body1" className="hero-copy">
                Explore city risk, warehouse friction, and customer sentiment with a more intuitive view of what is causing delivery friction.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <FilterToolbar
          cityOptions={cityOptions}
          clientOptions={clientOptions}
          warehouseOptions={warehouseOptions}
          clients={clients}
          warehouses={warehouses}
          filters={filters}
          onFilterChange={handleFilterChange}
          onApply={applyFilters}
          appliedFilters={appliedFilters}
          isApplying={isApplyingFilters}
        />

        <MetricCards totalOrders={filteredOrders.length} incidents={failureOrders.length} failureRate={failureRate} activeWarehouses={warehouses.length} />

        <InsightPanel narrative={narrative} recommendations={recommendations} />

        <Stack spacing={2.5} className="dashboard-stack">
          <AnalyticsSectionCard
            title="Delay reason breakdown"
            description="The strongest operational triggers behind the selected slice of orders."
            graphContent={
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topReasons}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            }
            tableContent={
              <TableContainer component={Paper} elevation={0} className="table-surface">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Reason</TableCell>
                      <TableCell align="right">Incidents</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topReasons.map((item) => (
                      <TableRow key={item.name} hover>
                        <TableCell>{item.name}</TableCell>
                        <TableCell align="right">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            }
            emptyMessage= { topReasons?.length ? "" : "No operational delays surfaced in this selection."}
          />

          <AnalyticsSectionCard
            title="City disruption hotspots"
            description="The cities with the most concentrated delivery exposure."
            graphContent={
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cityInsights}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="city" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="failures" radius={[8, 8, 0, 0]} fill="#9333ea" />
                </BarChart>
              </ResponsiveContainer>
            }
            tableContent={
              <TableContainer component={Paper} elevation={0} className="table-surface">
                <Table size="small">
                  <TableHead className="table-head">
                    <TableRow>
                      <TableCell>City</TableCell>
                      <TableCell align="right">Failure rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cityInsights.map((item) => (
                      <TableRow key={item.city} hover>
                        <TableCell>{item.city}</TableCell>
                        <TableCell align="right">{item.rate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            }
            emptyMessage={ cityInsights?.length ? "" : "No city-level delay clusters observed."}
          />

          <AnalyticsSectionCard
            title="Warehouse friction"
            description="The warehouses that are most tied to visible incidents."
            graphContent={
              <Stack spacing={1.5}>
                {warehouseInsights.length ? warehouseInsights.map((item) => (
                  <Box key={item.warehouseId} className="insight-row">
                    <Typography variant="body1" fontWeight={600}>{item.warehouseName}</Typography>
                    <Chip label={`${item.count} incidents`} color="warning" />
                  </Box>
                )) : <Typography color="text.secondary">No warehouse-linked issues were detected in this slice.</Typography>}
              </Stack>
            }
            tableContent={
              <TableContainer component={Paper} elevation={0} className="table-surface">
                <Table size="small">
                  <TableHead className="table-head">
                    <TableRow>
                      <TableCell>Warehouse</TableCell>
                      <TableCell align="right">Incidents</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {warehouseInsights.map((item) => (
                      <TableRow key={item.warehouseId} hover>
                        <TableCell>{item.warehouseName}</TableCell>
                        <TableCell align="right">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            }
            emptyMessage= { warehouseInsights.length? "" : "No warehouse issues surfaced."}
          />
          <AnalyticsSectionCard
            title="Customer sentiment"
            description="The emotional tone of customer feedback connected to the current view."
            graphContent={
              <Stack spacing={2} alignItems="center">
                <div className="chart-shell small-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart width={300} height={300}>
                        <Pie
                          data={feedbackSummary}
                          dataKey="count"
                          nameKey="label"
                          innerRadius={48}
                          outerRadius={88}
                          paddingAngle={3}
                        />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                </div>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {feedbackSummary.map((item) => (
                    <Chip key={item.label} label={`${item.label}: ${item.count}`} variant="outlined" />
                  ))}
                </Stack>
              </Stack>
            }
            tableContent={
              <TableContainer component={Paper} elevation={0} className="table-surface">
                <Table size="small">
                  <TableHead className="table-head">
                    <TableRow>
                      <TableCell>Sentiment</TableCell>
                      <TableCell align="right">Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {feedbackSummary.map((item) => (
                      <TableRow key={item.label} hover>
                        <TableCell>{item.label}</TableCell>
                        <TableCell align="right">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            }
            emptyMessage= {feedbackSummary?.length  ? "" : "No sentiment feedback is available yet."}
          />
        </Stack>
      </Container>
    </div>
  );
};

export default App;