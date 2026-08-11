# Queue architecture

Durable PostgreSQL job queues are separated by `job_type`: notification, email, heartbeat processing, training processing, report generation, invoice generation, payout processing, search indexing, timeline projection, analytics, file scanning, and thumbnails. Workers claim with `FOR UPDATE SKIP LOCKED`, use bounded exponential retry, record attempts, and dead-letter exhausted jobs.

`queue_health` reports depth, dead letters, oldest age, and attempts. Alerts cover growing depth, stale workers, repeated failures, and dead letters. Handlers must be idempotent; retries must not duplicate payments, payouts, messages, timeline entries, notifications, or files.
