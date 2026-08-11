# Production Deployment Runbook

Require protected CI, approved digest, passing critical gates, migration plan/backup, separation of duties and change window. Deploy migrations through the dedicated task, verify status, deploy services by immutable digest, run smoke/readiness checks, monitor errors/queues/payments/heartbeat/timeline, record release/deployment events, and stop on unknown financial or data state.
