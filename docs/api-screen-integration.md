# API-to-Screen Integration Audit

The Platform Acceptance screen uses `GET /api/v1/platform/acceptance/overview` and `/gaps`, displays loading, empty and actionable error states, and is protected server-side by platform permissions. Its timeline relationship is read-only evidence; ordinary UI cannot edit canonical specifications.

The complete current-MVP screen inventory still requires a generated contract with endpoint, query key, schemas, loading/empty/error behavior, permission, organization scope, timeline link and test. Generic data views and component-only tests do not satisfy that requirement; see GAP-022-009.
