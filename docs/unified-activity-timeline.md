# Unified activity timeline implementation

`ActivityTimeline.tsx` provides the shared presentation system. Routes ending in `/activity` or `/timeline` load a permission-filtered organization activity endpoint and render search, date, category, severity, actor, organization, robot, manufacturer, facility, and contract filters.

The backend exposes the canonical organization and platform activity-feed APIs. Timeline rows are projected transactionally from outbox events, are append-only, and are exposed only through explicit organization audiences. Route-level timelines never reconstruct historical truth from unrelated frontend responses.

Backend contracts:

`GET /api/v1/organizations/:organizationId/activity`

`GET /api/v1/activity` (active platform roles only)

It must enforce organization and object authorization, attachment access, actor redaction, stable pagination, deterministic ordering, immutable event identifiers, timezone-neutral timestamps, and export limits. Platform-administrator access requires separate permissions and audit.


