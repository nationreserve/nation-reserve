# Backup and disaster recovery

Production PostgreSQL uses daily full backups, continuous WAL archiving, seven-day high-resolution PITR, 35-day daily retention, and monthly protected copies. Object storage uses versioning, replication, lifecycle retention, and inventory/checksum reports. Backups are encrypted with separately controlled keys.

Every backup is useless until restored. Run `scripts/backup/verify-postgres.ps1` in an isolated environment, verify schema/data invariants and checksums, record the result in `backup_verification_runs`, then destroy the temporary restore database. Quarterly exercises populate `disaster_recovery_exercises`.

Recovery priority: identity/permissions, database, heartbeat ingestion, contracts/assignments, financial ledgers/payments, object storage, queues/projections, reports. Region loss invokes DNS/failover, restores the latest consistent database and object replica, replays idempotent queues, validates Appendix O/audit continuity, and communicates measured RPO/RTO.
