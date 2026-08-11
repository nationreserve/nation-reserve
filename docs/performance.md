# Performance and capacity

The load scaffold at `scripts/load/prompt-020.k6.js` covers search, timeline, and heartbeat scenarios with explicit p95/error thresholds. Run it against an isolated production-shaped environment with representative row counts, file sizes, indexes, network latency, and concurrent workflows.

Release evidence records dataset shape, commit, environment, throughput, latency percentiles, database/Redis/queue saturation, errors, and regressions. Capacity alerts fire before 70% sustained resource usage; scale-out begins before 80%. Performance results from empty local databases are not accepted as production evidence.
