# Financial Ledger

Each finalized accrual posts a balanced journal:

```mermaid
flowchart LR
  V[Finalized verified interval] --> A[Immutable accrual]
  A --> D[Debit company receivable]
  A --> P[Credit owner payable]
  A --> C[Credit company fee revenue]
  A --> O[Credit owner fee revenue]
```

Posting is rejected unless debits equal credits and at least two lines exist.
Posted entries and lines are immutable. Corrections use reversals.

