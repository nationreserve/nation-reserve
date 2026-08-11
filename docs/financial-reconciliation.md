# Financial Reconciliation

Reconciliation records missing accruals, missing journals, imbalance, duplicate
document association, total mismatches, and settlement duplication as explicit
exceptions. It never silently repairs history.

```mermaid
flowchart LR
  I[Intervals] --> R[Reconciliation run]
  A[Accruals and journals] --> R
  D[Invoices and statements] --> R
  R --> X[Persistent exceptions]
  X --> P[Controlled correction]
```

