# Monitoring Verification

| Area | Source support | Executed environment evidence |
|---|---|---|
| API health/error rate | `/live`, `/health`, `/ready`, API metrics registry | Local source/tests only |
| Database | Readiness dependency and infrastructure alarms | Pending deployed dashboard |
| Queue workers | Worker heartbeats, queue depth/latency metrics | Local source only |
| Heartbeat processing | Ingestion/offline workers and operational alerts | Pending credentialed staging simulation |
| Payments/payouts | Attempt, webhook and reconciliation records | Fake-provider tests only |
| Upload processing | Quarantine/background jobs | Pending object-store/malware-engine validation |
| Security alerts | Operational alert persistence | Pending SIEM/on-call integration |
| Timeline processing | Delivery/replay records | Pending database-backed queue failure exercise |

Dashboards are not considered verified merely because metrics or Terraform definitions exist.
