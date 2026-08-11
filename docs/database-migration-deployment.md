# Database migration deployment

CI validates the full chain on PostgreSQL 17 and upgrade fixtures. `migrate:plan` hashes and classifies migrations. A single ECS migration task acquires the existing migration-table transaction boundary plus deployment lock. High-risk/destructive changes require plan review, runtime/lock analysis, verified backup, recovery plan, maintenance assessment, and approval.

Use expand/contract: add nullable structures, dual-write, backfill in bounded jobs, switch reads, verify, then remove only in a later release. Application rollback normally retains the forward-compatible schema. Financial, ownership, heartbeat evidence, verified time, audit, and timelines are never deleted to reverse a release.
