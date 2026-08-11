# Database architecture

PostgreSQL is the system of record. UUID keys avoid coordination, foreign keys preserve identity, check constraints protect state vocabularies, and append-only triggers protect heartbeat, audit, workflow-history, and timeline evidence. Transactional outbox rows are committed with business changes; projections and consumers are retryable and idempotent.

Large chronological tables use B-tree indexes for scoped paging and BRIN indexes for time-range scans. Timeline and heartbeat retention is archival, not silent deletion. Schema changes are forward-only, checksum-verified migrations. Production uses managed PostgreSQL with multi-AZ synchronous durability, encrypted storage, automated snapshots, WAL archiving, and point-in-time recovery.

ER relationship source: [migration files](../packages/database/migrations). Generate the diagram from PostgreSQL catalog metadata after migrations; the migration chain is authoritative over hand-maintained drawings.
