# Prompt 008 implementation

RoboWorkPool now includes a provider-neutral payment boundary with deterministic fake and Stripe adapters, safe configuration, hosted payment/payout onboarding, asynchronous collection and payout attempts, refunds linked to approved adjustments, raw signed webhooks, replay protection, chargeback suspense, reconciliation, retry lineage, automatic collections, executable settlement batches, notifications/outbox records, development fixtures, simulators, and operational screens.

## Authority and state

The internal ledger remains authoritative for receivables, owner payables, fees, holds, credits, and invoice/statement balances. The processor remains authoritative for external movement. Immediate API responses remain `submitted`, `processing`, `requires_action`, or `unknown`; only verified webhooks or evidence-based reconciliation invoke terminal settlement transitions.

## Settlement accounting

- Collection: debit 1020 processor clearing; credit 1000 receivable.
- Owner payout: debit 2000 owner payable; credit 1020 clearing.
- Processor fee: debit 5020 processor fees; credit 1020 clearing.
- Refund: debit 1000 receivable; credit 1020 clearing.
- Chargeback: debit 2040 chargeback suspense; credit 1020 clearing.

Every terminal record stores its settlement-journal identifier and state guards prevent repeat posting. Chargebacks do not modify Robot Owner earnings.

## Operations

Automatic collection selects only eligible invoices configured for autopay. Retry processing creates a new attempt linked to its failed predecessor and a deterministic retry key. Reconciliation retrieves provider state and repairs only evidence-backed missing terminal transitions. Approved settlement batches are marked submitted before individual calls; items complete asynchronously through verified terminal events.

The fake provider is prohibited in production and performs no real movement. Live launch still requires Stripe/account configuration, processor approval, legal review of funds flow, and execution of the PostgreSQL integration suite in an environment with PostgreSQL available.