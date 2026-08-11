# Reporting

RoboWorkPool reports are derived read models. Transactional tables, posted financial accruals, verified operating intervals, payment records, and audit logs remain authoritative.

The report catalog allowlists every source view. A caller must hold `reports.read` in an active organization membership, or an equivalent platform role. Platform-only definitions cannot be executed by organization users. Saved reports retain filters and layouts; sharing is limited to the owning organization.

Routes include `/api/v1/reports`, `/api/v1/reports/run`, `/api/v1/reports/saved`, `/api/v1/reports/scheduled`, and `/api/v1/reports/export`.
