# Project Structure

```
logistics-insight-engine/
├── public/
│   └── assets/
│       └── data/
│           ├── clients.csv          # Client directory (client_id, client_name, ...)
│           ├── drivers.csv          # Driver/partner directory (driver_id, driver_name, partner_company, ...)
│           ├── feedback.csv         # Post-delivery customer feedback (order_id, sentiment, ...)
│           ├── fleet_logs.csv       # Per-order fleet/GPS delay notes (order_id, driver_id, gps_delay_notes, ...)
│           ├── orders.csv           # Core order records (order_id, status, city, client_id, failure_reason, dates, ...)
│           ├── warehouse_logs.csv   # Per-order warehouse handling notes (order_id, warehouse_id, notes, ...)
│           ├── warehouses.csv       # Warehouse directory (warehouse_id, warehouse_name, ...)
│           └── weather.csv          # Per-order weather/traffic/event context (order_id, weather_condition, traffic_condition, event_type, ...)
│
├── src/
│   ├── assets/                      # Static assets used by the UI
│   │
│   ├── components/
│   │   ├── AnalyticsSectionCard.tsx # Reusable card shell with Graphical/Tabular toggle
│   │   ├── FilterToolbar.tsx        # City / client / warehouse filter controls + "Get" apply button
│   │   ├── InsightPanel.tsx         # Renders the narrative summary + recommendation chips
│   │   └── MetricCards.tsx          # Top-line stat cards (total orders, incidents, failure rate, warehouses)
│   │
│   ├── hooks/
│   │   └── useLogisticsAnalytics.ts # Loads all CSVs, joins them, and derives every metric the UI consumes
│   │
│   ├── types/
│   │   ├── logistics.ts             # Shared domain types (Order, Client, Warehouse, WarehouseLog, Feedback, WeatherFactor, AnalyticsFilterState, ViewMode, ...)
│   │   └── papaparse.d.ts           # Type declarations for the papaparse CSV parser
│   │
│   ├── App.css                      # Global/app-level styles
│   ├── App.tsx                      # Top-level page: wires the hook's output into the dashboard layout
│   ├── index.css                    # Base/reset styles
│   ├── main.tsx                     # React app entry point (ReactDOM root render)
│   └── theme.ts                     # MUI theme configuration
│
├── .gitignore
├── eslint.config.js                 # ESLint configuration
├── index.html                       # Vite HTML entry point
├── package.json / package-lock.json # Dependencies and scripts
├── README.md
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
└── vite.config.ts                   # Vite build/dev-server configuration
```

## Layer responsibilities

| Layer | Location | Responsibility |
|---|---|---|
| **Data** | `public/assets/data/*.csv` | Raw, static sample data served like any public asset and fetched at runtime. |
| **Data access & derivation** | `src/hooks/useLogisticsAnalytics.ts` | Single hook that fetches, parses, joins, filters, and aggregates all CSVs into ready-to-render view models. This is the only place business logic (failure classification, joins, filtering) lives. |
| **Types** | `src/types/logistics.ts` | Shape contracts for every CSV-backed entity and shared UI state (filters, view mode), consumed by both the hook and the components. |
| **Presentation** | `src/components/*.tsx` | Purely presentational — each component receives already-derived data as props and renders it; none of them fetch or transform data themselves. |
| **Composition** | `src/App.tsx` | Calls `useLogisticsAnalytics()` once and threads its output down to the filter toolbar, metric cards, insight panel, and analytics section cards. |

## Data flow (high level)

```
CSV files (public/assets/data)
        │  fetch + Papa.parse
        ▼
useLogisticsAnalytics()  ──────────────►  filters / appliedFilters (user-controlled)
        │
        │  join by order_id / warehouse_id / driver_id
        │  classify each failed/late order's root cause
        │  aggregate by city / warehouse / driver / reason / sentiment / weather
        ▼
App.tsx
        │
        ├─► FilterToolbar        (filters, appliedFilters, options, onApply)
        ├─► MetricCards          (totals, incidents, failure rate)
        ├─► InsightPanel         (narrative, recommendations)
        └─► AnalyticsSectionCard × N  (topReasons, cityInsights, warehouseInsights, feedbackSummary)
```
