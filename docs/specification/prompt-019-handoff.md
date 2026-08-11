# Prompt 019 backend implementation handoff

Prompt 019 establishes the production-backend direction and makes Appendix O integration a global completion rule. This increment implements the first enforceable vertical slice: immutable timeline persistence, transactional outbox projection, explicit organization audiences, authenticated organization/platform read endpoints, server-side search and filters, stable cursor pagination, and focused authorization tests.

## Implemented contract

- `GET /api/v1/organizations/:organizationId/activity`
- `GET /api/v1/activity` (active platform roles only)
- Outbox metadata may provide `timeline.category`, `source`, `summary`, `details`, `status`, `severity`, `organizationIds`, `relatedObjects`, and `attachments`.
- Events lacking an authorized organization audience remain durable in the outbox and are deliberately not exposed.
- `metadata.timeline.exclude=true` is the documented exception mechanism. Its use must be reviewable and must never hide a business lifecycle event.

## Global completion gate

Every new entity, workflow, and major business object must publish meaningful domain events with timeline audience metadata. A feature is incomplete until those events are permission-aware, searchable, and viewable through the Unified Activity Timeline. The timeline is an explanatory projection and does not replace audit logs, heartbeat evidence, or financial ledgers.

## Remaining Prompt 019 scope

The broad prompt is not represented as fully complete by this slice. Remaining work includes domain-by-domain event metadata retrofits, object-level permission policies beyond organization membership, attachment authorization/downloads, server-generated exports, notification subscriptions, a durable multi-consumer event broker, generalized workflow runtime, full OpenAPI generation, and integration tests against PostgreSQL.
