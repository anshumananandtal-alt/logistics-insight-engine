import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import type { AnalyticsFilterState, Client, Feedback, Order, Warehouse, WarehouseLog, WeatherFactor } from '../types/logistics';

/**
 * NOTE: these two types aren't in ../types/logistics yet (that file wasn't
 * available when this hook was rewritten). Move them there if you want a
 * single source of truth for shared types.
 */
export interface FleetLog {
  fleet_log_id: string;
  order_id: string;
  driver_id: string;
  vehicle_number: string;
  route_code: string;
  gps_delay_notes: string;
  departure_time: string;
  arrival_time: string;
  created_at: string;
}

export interface Driver {
  driver_id: string;
  driver_name: string;
  phone: string;
  license_number: string;
  partner_company: string;
  city: string;
  state: string;
  status: string;
  created_at: string;
}

type LoadedData = {
  orders: Order[];
  clients: Client[];
  warehouses: Warehouse[];
  warehouseLogs: WarehouseLog[];
  feedback: Feedback[];
  weather: WeatherFactor[];
  fleetLogs: FleetLog[];
  drivers: Driver[];
};

const dataFiles = [
  { file: 'orders.csv', key: 'orders' },
  { file: 'clients.csv', key: 'clients' },
  { file: 'warehouses.csv', key: 'warehouses' },
  { file: 'warehouse_logs.csv', key: 'warehouseLogs' },
  { file: 'feedback.csv', key: 'feedback' },
  { file: 'weather.csv', key: 'weather' },
  { file: 'fleet_logs.csv', key: 'fleetLogs' },
  { file: 'drivers.csv', key: 'drivers' },
] as const;

const initialFilters: AnalyticsFilterState = {
  city: 'All',
  client: 'All',
  warehouse: 'All',
};

const COLORS = [
  "#2563eb", // blue
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
];

const toTitle = (value?: string) => value?.trim() || 'Unknown';

/**
 * Parses the "YYYY-MM-DD HH:MM:SS" timestamps used across every CSV.
 * Returns null for empty/unparseable values instead of an Invalid Date,
 * so callers can safely treat "no timestamp" as "no signal" rather than
 * accidentally comparing against epoch-adjacent garbage.
 */
const parseTimestamp = (value?: string): Date | null => {
  if (!value || !value.trim()) return null;
  const iso = value.trim().replace(' ', 'T');
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * An order counts as "failed/late" if it was explicitly Failed or Returned,
 * OR if it was Delivered after its promised_delivery_date. Pending /
 * In-Transit orders are excluded (no outcome yet) unless/until they resolve.
 * This mirrors analysis_report.md's headline total exactly (Failed +
 * Returned + late-delivered = 5,207 across the full unfiltered dataset).
 */
const isFailedOrLate = (order: Order): boolean => {
  if (order.status === 'Failed' || order.status === 'Returned') return true;
  if (order.status === 'Delivered') {
    const promised = parseTimestamp(order.promised_delivery_date);
    const actual = parseTimestamp(order.actual_delivery_date);
    if (promised && actual && actual > promised) return true;
  }
  return false;
};

/**
 * Builds the "Weather: X; Traffic: Heavy; Event: Y" style label used in
 * analysis_report.md. Clear weather and non-Heavy traffic are treated as
 * "no signal" (they're the majority/baseline values in weather.csv), so
 * only the conditions actually worth flagging make it into the label.
 */
const buildWeatherLabel = (entry?: WeatherFactor): string | null => {
  if (!entry) return null;
  const parts: string[] = [];

  const weatherCondition = entry.weather_condition?.trim();
  if (weatherCondition && weatherCondition.toLowerCase() !== 'clear') {
    parts.push(`Weather: ${weatherCondition}`);
  }

  const trafficCondition = entry.traffic_condition?.trim();
  if (trafficCondition && trafficCondition.toLowerCase() === 'heavy') {
    parts.push(`Traffic: ${trafficCondition}`);
  }

  const eventType = entry.event_type?.trim();
  if (eventType) {
    parts.push(`Event: ${eventType}`);
  }

  return parts.length ? parts.join('; ') : null;
};

