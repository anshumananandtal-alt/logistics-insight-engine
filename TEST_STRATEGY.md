TEST STRATEGY for Logistics Insight Engine

Purpose

This document describes the testing approach to validate correctness, stability, and quality of the Logistics Insight Engine repository (a Vite + React + TypeScript front-end app that ingests sample CSVs and produces analytics & narrative insights).

Goals

- Ensure core analytics logic (data join, classification of failures and scoring) is correct and deterministic.
- Protect UI components and user flows (filtering, chart rendering, narrative generation) with tests so refactors are safer.
- Provide integration and E2E tests to validate realistic user scenarios (load CSVs → choose filters → inspect insights).
- Add performance and accessibility checks to keep the demo usable and inclusive.

Scope

Primary targets for tests
- src/hooks/useLogisticsAnalytics.ts (analytics logic + data joins) — highest priority
- Key presentational and interaction components: FilterToolbar, MetricCards, InsightPanel, AnalyticsSectionCard, MetricCards
- CSV parsing and data-loading pipeline (PapaParse + local public/assets/data/*.csv)
- End-to-end flows (startup → load data → apply filter → get narrative & charts)

Testing Types and Tools

1) Unit tests (fast, isolated)
- Technology: Vitest (recommended) or Jest + @testing-library/react
- Target: pure functions, classification utilities, small helper modules and the analytics hook logic (useLogisticsAnalytics) with mocked CSV input.
- Example test cases:
  - joinOrdersAndLogs: verify correct join keys and row counts for small sample fixtures
  - classifyFailureReason(order): test priority order (order status → fleet → weather → unknown)
  - metric calculations: incident rate, active warehouses count, top city by failure rate
- Commands (add to package.json scripts):
  - "test": "vitest"
  - "test:coverage": "vitest run --coverage"

2) Component tests (UI logic & interactions)
- Technology: @testing-library/react + Vitest (or Jest)
- Target: FilterToolbar (verify debounced input/apply), MetricCards (metric values from props or hook), InsightPanel (renders narrative when enough rows, displays low-data message when not enough)
- Example tests:
  - FilterToolbar: selecting city and clicking Get triggers the expected callback after debounce
  - InsightPanel: given a mocked analytics snapshot, the narrative contains the expected top city and trigger

3) Hook tests (integration/unit hybrid)
- Technology: @testing-library/react-hooks (or @testing-library/react + renderHook), Vitest
- Target: useLogisticsAnalytics — feed sample CSV fixtures (small) to the hook and assert computed state and outputs (metrics, lists, narrative recommendations)
- Isolation: use in-memory fixtures (JS objects) rather than reading large CSVs; mock PapaParse if needed

4) Integration tests
- Technology: Vitest + @testing-library/react (component composition) or a lightweight Puppeteer-based smoke test
- Goal: verify CSV -> parse -> analytics hook -> UI flow in an integrated environment
- Example: load a small CSV fixture into the app (inject via dependency injection or by pointing parser to a fixture), render App, apply a filter, assert charts and narrative update

5) End-to-end tests (browser)
- Technology: Playwright (recommended) or Cypress
- Goal: realistic, scripted user flows against the dev server/built preview
- Example scenarios:
  - E2E-1: Start app, wait for "Get data"/initial load, change filter to a city, verify MetricCards and InsightPanel update within timeout
  - E2E-2: Upload/point to a CSV with intentionally malformed rows and verify app gracefully warns and proceeds with valid rows
- Commands: add npm script "test:e2e" to run Playwright tests against "npm run preview" or a deployed preview URL

6) Performance/regression tests
- Technology: Lighthouse (CI via lighthouse-ci) for basic performance checks; k6 for load testing if backend introduced
- Client-side perf checks:
  - Build size budget (asset size after vite build)
  - Time-to-interactive and largest-contentful-paint for the initial view when loading the sample CSVs
- Set thresholds and track in CI (fail builds when >5% regression for key metrics)

7) Accessibility tests
- Technology: axe-core + @testing-library/jest-dom or Playwright accessibility checks
- Target: ensure color contrast on charts and MUI controls, keyboard navigation to filters and Get button, ARIA attributes on interactive elements

Coverage targets and gating

- Unit + component coverage: target 80% lines/branches (start with 70% if adding tests to a legacy demo) and raise iteratively
- E2E smoke tests must succeed for pull requests to main (basic user flows)
- Performance: detect regressions in CI (Lighthouse thresholds)

CI Integration

- Add a GitHub Actions workflow triggered on PRs and pushes to main that runs:
  - npm ci
  - npm run lint
  - npm run build (type-check + vite build)
  - npm test (unit + component tests with coverage)
  - optionally run lightweight Playwright smoke tests against vite preview
- Configure caching for node_modules and vite's cache to speed runs

Test Data & Fixtures

- Add a small fixtures folder (tests/fixtures/) with minimal CSVs (5–30 rows) representing:
  - normal data
  - late/failed orders
  - malformed rows (missing columns, invalid dates)
- Use these fixtures during unit/hook tests and in VRT/E2E when reproducible behavior is needed

Developer experience

- Add scripts to package.json (suggestions):
  - "test": "vitest"
  - "test:watch": "vitest --watch"
  - "test:coverage": "vitest run --coverage"
  - "e2e:open": "playwright test --ui"
  - "e2e:run": "playwright test"
- Document how to run local E2E: start preview server (npm run preview) and then run Playwright tests pointing to http://localhost:4173 (vite preview default)

Quick prioritised checklist (how to get from 0→pass quickly)
1. Add Vitest + @testing-library/react devDependencies and minimal config
2. Add small CSV fixtures in tests/fixtures
3. Write 6–10 unit tests covering useLogisticsAnalytics core functions (joins, classification, metrics)
4. Add 4–6 component tests for FilterToolbar, MetricCards, InsightPanel
5. Add a Playwright smoke test for the primary user flow
6. Add CI workflow to run lint/build/tests on PRs

Appendix: Example unit test outline for useLogisticsAnalytics (pseudocode)

- Given orders.csv (3 rows) and fleet_logs.csv (3 rows) feed to the parser
- Expect: totalOrders === 3
- Expect: incidentCount === X (based on fixture)
- Expect: topCity === 'Bengaluru' when fixture arranged

Notes

- The repo currently does not include a test runner. Vitest is recommended because it integrates well with Vite and TypeScript and has fast start-up time. If the project maintainers prefer Jest, the same strategy applies but with Jest-specific setup.
- Tests should avoid loading the full set of public CSVs in unit tests; use trimmed fixtures. Keep at least one integration/E2E test that runs against the actual public/assets data to preserve representative smoke coverage.


Generated-by: AI assistant using Copilot CLI runtime in VS Code
