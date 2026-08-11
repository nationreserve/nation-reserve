# Operational incident runbooks

Use this common procedure for API, authentication, database, Redis, queue, heartbeat, timeline, training upload, object storage, search, email, Stripe, webhook, payout, reconciliation, deployment, migration, backup, restore, security, credential, certificate and manufacturer integration incidents.

1. Confirm alert, scope, customer impact, start time and severity without exposing private data.
2. Open/link the incident, dashboard, logs, trace, release, deployment and applicable organization resources.
3. Freeze unsafe writes—especially settlement, payout, migrations or credential rotation—while preserving heartbeat evidence and idempotent intake where safe.
4. Follow the subsystem dashboard and health checks; compare the current release/configuration and queue age to the last known good state.
5. Mitigate using scale-out, provider isolation, queue pause/replay, cache bypass, credential overlap, prior immutable image, failover or approved restore. Never delete immutable evidence.
6. Escalate to operations plus the responsible security, financial, manufacturer or provider owner. Communicate customer-safe status.
7. Verify health, data invariants, ledger/reconciliation, queue recovery, audit and Appendix O continuity before resolution.
8. Record recovery, evidence, timeline/audit events, follow-up owners and post-incident review.

Critical alerts must include impact, subsystem, first detection, status, runbook/dashboard/incident links. They must not contain secrets, tokens, raw payment data, training content or unnecessary infrastructure detail.
