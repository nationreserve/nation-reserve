# Robot Activation

```mermaid
sequenceDiagram
  Manufacturer->>API: Start activation
  API->>PostgreSQL: create one active session + checks
  Manufacturer->>API: Signed-context test message
  API->>PostgreSQL: reject replay/skew; record mapping result
  Manufacturer->>API: Complete activation
  API->>PostgreSQL: require every check + optimistic robot update
```

Activation proves technical readiness only. It creates no heartbeat interval, payable
time, payroll, invoice, assignment, or evidence of work. Successful production
activation makes the robot available while retaining `not_payable`.

