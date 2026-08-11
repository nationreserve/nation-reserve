# Prompt 010 implementation

Prompt 010 adds dedicated reporting, analytics, forecasting, export, and warehouse packages; six materialized daily projections; a versioned report catalog; saved and organization-shared layouts; scheduled reports; report runs and persisted exports; CSV, XLSX, and PDF generation; deterministic forecasts; reusable KPIs; organization-scoped APIs; role dashboards; reporting workers; and frontend reporting, scheduling, export, forecasting, and executive surfaces.

No report becomes authoritative. Queries use allowlisted views, organization access is checked against active membership and role permissions, and platform reports remain platform-only.

Deployment requires migration `0012`, an initial `pnpm reporting:refresh`, schedules for `reporting:refresh` and `reporting:scheduled`, and an outbox consumer for report delivery.
