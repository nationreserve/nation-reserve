# Backup restore testing

RDS automated backups and WAL provide PITR; protected snapshots and S3 versioning/replication preserve longer recovery. The restore script creates an isolated database, restores a custom-format dump, verifies checksum and schema, and destroys the target. Production drills additionally reconcile ledgers, timeline/audit counts, ownership, heartbeat/verified time, search rebuild, queues, and object metadata.

A restore is not passed until evidence is stored in `backup_verification_runs`. Production restore requires elevated approval and an incident/change record.
