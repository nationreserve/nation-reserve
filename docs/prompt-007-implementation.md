# Prompt 007 Implementation

Prompt 007 converts finalized verified operating seconds into versioned accruals and
balanced subledger entries. It adds periods, invoices, owner statements, holds,
adjustments, disputes, reconciliation, settlement preparation, scoped APIs,
dashboards, CSV-safe export foundations, workers, and development simulation.

```mermaid
sequenceDiagram
  participant W as Finalization worker
  participant D as PostgreSQL
  W->>D: Lock eligible interval
  W->>D: Calculate and insert accrual
  W->>D: Insert balanced journal lines
  W->>D: Post journal and finalize interval
  Note over W,D: One transaction; no external money movement
```

Rates and calculation versions remain attached to every accrual. Invoice issuance
is not collection, statement issuance is not payout, and settlement preparation
does not move funds.
