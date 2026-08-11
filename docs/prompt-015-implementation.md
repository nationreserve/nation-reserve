# Prompt 015 implementation

Prompt 015 adds the first complete role-facing route family: the Robot Owner portal. Every required `/owner` route is represented through `OwnerPages.tsx` and rendered inside the authenticated shared application shell.

The frontend consumes existing robot detail, claim submission, assignment detail, per-robot operating time, earnings, statement, hold, dispute, payout-account, payout-attempt, and reporting contracts. It does not duplicate allocation, heartbeat, earnings, fee, hold, or payout rules.

## Deliberately unavailable operations

The current backend does not expose owner-scoped robot inventory, ownership-claim reads, assignment listing, owner-wide operating-time aggregates, operating-interval detail, notification feeds, availability mutations, or a complete dashboard aggregate. Corresponding screens display explicit API-required states. Missing values render as an em dash rather than zero.

## Validation

Automated coverage includes routing, dashboard terminology, inventory filters, ownership submission, read-only assignments, scheduled-versus-verified terminology, financial terminology, holds, payout confirmation, notification deep links, and reporting integration. Manual keyboard, screen-reader, responsive, zoom, contrast, and processor-redirect review remains required before production release.
