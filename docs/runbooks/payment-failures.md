# Payment Failure Runbook

Identify invoice, attempt, provider environment and last verified provider event. Never resubmit when outcome is unknown. Reconcile provider state first; retry only with the stable idempotency key. Failed collection leaves the invoice due; failed payout leaves payable value intact. Escalate signature, duplicate, chargeback and balance anomalies to Billing and Security; use adjustments, never historical mutation.