/**
 * Consolidates every available signal for an order into a single reason,
 * matching the taxonomy in analysis_report.md's "Top Failure Reasons" table:
 *   1. Status: <failure_reason>   - the order's own recorded reason (Failed orders only)
 *   2. Fleet: <gps_delay_notes>   - a flagged fleet/driver issue on the delivery leg
 *   3. Weather/Traffic/Event combo - environmental context at time of delivery
 *   4. Unknown Operational Delay  - no usable signal in any source
 *
 * Exact per-category counts depend on the priority order chosen here; see
 * the note in the chat response about why this can't be guaranteed to match
 * analysis_report.md exactly without the original generation script.
 */
const consolidateReason = (
  order: Order,
  fleetNotes: string | undefined,
  weatherEntry: WeatherFactor | undefined,
): string => {
  const statusReason = order.failure_reason?.trim();
  if (statusReason) {
    return `Status: ${statusReason}`;
  }

  if (fleetNotes && fleetNotes.trim()) {
    return `Fleet: ${fleetNotes.trim()}`;
  }

  const weatherLabel = buildWeatherLabel(weatherEntry);
  if (weatherLabel) {
    return weatherLabel;
  }

  return 'Unknown Operational Delay';
};

export const useLogisticsAnalytics = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseLogs, setWarehouseLogs] = useState<WarehouseLog[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [weather, setWeather] = useState<WeatherFactor[]>([]);
  const [fleetLogs, setFleetLogs] = useState<FleetLog[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilterState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<AnalyticsFilterState>(initialFilters);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const responses = await Promise.all(
          dataFiles.map(({ file }) => fetch(`/assets/data/${file}`).then((response) => {
            if (!response.ok) {
              throw new Error(`Unable to load ${file}`);
            }
            return response.text();
          })),
        );

        const parsed = dataFiles.reduce<Record<string, unknown[]>>((acc, { key }, index) => {
          const parsedRows = Papa.parse(responses[index], {
            header: true,
            skipEmptyLines: true,
          }).data as unknown[];
          acc[key] = parsedRows;
          return acc;
        }, {});

        setOrders(parsed.orders as Order[]);
        setClients(parsed.clients as Client[]);
        setWarehouses(parsed.warehouses as Warehouse[]);
        setWarehouseLogs(parsed.warehouseLogs as WarehouseLog[]);
        setFeedback(parsed.feedback as Feedback[]);
        setWeather(parsed.weather as WeatherFactor[]);
        setFleetLogs(parsed.fleetLogs as FleetLog[]);
        setDrivers(parsed.drivers as Driver[]);
      } catch (err) {
        console.error(err);
        setError('The logistics sample data could not be loaded. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Always holds the latest `filters`, so the debounced apply below never
  // fires against a stale closure regardless of render/batching timing.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const handleFilterChange = useCallback((key: keyof AnalyticsFilterState, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setIsApplyingFilters(true);
    timeoutRef.current = window.setTimeout(() => {
      // Read from the ref, not the closed-over `filters`, so this always
      // applies whatever the user most recently selected.
      setAppliedFilters(filtersRef.current);
      setIsApplyingFilters(false);
      timeoutRef.current = null;
    }, 700);
  }, []);

  // --- Lookup maps built once per data load, reused by every derived metric ---

  const warehouseByOrderId = useMemo(() => {
    const map = new Map<string, string>();
    warehouseLogs.forEach((entry) => map.set(entry.order_id, entry.warehouse_id));
    return map;
  }, [warehouseLogs]);

  const warehouseLogByOrderId = useMemo(() => {
    const map = new Map<string, WarehouseLog>();
    warehouseLogs.forEach((entry) => map.set(entry.order_id, entry));
    return map;
  }, [warehouseLogs]);

  const fleetLogByOrderId = useMemo(() => {
    const map = new Map<string, FleetLog>();
    fleetLogs.forEach((entry) => map.set(entry.order_id, entry));
    return map;
  }, [fleetLogs]);

  const weatherByOrderId = useMemo(() => {
    const map = new Map<string, WeatherFactor>();
    weather.forEach((entry) => map.set(entry.order_id, entry));
    return map;
  }, [weather]);

  const driverById = useMemo(() => {
    const map = new Map<string, Driver>();
    drivers.forEach((driver) => map.set(driver.driver_id, driver));
    return map;
  }, [drivers]);

  const warehouseById = useMemo(() => {
    const map = new Map<string, Warehouse>();
    warehouses.forEach((wh) => map.set(wh.warehouse_id, wh));
    return map;
  }, [warehouses]);

  // --- Filtering: city/client/warehouse filters apply consistently to every metric below ---

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const cityMatch = appliedFilters.city === 'All' || order.city === appliedFilters.city;
      const clientMatch = appliedFilters.client === 'All' || order.client_id === appliedFilters.client;
      const warehouseMatch = appliedFilters.warehouse === 'All'
        || warehouseByOrderId.get(order.order_id) === appliedFilters.warehouse;
      return cityMatch && clientMatch && warehouseMatch;
    });
  }, [orders, appliedFilters, warehouseByOrderId]);

  // Orders that are Failed, Returned, or Delivered-but-late (matches
  // analysis_report.md's "Total Failed/Late" definition).
  const failureOrders = useMemo(() => {
    return filteredOrders.filter(isFailedOrLate);
  }, [filteredOrders]);

  const summaryStats = useMemo(() => ({
    totalOrders: filteredOrders.length,
    totalFailedLate: failureOrders.length,
  }), [filteredOrders, failureOrders]);

  const cityInsights = useMemo(() => {
    const cityMap = new Map<string, Order[]>();
    filteredOrders.forEach((order) => {
      const items = cityMap.get(order.city) || [];
      items.push(order);
      cityMap.set(order.city, items);
    });

    return Array.from(cityMap.entries())
      .map(([city, cityOrders]) => {
        const failures = cityOrders.filter(isFailedOrLate).length;
        return {
          city,
          total: cityOrders.length,
          failures,
          rate: cityOrders.length ? Math.round((failures / cityOrders.length) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 6);
  }, [filteredOrders]);

  // The consolidated reason per failed/late order, joining orders + fleet_logs + weather.
  const topReasons = useMemo(() => {
    const countMap = new Map<string, number>();
    failureOrders.forEach((order) => {
      const fleetEntry = fleetLogByOrderId.get(order.order_id);
      const weatherEntry = weatherByOrderId.get(order.order_id);
      const reason = consolidateReason(order, fleetEntry?.gps_delay_notes, weatherEntry);
      countMap.set(reason, (countMap.get(reason) || 0) + 1);
    });

    return Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [failureOrders, fleetLogByOrderId, weatherByOrderId]);

  const warehouseInsights = useMemo(() => {
    const warehouseMap = new Map<string, { warehouseName: string; count: number; issues: string[] }>();

    failureOrders.forEach((order) => {
      const entry = warehouseLogByOrderId.get(order.order_id);
      if (!entry) {
        return;
      }

      const warehouse = warehouseById.get(entry.warehouse_id);
      const current = warehouseMap.get(entry.warehouse_id) || {
        warehouseName: warehouse?.warehouse_name || 'Unknown warehouse',
        count: 0,
        issues: [],
      };

      current.count += 1;
      if (entry.notes) {
        current.issues.push(entry.notes);
      }
      warehouseMap.set(entry.warehouse_id, current);
    });

    return Array.from(warehouseMap.entries())
      .map(([warehouseId, item]) => ({
        warehouseId,
        warehouseName: item.warehouseName,
        count: item.count,
        issues: item.issues,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [failureOrders, warehouseLogByOrderId, warehouseById]);

  // Top drivers/partners implicated in fleet-flagged failures (from fleet_logs + drivers).
  const driverInsights = useMemo(() => {
    const driverMap = new Map<string, { driverName: string; partnerCompany: string; count: number; notes: string[] }>();

    failureOrders.forEach((order) => {
      const fleetEntry = fleetLogByOrderId.get(order.order_id);
      if (!fleetEntry || !fleetEntry.gps_delay_notes?.trim()) {
        return;
      }

      const driver = driverById.get(fleetEntry.driver_id);
      const current = driverMap.get(fleetEntry.driver_id) || {
        driverName: driver?.driver_name || 'Unknown driver',
        partnerCompany: driver?.partner_company || 'Unknown partner',
        count: 0,
        notes: [],
      };

      current.count += 1;
      current.notes.push(fleetEntry.gps_delay_notes);
      driverMap.set(fleetEntry.driver_id, current);
    });

    return Array.from(driverMap.entries())
      .map(([driverId, item]) => ({ driverId, ...item }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [failureOrders, fleetLogByOrderId, driverById]);

  const feedbackSummary = useMemo(() => {
    // Order IDs after applying city/client/warehouse filters
    const filteredOrderIds = new Set(
      filteredOrders.map((order) => order.order_id)
    );

    const counts = feedback.reduce<Record<string, number>>((acc, item) => {
      if (!filteredOrderIds.has(item.order_id)) {
        return acc;
      }

      acc[item.sentiment] = (acc[item.sentiment] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count], index) => ({
        label,
        count,
        fill: COLORS[index % COLORS.length],
      }));
  }, [feedback, filteredOrders]);

  const weatherSummary = useMemo(() => {
    const filteredOrderIds = new Set(filteredOrders.map((order) => order.order_id));

    const counts = weather.reduce<Record<string, number>>((acc, item) => {
      if (!filteredOrderIds.has(item.order_id)) {
        return acc;
      }
      const key = [item.weather_condition, item.traffic_condition, item.event_type].filter(Boolean).join(' / ');
      acc[key || 'No context'] = (acc[key || 'No context'] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [weather, filteredOrders]);

  // Below this many failed/late orders in the current filter slice, calling
  // anything "dominant" is misleading noise (a 1-vs-1 tie, for example).
  const MIN_SAMPLE_FOR_CLAIMS = 5;

  const narrative = useMemo(() => {
    if (failureOrders.length < MIN_SAMPLE_FOR_CLAIMS) {
      return failureOrders.length === 0
        ? 'No failed or late orders match the current filters — try widening the city, client, or warehouse selection.'
        : `Only ${failureOrders.length} failed/late order${failureOrders.length === 1 ? '' : 's'} match the current filters — too few to call out a dominant trigger with confidence. Widen the filters for a more reliable read.`;
    }

    const topReason = topReasons[0];
    const hotCity = cityInsights[0];
    const warehouse = warehouseInsights[0];
    const weatherContext = weatherSummary[0] ? `${weatherSummary[0].label} is the clearest environmental signal.` : 'Weather and traffic patterns remain mixed.';
    const lead = hotCity ? `${hotCity.city} is the highest-risk corridor at ${hotCity.rate}% delay exposure.` : 'The network is operating with broad but manageable pressure.';

    return `${lead} ${topReason ? `${topReason.name} is the dominant trigger with ${topReason.count} visible incidents.` : 'The main trigger is still emerging.'} ${warehouse ? `Warehouse ${warehouse.warehouseName} is carrying the loudest bottleneck.` : 'Warehouse queues look stable.'} ${weatherContext}`;
  }, [failureOrders.length, cityInsights, topReasons, warehouseInsights, weatherSummary]);

  const recommendations = useMemo(() => {
    const list: string[] = [];
    if (topReasons[0]) {
      list.push(`Prioritize ${topReasons[0].name.toLowerCase()} with proactive dispatch checks and customer notifications.`);
    }
    if (warehouseInsights[0]) {
      list.push(`Rebalance staffing around ${warehouseInsights[0].warehouseName} and tighten pick/pack SLAs.`);
    }
    if (cityInsights[0]) {
      list.push(`Create a city-specific recovery playbook for ${cityInsights[0].city} during peak windows.`);
    }
    if (driverInsights[0]) {
      list.push(`Review ${driverInsights[0].driverName} (${driverInsights[0].partnerCompany}) and similar flagged routes for recurring fleet issues.`);
    }
    return list.slice(0, 3);
  }, [cityInsights, topReasons, warehouseInsights, driverInsights]);

  const cityOptions = useMemo(() => ['All', ...Array.from(new Set(orders.map((order) => order.city)))], [orders]);
  const clientOptions = useMemo(() => ['All', ...Array.from(new Set(orders.map((order) => order.client_id)))], [orders]);
  const warehouseOptions = useMemo(() => ['All', ...Array.from(new Set(warehouseLogs.map((entry) => entry.warehouse_id)))], [warehouseLogs]);

  return {
    orders,
    clients,
    warehouses,
    warehouseLogs,
    feedback,
    weather,
    fleetLogs,
    drivers,
    loading,
    error,
    filters,
    appliedFilters,
    isApplyingFilters,
    failureOrders,
    filteredOrders,
    summaryStats,
    cityInsights,
    topReasons,
    warehouseInsights,
    driverInsights,
    feedbackSummary,
    weatherSummary,
    narrative,
    recommendations,
    cityOptions,
    clientOptions,
    warehouseOptions,
    handleFilterChange,
    applyFilters,
  };
};
