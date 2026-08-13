import { Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import { SearchRounded } from '@mui/icons-material';
import type { AnalyticsFilterState } from '../types/logistics';
import { useMemo } from 'react';

type FilterToolbarProps = {
  cityOptions: string[];
  clientOptions: string[];
  warehouseOptions: string[];
  clients: Array<{ client_id: string; client_name: string }>;
  warehouses: Array<{ warehouse_id: string; warehouse_name: string }>;
  filters: AnalyticsFilterState;
  appliedFilters: AnalyticsFilterState;
  onFilterChange: (key: keyof AnalyticsFilterState, value: string) => void;
  onApply: () => void;
  isApplying: boolean;
};

const FilterToolbar = ({
  cityOptions,
  clientOptions,
  warehouseOptions,
  clients,
  warehouses,
  filters,
  onFilterChange,
  onApply,
  isApplying,
  appliedFilters
}: FilterToolbarProps) => {

const selectedClient = useMemo(() => {
    return clients.find((client) => client.client_id === appliedFilters.client);
  }, [appliedFilters.client, clients]);

  return (
    <Paper elevation={0} className="filter-shell">
      <Stack direction={{ xs: 'column', lg: 'column' }} spacing={2} alignItems={{ xs: 'stretch', lg: 'center' }} justifyContent="space-between">
        <Stack spacing={1}>
          <Typography variant="h6" className="section-title-filter">Refine the delivery view</Typography>
          <Typography variant="body2" className="section-caption">
            Choose the city, client, or warehouse lens you want to investigate, then apply the filter to refresh the analysis.
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} className="filter-controls">
          <FormControl size="medium" className="filter-field">
            <InputLabel>City</InputLabel>
            <Select fullWidth value={filters.city} label="City" onChange={(event) => onFilterChange('city', event.target.value as string)}>
              {cityOptions.map((city) => (
                <MenuItem key={city} value={city}>{city}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="medium" className="filter-field">
            <InputLabel>Client</InputLabel>
            <Select fullWidth value={filters.client} label="Client" onChange={(event) => onFilterChange('client', event.target.value as string)}>
              {clientOptions.map((client) => (
                <MenuItem key={client} value={client}>
                  {client === 'All' ? 'All clients' : clients.find((item) => item.client_id === client)?.client_name || client}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="medium" className="filter-field">
            <InputLabel>Warehouse</InputLabel>
            <Select fullWidth value={filters.warehouse} label="Warehouse" onChange={(event) => onFilterChange('warehouse', event.target.value as string)}>
              {warehouseOptions.map((warehouse) => (
                <MenuItem key={warehouse} value={warehouse}>
                  {warehouse === 'All' ? 'All warehouses' : warehouses.find((item) => item.warehouse_id === warehouse)?.warehouse_name || warehouse}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            onClick={onApply}
            startIcon={isApplying ? <SearchRounded /> : <SearchRounded />}
            disabled={isApplying}
            className="get-button"
          >
            {isApplying ? 'Loading…' : 'Get'}
          </Button>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`City: ${appliedFilters.city}`} size="small" color="primary" variant="outlined" />
            <Chip label={`Client: ${selectedClient?.client_name || 'All'}`} size="small" color="secondary" variant="outlined" />
            <Chip label={`Warehouse: ${appliedFilters.warehouse}`} size="small" color="success" variant="outlined" />
        </Stack>
      </Stack>
    </Paper>
  );
};

export default FilterToolbar;
