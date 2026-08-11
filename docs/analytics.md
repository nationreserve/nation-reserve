# Analytics and KPIs

The reusable KPI package defines safe zero-denominator calculations for utilization, payment success, average downtime, revenue per robot, and company spend. Role dashboards use organization-scoped projections:

- Hiring companies: hours, spend, robots, facilities, and departments.
- Robot owners: gross earnings, platform fees, net earnings, utilization, downtime, and active robots.
- Manufacturers: deployments, utilization, downtime, model and operational trends.
- Platform executives: fee revenue, active robots and companies, payment success, volume, and growth.

`GET /api/v1/analytics/kpis`, `/analytics/trends`, and `/dashboard` return these read models.
