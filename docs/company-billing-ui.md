# Company billing UI

The UI separates estimates, finalized charges, invoices, payment submission, processing, settlement, payment, credits, and disputes. Payment uses processor-backed idempotent commands; unknown outcomes require reconciliation rather than blind retry.
