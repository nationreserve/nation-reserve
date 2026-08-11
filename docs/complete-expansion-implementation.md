# Contract, funding, training-data, heartbeat, and wearable expansion

The August 2026 expansion supersedes ticket-based allocation for new funding. Historical ticket rows remain read-only and must not be assigned monetary values without reliable source evidence.

## Authoritative invariants

- Purchase capacity is peak concurrent approved demand, not summed shifts.
- Capacity-changing purchase actions recheck the latest locked snapshot inside a transaction.
- Money is integer cents; ownership is millionths of a robot unit.
- A participant may own at most 20 robot-unit equivalents per contract.
- Unused contribution remains available unless a separately authorized refund occurs.
- Direct allocations remain `PENDING_PRICE` until contract fulfillment and a locked unit price exist.
- Payment deadlines are absolute timestamps exactly seven days after opening.
- Expiration and queue replacement use row locks, immutable ledger entries, and deterministic idempotency keys.
- Human training capture, robot heartbeat, and payable uptime are separate systems.

## Operations

Apply migrations through `0030_expansion_transactional_controls.sql`, then run the API normally. Schedule `pnpm allocations:expire` at least once per minute. API request-time status checks remain required before accepting a direct-allocation payment.

Heartbeat defaults remain: 30-second recommendation, late at 60 seconds, offline at 90 seconds, extended review at five minutes. Missing time is never invented.

## Manual verification

1. Open `/company/contracts/{contractId}/purchase-capacity` and verify peak capacity and the username assignment form.
2. Query `GET /api/v1/contracts/{contractId}/purchase-capacity` with a company-manager token.
3. Assign an active username with an `Idempotency-Key`; verify `PENDING_PRICE` and notification records.
4. Lock a test allocation price and deadline in a test database, advance it past due, run `pnpm allocations:expire`, and verify contribution and ownership ledgers reconcile.
5. Open `/training-equipment`; filter all three tiers and follow a seller link. Verify an outbound-click row.
6. Open `/training-projects`; create a consented session only with a calibrated compatible kit.
7. Submit and review a session; verify compensation uses approved duration only.
8. Open `/` and verify owner, company, human-training, formula, risk, privacy, and CTA copy.

Production payment execution must use the configured provider. Never enable the fake provider outside development/test.
