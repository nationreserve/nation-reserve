# Financial Holds

Amount-specific holds prevent affected records from settlement preparation without
deleting accruals or ledger history. Placement and release require explicit reasons.
Confirmed-invalid amounts require a reversal or adjustment.

```mermaid
flowchart LR
  R[Financial record] --> H[Active hold]
  H -->|Release with reason| E[Eligible for later preparation]
  H -->|Confirmed invalid| C[Correction or reversal]
```

