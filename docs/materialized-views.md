# Materialized Reporting Views

The warehouse foundation contains:

- `robot_daily_summary`
- `company_daily_summary`
- `owner_daily_summary`
- `financial_daily_summary`
- `payment_daily_summary`
- `heartbeat_daily_summary`

Views are initially created without data so deployment can control the first refresh. Run `pnpm reporting:refresh` after migration. The worker refreshes each view concurrently, records a `warehouse_refresh_runs` watermark, and emits worker/job telemetry. Unique indexes support concurrent refresh.

Daily snapshots provide a future incremental ETL boundary. No external warehouse is required.
