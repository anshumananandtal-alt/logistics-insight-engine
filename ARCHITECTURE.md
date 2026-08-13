# Architecture

## Overview

Logistics Insight Engine is a client-side, single-page React + TypeScript app (built with Vite, styled with MUI) that turns a set of static CSV exports into an interactive delivery-failure analytics dashboard. There is no backend: all loading, joining, filtering, and aggregation happens in the browser, in one central hook.

## Core design principle: one hook owns all data logic

`src/hooks/useLogisticsAnalytics.ts` is the single source of truth for:

- **Loading** — fetches all eight CSVs from `public/assets/data/` and parses them with `papaparse`.
- **Joining** — correlates records across files by shared keys (`order_id`, `warehouse_id`, `driver_id`), built once as `Map`-based lookup tables (`warehouseByOrderId`, `warehouseLogByOrderId`, `fleetLogByOrderId`, `weatherByOrderId`, `driverById`, `warehouseById`) so repeated lookups are O(1) instead of repeated `Array.find`/`Array.some` scans.
- **Classifying** — every failed/late order is reduced to a single, human-readable root cause via `consolidateReason()`, which checks signals in priority order:
  1. `orders.failure_reason` (the order's own recorded reason — Failed orders only) → `"Status: <reason>"`
  2. `fleet_logs.gps_delay_notes` → `"Fleet: <notes>"`
  3. Weather/traffic/event context (non-Clear weather, Heavy traffic, or a named event) → e.g. `"Weather: Rain; Event: Festival"`
  4. Otherwise → `"Unknown Operational Delay"`
- **Filtering** — a two-stage filter model: `filters` (the in-progress selection bound to the toolbar's dropdowns) vs. `appliedFilters` (the committed selection everything actually renders from). Clicking "Get" debounces the commit by 700ms via `applyFilters()`.
- **Aggregating** — derives every view model the UI needs (`cityInsights`, `topReasons`, `warehouseInsights`, `driverInsights`, `feedbackSummary`, `weatherSummary`, `narrative`, `recommendations`) from the filtered, classified data, each memoized with `useMemo`.

Components never touch a CSV, never join data themselves, and never compute a metric — they only render whatever the hook hands them. This keeps the presentational layer trivial to test and re-skin, and keeps all business rules in one auditable place.

## What counts as "failed/late"

An order is included in failure analysis if:
- `status === 'Failed'`, or
- `status === 'Returned'`, or
- `status === 'Delivered'` **and** `actual_delivery_date` is after `promised_delivery_date`.

`Pending` and `In-Transit` orders are excluded — they have no resolved outcome yet.

## Filter propagation

`appliedFilters` (city / client / warehouse) is the single gate all derived data passes through:

```
orders ──filter(appliedFilters)──► filteredOrders ──filter(isFailedOrLate)──► failureOrders
                                         │                                          │
                                         ├─► cityInsights                          ├─► topReasons (joined w/ fleet_logs, weather)
                                         ├─► feedbackSummary (joined w/ feedback)  ├─► warehouseInsights (joined w/ warehouse_logs)
                                         └─► weatherSummary (joined w/ weather)    └─► driverInsights (joined w/ fleet_logs, drivers)
```

Every metric is derived from the same `filteredOrders`/`failureOrders` base, so a filter change updates the entire dashboard consistently — no metric silently reads unfiltered data.

## State management

No external state library — everything is local React state inside the hook, exposed to `App.tsx` as a single object:

- `filters` / `appliedFilters` — draft vs. committed filter selections.
- `isApplyingFilters` — drives the toolbar's loading state during the debounce window.
- `filtersRef` — mirrors `filters` so the debounced `applyFilters` timeout always commits the latest selection rather than a value captured by a stale closure.
- Raw datasets (`orders`, `clients`, `warehouses`, `warehouseLogs`, `feedback`, `weather`, `fleetLogs`, `drivers`) and every derived aggregate are returned as-is for components to consume directly.

## Narrative generation

`narrative` and `recommendations` are template-based summaries built from the top entries of `cityInsights`, `topReasons`, `warehouseInsights`, and `driverInsights`. To avoid overstating a pattern from a handful of matching orders, `narrative` applies a minimum-sample guard (`MIN_SAMPLE_FOR_CLAIMS`): below that many failed/late orders in the current filter slice, it reports that the sample is too small to call out a dominant trigger rather than asserting one.

## Presentation layer

- **`AnalyticsSectionCard`** — a generic card shell with a Graphical/Tabular `ToggleButtonGroup`; each analytics section (delay reasons, city hotspots, warehouse friction, customer sentiment) reuses it with different chart/table content passed as props.
- **`FilterToolbar`** — controlled selects bound to `filters`, with an explicit "Get" button that calls `applyFilters()`; also renders `appliedFilters` as chips so users can see what's actually driving the current view versus what's staged.
- **`MetricCards`** — renders top-line counts (`totalOrders`, `incidents`, `failureRate`, `activeWarehouses`) computed in `App.tsx` from the hook's `filteredOrders`/`failureOrders`.
- **`InsightPanel`** — renders `narrative` as prose and `recommendations` as a stack of chips.
- Charts use `recharts` (`BarChart`, `PieChart`); tables use MUI's `Table` primitives — both fed by the same underlying arrays, just two views of one dataset.

## Notable engineering choices

- **Lookup maps over repeated scans** — the original implementation used `Array.find`/`Array.some` per order per render; the current hook builds `Map`s once per dataset load and reuses them across every derived metric.
- **Debounced apply with ref-backed freshness** — filter changes don't refetch or re-render expensive charts on every keystroke; they only commit after "Get" is clicked (plus a 700ms debounce), and the debounce reads from a ref to guarantee it never applies a stale filter state.
- **Type gaps** — `FleetLog` and `Driver` are currently defined locally inside `useLogisticsAnalytics.ts` rather than in `src/types/logistics.ts`. They should be moved there for a single source of truth once confirmed.
