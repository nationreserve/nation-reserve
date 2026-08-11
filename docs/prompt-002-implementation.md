# Prompt 002 Implementation Notes

This increment adds branded identifiers, event/error/audit contracts; Zod schemas and
types; repository and unit-of-work ports; transaction-scoped lifecycle services;
PostgreSQL constraints, audit history, and an outbox; Drizzle mappings; checksum
migrations; a guarded reset; idempotent seed; and unit/integration tests.

Deferred by scope: authentication, heartbeat ingestion, billing/payroll execution,
the downpayment queue, matching, notifications, and dashboards.

Application commands should be parsed with exported schemas and invoke domain
services through `DomainUnitOfWork`. The database adapter must write the business
record, audit entry, and outbox event in the same PostgreSQL transaction.

