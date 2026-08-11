# Launch-day runbook

Name the launch owner, production decision authority, incident commander, financial approver, support lead, security lead, communications channel, bridge, and status-page operator before launch.

Freeze unapproved changes; verify manifests, approvals, backup/restore evidence, migrations, secrets, providers, dashboards, alerts, queues and support. Promote the staging digest. Run smoke checks. Enable internal staff, then pilot manufacturers, owners, companies and contracts in the approved order. Monitor API/database/cache/queues, heartbeat, uploads, payments/payouts, reconciliation, support, incidents and timeline persistence.

Stop and roll back for critical security/data integrity, migration incompatibility, payment/ledger inconsistency, sustained availability/latency breach, heartbeat outage, stopped workers, or timeline/audit persistence failure. Declare incidents and update the status page. End of day: reconcile financial state, verify lifecycle journeys and timelines, record gaps, decide hold/continue/rollback, and publish an internal summary.
