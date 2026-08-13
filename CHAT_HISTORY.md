## Prompt 1

Build a React + TypeScript + Vite application.

Tech Stack:
- React
- TypeScript
- Vite
- React-Bootstrap (layout)
- Material UI (components)
- xlsx
- Recharts

Data:
Load these Excel files from assets/data:
orders.xlsx
fleet_logs.xlsx
warehouse_logs.xlsx
feedback.xlsx
external_factors.xlsx
clients.xlsx
drivers.xlsx
warehouses.xlsx

Requirements:
- Read all csv files.
- Convert to JSON.
- Merge datasets using order_id, client_id, warehouse_id, driver_id (or best matching fields).
- Generate one aggregated dataset.

Dashboard:
- Total Orders
- Successful Deliveries
- Delayed Deliveries
- Failed Deliveries

Charts:
- Delay Reasons
- Warehouse Delays
- Driver Failures
- Weather Impact
- Traffic Impact
- Complaint Summary

Queries:
1. Delays in City X yesterday
2. Client X failures last week
3. Top failure reasons
4. Compare City A vs City B failures
5. Festival-period risk prediction from historical data
6. Impact of +20,000 monthly orders

Each query returns:
- Summary
- Metrics
- Result table

UI:
- Responsive Bootstrap layout
- MUI AppBar
- Summary cards
- Charts
- Query panel
- Results table
- Export buttons
- Professional light theme

Project Structure:
src/
  components/
  hooks/
  utils/
  types/
  App.tsx

Components (max 10):
Navbar
Dashboard
SummaryCards
Charts
QueryPanel
ResultsTable
ExportButtons

Utilities:
- excel.ts
- aggregator.ts
- analytics.ts
- export.ts

Rules:
- No backend
- No database
- No authentication
- No AI API
- No Context API
- No Redux
- React Hooks only
- Functional components
- TypeScript interfaces
- Reusable utilities
- Clean, modular code

Generate the complete project, including README, so it runs with:

npm install
npm run start