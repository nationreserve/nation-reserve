# Query optimization

Production queries must be organization-scoped, bounded, parameterized, and cursor-paginated. Dashboard and reporting queries use governed projections. Timeline, message, notification, heartbeat, and search pages never load full histories. Inspect changes with `EXPLAIN (ANALYZE, BUFFERS, WAL)` against production-shaped data and retain plans as release evidence.

Targets: interactive p95 below 500 ms, timeline p95 below 400 ms, heartbeat ingestion p95 below 250 ms, and database pool saturation below 80%. Slow-query logging and `pg_stat_statements` identify regressions. Avoid offset pagination, unbounded JSON scans, N+1 joins, functions on indexed filter columns, and long heartbeat transactions.
