# Production launch checklist

Every item begins unchecked and requires linked evidence and an approver.

## Product

- [ ] Public website, authentication, Owner, Company, Manufacturer, and Platform portals accepted
- [ ] Support and canonical Appendix O timeline accepted

## Security

- [ ] Secrets, production keys, authorization, uploads, webhooks, redaction, scans, and external review accepted
- [ ] No fake/test provider or development adapter enabled

## Data and operations

- [ ] Migration chain, current backup, isolated restore, retention, seed policy, monitoring, alerts, on-call, incident exercise, status page, runbooks accepted
- [ ] No preview/test data or credentials in production

## Financial

- [ ] Configuration, ledger reconciliation, Stripe live approval, limits, settlement approval, refunds, chargebacks, payout controls accepted

## Robot operations

- [ ] Manufacturer approval, registration, signed heartbeat, replay/duplicate/offline handling, inactivity and replacement accepted

## Legal and policy

- [ ] Terms, privacy, accessibility statement, support contact, processor/business review and actual authorized legal review accepted

## Release

- [ ] Immutable digest promoted from staging, migration/rollback compatible, smoke/E2E/a11y/load/security gates passed
- [ ] Release approved, Appendix O events verified, launch phase limits and rollback authority confirmed
