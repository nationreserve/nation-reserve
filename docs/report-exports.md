# Report Exports

CSV, Excel `.xlsx`, and PDF exports contain generation time, applied filters, timezone, organization scope, and report version. Excel files use Office Open XML and PDFs are generated as real PDF documents.

Each export records its SHA-256 checksum, content type, byte count, expiry, requester, organization, and report run. Scheduled output is persisted and emits `report.scheduled.ready` through the outbox for the notification delivery layer.

Export permission is separate from read permission.
