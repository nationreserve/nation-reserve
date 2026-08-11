# Platform health

`/live` reports process liveness. `/ready` verifies PostgreSQL, Redis, and object storage. Authenticated `/api/v1/platform/health` adds worker freshness, queue depth/age, memory, uptime, and configuration posture. `/api/v1/platform/metrics` exposes low-cardinality Prometheus text for jobs, queue depth/latency, enabled flags, and maintenance state.