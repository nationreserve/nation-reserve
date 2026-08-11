# Rollback

Rollback promotes the previous approved immutable digest through the protected release workflow. ECS stops unhealthy rollout automatically; operators may initiate explicit rollback for error, latency, heartbeat, payment, queue, timeline, security, or migration-compatibility triggers. Rollback emits events, notifies staff, and opens an incident when customer impact exists.

Schema rollback is separate. Prefer a forward fix against expand/contract-compatible schema. PITR is reserved for approved corruption/loss recovery. Never automatically erase financial, payment, ownership, verified-time, timeline, or audit records.
