# RoboWorkPool Core Domain Model

Prompt 002 establishes the persistent system of record. IDs are UUIDs; timestamps
are UTC `timestamptz`; mutable aggregates carry explicit status and version fields.

```mermaid
erDiagram
  USER ||--o{ ORGANIZATION_MEMBERSHIP : joins
  ORGANIZATION ||--o{ ORGANIZATION_MEMBERSHIP : has
  ORGANIZATION ||--o| MANUFACTURER : represents
  ORGANIZATION ||--o| HIRING_COMPANY : represents
  MANUFACTURER ||--o{ ROBOT_MODEL : publishes
  ROBOT_MODEL ||--o{ ROBOT : classifies
  ROBOT ||--o{ ROBOT_OWNERSHIP_RECORD : history
  ORGANIZATION ||--o{ ROBOT_OWNERSHIP_RECORD : owns
  HIRING_COMPANY ||--o{ FACILITY : operates
  FACILITY ||--o{ DEPARTMENT : contains
  HIRING_COMPANY ||--o{ CONTRACT : requests
  MANUFACTURER ||--o{ CONTRACT : fulfills
  CONTRACT ||--|{ CONTRACT_VERSION : snapshots
  FINANCIAL_CONFIGURATION_VERSION ||--o{ CONTRACT : prices
  CONTRACT ||--o{ ROBOT_ASSIGNMENT : allocates
  ROBOT ||--o{ ROBOT_ASSIGNMENT : performs
```

Robot state is deliberately multidimensional: registration, ownership, activation,
heartbeat, operation, maintenance, compliance, financial eligibility, and final
lifecycle state are independent columns.

Contracts are aggregates; `contract_versions` are immutable snapshots. Assignments
bind one robot, one contract version, the verified owner at assignment time,
manufacturer, hiring company, facility, and optional department.

Database invariants include unique normalized serials per manufacturer,
non-overlapping verified ownership and live assignment periods, one active financial
configuration at a time, append-only audit/version rows, and referential integrity.
The 20-active-robot ownership limit is also enforced by a transactional domain guard.

