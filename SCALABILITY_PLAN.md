SCALABILITY PLAN for Logistics Insight Engine

Context & constraints

This project is currently a client-side demo that:
- Runs entirely in the browser (Vite + React + TypeScript)
- Loads sample CSV files from public/assets/data/*.csv and performs joins/classification client-side
- Produces charts and a short narrative based on aggregated metrics

Because the app runs entirely client-side against static CSVs, the main scalability limits are:
- Client device memory and CPU when parsing and aggregating larger CSVs
- Browser main-thread blocking due to synchronous parsing or heavy aggregation
- Startup / page load time as asset sizes grow

This plan outlines migration and operational steps to make the solution production-scalable and robust for larger datasets or many users.

Goals

- Allow the system to handle datasets beyond a few megabytes per client (e.g., tens to hundreds of millions of rows in aggregate across a fleet), by moving heavy work off the client and providing low-latency responses.
- Ensure responsive UI for users (sub-second filter interactions for typical slices; <3s for first-view narrative)
- Support concurrent users with predictable cost and capacity
- Maintain explainability (narrative generation) and reproducible classification logic

High-level architecture recommendations

Option A — Small-scale production (fastest path)
- Keep a mostly static front-end and add a lightweight server-side preprocessor (serverless functions or a small Node/Express service) that:
  - Accepts CSV uploads or reads CSVs from a storage bucket (S3 / Azure Blob / GCS)
  - Runs deduplication, normalization, and pre-aggregation (per-city, per-warehouse, per-driver)
  - Stores precomputed aggregates in a simple cache (Redis) or a small analytics DB (Postgres with summary tables)
- Front end requests only aggregated slices (filters) via REST endpoints, keeps charts interactive but light.
- Benefits: low client CPU, simple deploy, modest infra cost.

Option B — Medium → Large scale (recommended for production analytics)
- Ingest pipeline:
  - Raw CSVs land in object storage (S3/GCS) or are streamed into a message bus (Kafka / Kinesis)
  - A processing layer (worker fleet or serverless data jobs) parses CSVs, enriches rows, classifies failures, and writes both raw/normalized rows to a columnar data store and pre-aggregations to an OLAP store
- Storage & query:
  - Use columnar / analytic databases (ClickHouse / BigQuery / Snowflake) for ad-hoc queries and fast aggregations
  - Maintain an operational Postgres or Redis cache for low-latency filter lookups and small aggregates
- API Layer:
  - A horizontally-scalable stateless API service (Node/Go/Python) that serves aggregated views and narrative payloads. Use pagination and limit result size.
  - Cache hot queries with Redis and CDN the API responses where sensible
- UI & UX:
  - Front-end lazy-loads charts and uses virtualization for large tables
  - Use Web Workers for any client-side heavy compute that must remain client-side (e.g., user-driven ad-hoc CSV analysis)
- Benefits: high throughput, low interactive latency, scalable cost by separating storage & compute

Data partitioning & schema

- Partition pre-aggregated data by time (day/week/month) and geography (region/city) to allow fast lookups for common slices.
- Maintain pre-aggregated dimensions:
  - city, warehouse_id, driver_id, client_id, date_bucket
- Precompute metrics: total_orders, incident_count, incident_rate, average_delay, sentiment_distribution
- Save a reproducible classification version (classifier_version) so narratives can be traced back to the logic used

Caching and CDNs

- Static assets: host the built app on a CDN (Cloudflare, Netlify, Vercel, S3+CloudFront)
- API responses: cache frequent queries (e.g., top cities of last 7 days) in Redis with TTLs and invalidate when fresh data arrives
- Use stale-while-revalidate patterns for UX: return cached aggregate immediately then refresh in background

Client-side performance techniques

- Streaming/parsing: for user-uploaded large CSVs use streaming parsers (PapaParse streaming or server-side streaming) to avoid loading whole files into memory
- Web Workers: perform CPU-heavy classification & joins in a worker thread to avoid blocking the UI
- Virtualization: use virtualization (react-window / react-virtualized) for large tables or lists
- Code-splitting: lazy-load charting libraries and heavy visual components to reduce main bundle size
- Limit chart points: sample or aggregate on the server for visualizations (e.g., top N buckets rather than raw millions of points)

Operational concerns & autoscaling

- Autoscale API pods based on request latency and queue length (Kubernetes HPA with CPU / custom metrics). Typical rules:
  - Scale up when 95th percentile latency > 300ms for aggregated endpoints
  - Scale up when Redis cache miss rate increases above baseline
- Worker pool autoscaling based on backlog (SQS / Kafka consumer lag)
- Database sizing: reserve throughput and monitor slow queries; for ClickHouse/BigQuery rely on partition pruning and summary tables

Fault tolerance and data quality

- Implement schema validation on ingestion (reject or route malformed rows to a dead-letter queue)
- Provide an ingestion monitoring dashboard (failed rows, parser errors, data freshness)
- Keep raw files immutable in object store for replay/debugging

Security & governance

- AuthN/AuthZ for upload and API access (OAuth2 / API tokens)
- Rate limiting/quotas on public endpoints to avoid abusive costs
- Audit logs for ingestion and classification runs

Observability

- Metrics to collect:
  - Ingestion throughput (rows/minute)
  - Processing latency (parse → classification → write)
  - API latencies and 95/99 percentiles per endpoint
  - Cache hit ratio
  - UI metrics: first contentful paint, interactive time, error rates
- Logs: structured logs with request ids and classifier_version
- Alerts: ingestion failures, consumer lag exceeding threshold, error rate spikes

Cost considerations

- For small volumes: serverless + small Postgres + Redis is cost-effective
- For heavy analytics: managed analytics (BigQuery) and CDN for static hosting reduce operational load but may increase query costs — use pre-aggregation to minimize repeated scans

Suggested rollout (phased)

Phase 0 (quick wins)
- Host front-end on CDN (Vercel/Netlify) and reduce bundle sizes (lazy-load recharts, etc.)
- Add Web Worker for parsing large CSVs
- Move heavy CSV parsing into a small serverless function that returns pre-aggregated JSON

Phase 1 (production readiness)
- Add ingestion flow to object storage and a serverless worker to pre-aggregate and store into Postgres/Redis
- Add API layer for aggregated queries with caching and basic auth
- Add monitoring dashboards and CI jobs to benchmark builds (Lighthouse)

Phase 2 (scale)
- Introduce columnar analytics store (ClickHouse/BigQuery) for ad-hoc queries
- Add a streaming pipeline (Kafka) and worker fleets for high-volume ingest
- Autoscale compute via K8s / managed serverless based on traffic patterns

Specific client-side mitigations (if first priority is to keep serverless cost at zero)
- Limit the size of CSV loaded in the browser (implement an upload size hint) and surface a recommendation to use server-side upload for larger files
- Provide a client-side sample-mode: perform full-analysis only on a representative sample of rows and surface sample-size in the narrative
- Use progressive disclosure: show high-level metrics first (fast aggregate on sample), then allow user to request a full re-compute (background job)

Testing & validation for scalability

- Synthetic load tests using k6 to evaluate API behaviors for target concurrency
- End-to-end performance tests (Lighthouse + WebPageTest) regularly in CI
- Data correctness tests: regression checks to ensure classifier_version produces expected top-n reasons on canonical fixture sets

Actionable next steps

1) For near-term pass: host the built app on a CDN and implement Web Worker parsing to avoid UI jank
2) Add a tiny serverless function to pre-aggregate the CSVs and return JSON aggregates (this fixes client memory limits quickly)
3) Add monitoring, caching, and an E2E smoke test to validate the API and UI under typical load
4) If production scale is required, plan for ClickHouse/BigQuery ingestion and a streaming pipeline; estimate cost against expected query volumes

References & tools

- Parsing/streaming: PapaParse (streaming in browser), node-csv, stream-transform
- Columnar analytics: ClickHouse, BigQuery
- Load testing: k6, Gatling
- E2E: Playwright, Cypress
- CI: GitHub Actions with caching for node_modules, Lighthouse CI for perf budgets

Generated-by: AI assistant using Copilot CLI runtime in VS Code
