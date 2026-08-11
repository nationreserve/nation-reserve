# Nation Reserve Master Specification

## Volume I - Appendix A: RoboWorkPool Product Rules

**Status:** Authoritative Business Specification  
**Baseline version:** 1.2.0  
**Effective date:** 2026-07-27  
**Change control:** Specification revision required  
**Revision notes:**

- 1.1.0 adopted Appendix J's two-sided platform-fe model.
- 1.2.0 adopts Appendix M's expanded immutable rules M-001 through M-110.

## 1. Purpose and authority

This appendix is the Product Requirements Baseline for RoboWorkPool. Product
design, implementation prompts, software, tests, operations, and administrative
procedures must preserve it.

If another implementation prompt, design discussion, or engineering decision
conflicts with this baseline, this baseline takes precedence. The conflict must
be resolved through an explicit specification revision before implementation.

This document defines required behavior; it does not authorize implementation
of every feature it describes. Each feature still requires a scoped
implementation prompt.

[Appendix M](appendix-m-expanded-immutable-rules.md) is incorporated into
baseline 1.2.0 as the expanded immutable rule registry. Its stable rule IDs are
the required citation targets for business-logic implementation and tests. A
direct inconsistency between this appendix and Appendix M requires specification
reconciliation; neither may be silently ignored.

### Requirement language

- **Must** and **must not** identify mandatory behavior.
- **Should** identifies expected behavior that requires a documented reason to
  vary.
- **May** identifies permitted behavior.
- A **configurable** value belongs in the future Business Rule Constants
  registry.
- A **TBD** value is unresolved and must not be invented by engineering.

## 2. Product mission

RoboWorkPool exists to create a standardized marketplace for autonomous
humanoid robot labor. Its objectives are to:

- make robot labor simple to purchase;
- make robot ownership financially accessible;
- provide transparent billing;
- automate payroll;
- standardize manufacturer integrations;
- reduce operational complexity; and
- scale across many robot manufacturers.

The experience should resemble hiring cloud-computing resources rather than
negotiating temporary labor.

## 3. Core pricing model

Every verified operating robot has a **$5.00 USD gross base operating rate per
verified operating hour**. This rate is independent of job type, employer,
industry, manufacturer, model, and geographic location unless a future approved
revision states otherwise.

RoboWorkPool applies a **15% owner-side platform fee** to gross base earnings and
a **15% company-side platform fee** to the Hiring Company's base operating
charge. For one full verified hour before taxes and other lawful adjustments:

- Robot Owner gross base earnings are **$5.00**.
- The owner-side fee is **$0.75**.
- Robot Owner net earnings are **$4.25**.
- The Hiring Company base charge is **$5.00**.
- The company-side fee is **$0.75**.
- The Hiring Company subtotal is **$5.75**.
- Gross platform revenue from both fees is **$1.50**.

Each party's applicable fee must be disclosed clearly in its pricing, terms,
contract, invoice or payroll statement, and financial records. Public marketing
need not emphasize both fees in one headline, but it must not describe $5.00 as
the owner's net pay or the company's complete cost. Appendix J is authoritative
for calculation, rounding, settlement, refunds, credits, and adjustments.

Users must not negotiate hourly robot wages through RoboWorkPool. Future premium
services must not alter the core rate without an approved revision.

Money must use fixed-precision decimal or integer minor-unit representations,
not binary floating point. Rounding policy is a configurable business constant.

## 4. Robot ownership

A Robot Owner account may own no more than **20 active robots**. Every robot must
have:

- a unique serial identifier;
- a manufacturer association;
- an ownership record;
- one current operational state; and
- one current maintenance state.

Duplicate registration is prohibited. Ownership transfers must preserve the
prior ownership history.

## 5. Hiring philosophy

Hiring Companies do not purchase robots from RoboWorkPool. They create
contracts, reserve robot operating time, schedule work, receive invoices, and
pay for verified operation. RoboWorkPool provides robot labor as a service.

## 6. Heartbeat authority

The RoboWorkPool Heartbeat API is the authoritative source of operational
verification. Dedicated platform tracking hardware is excluded; manufacturers
integrate through software.

Heartbeats establish connectivity, online status, verified operation, uptime
evidence, and reported health. They are the primary evidence used to calculate
payable operating time.

No robot may become billable before manufacturer onboarding, credential
activation, serial registration, sandbox verification, heartbeat timing
validation, and production-readiness approval are complete.

## 7. Scheduling and workforce planning

Scheduling supports reservations, shifts, historical reporting, forecasting,
contract planning, staffing quantities, geographic deployment, expected hours,
coverage, and expansion planning.

Scheduling is not authoritative for payroll. A scheduled interval without
qualifying heartbeat evidence must not create payable operating time.

## 8. Payroll

Payroll must be calculated automatically from:

- verified heartbeat evidence;
- an approved contract;
- an eligible operational state;
- approved dispute adjustments; and
- attributable administrative corrections.

Manual calculations are exceptional. Every manual adjustment must record the
actor, reason, before and after values, related records, and timestamp.

## 9. Billing

Hiring Company invoices must derive from verified operating time and be
itemized, transparent, and auditable. They must distinguish operating charges,
platform fees, adjustments, credits, and applicable taxes.

Invoices must retain the inputs and rule versions required to reproduce totals.

## 10. Robot status and maintenance

Every robot must have exactly one current operational state. The initial
canonical set is `active`, `scheduled`, `operating`, `idle`, `offline`,
`maintenance`, `repair`, and `retired`.

Every transition must record the prior and new states, effective time, reason,
source, and authorizing actor or system.

Robots in `maintenance`, `repair`, an approved inactive state, or `retired` must
not generate payable operating time. Entry to and exit from a non-billable state
requires authorization and an immutable audit record.

## 11. Contract identification

Each robot assigned to a contract must be identified by its unique serial
identifier. Hiring Companies must be able to identify the exact operating robot
for issue reporting, maintenance coordination, and transparency.

## 12. Downpayment Queue

The platform must include a dedicated Downpayment Queue experience showing
progress while protecting participant privacy.

Each qualifying downpayment creates one independent position. Positions are
ordered solely by the timestamp at which the qualifying downpayment is received.
Earlier qualifying downpayments receive earlier positions.

Ordering must not be manually rearranged except through a documented,
attributable, permanently logged administrative correction.

The queue advances only after:

1. a Hiring Company accepts a robot contract;
2. the Robot Company confirms fulfillment; and
3. Nation Reserve authorizes purchase-order creation.

Robots are allocated from the earliest eligible position forward. Selected
downpayments become purchase orders, ownership records are created, and
fulfilled positions are closed and removed from the active queue.

A position leaves the queue only when fulfilled, voluntarily withdrawn under
policy, or invalidated under a documented rule. Bypassing an earlier qualifying
position requires an approved policy and a visible audit reason.

A Robot Owner must see their position, entry date, ordering timestamp, campaign,
status, estimated progress, and purchase-order status. Other participants'
personal information must remain hidden.

Every queue event must retain its timestamp, position, owner, campaign,
triggering contract, purchase order, event type, and administrator when
applicable. Queue history must not be deleted.

## 13. Administration

Authorized administrators may suspend robots, manufacturers, and companies;
correct billing; adjust resolved disputes; investigate fraud; review heartbeat
evidence; and audit operational history.

Actions must be least-privileged, attributable, timestamped, reasoned, and
immutable in the audit history. Administrative access does not permit silent
deletion or rewriting of financial or operational evidence.

## 14. Robot Owner journey

1. Create and verify an account.
2. Complete required identity, payment, tax, and compliance steps.
3. Review the ownership offer and disclosures.
4. Make a qualifying downpayment or use another approved registration path.
5. Track each independent queue position.
6. Receive allocation and purchase-order confirmation.
7. Receive an ownership record tied to a unique robot.
8. Monitor status, contracts, verified hours, maintenance, earnings, and
   payouts.
9. Raise an eligible dispute.
10. Retain access to historical statements and records.

The interface must distinguish estimates from finalized amounts and must not
imply guaranteed queue timing, utilization, or earnings.

## 15. Hiring Company journey

1. Create and verify the company and authorized users.
2. Complete billing, compliance, and payment setup.
3. Define workforce requirements and create a contract request.
4. Review terms, robot identities, schedule, pricing, and fees.
5. Explicitly accept the contract and authorize payment.
6. Coordinate scheduling and deployment.
7. Monitor assigned robots and verified operation.
8. Report issues against the exact robot.
9. Review invoices and submit eligible disputes.
10. Pay finalized invoices and retain history.

Planning data alone must not create a financial obligation.

## 16. Manufacturer and Robot Company journey

1. Verify the organization and authorized technical contacts.
2. Accept integration and security requirements.
3. Obtain sandbox credentials.
4. Register models and unique serial identifiers.
5. Configure the Heartbeat API.
6. Complete payload, authentication, replay, timing, and failure tests.
7. Receive production-readiness approval.
8. Activate separately scoped production credentials.
9. Confirm fulfillment capacity for accepted contracts.
10. Report heartbeats and support maintenance, incidents, and credential
    rotation.

Credentials must be environment- and organization-scoped, stored securely,
rotatable, and revocable. A manufacturer must not report for another
manufacturer's robots.

## 17. Contract lifecycle

The canonical lifecycle is:

```text
draft
  -> submitted
  -> under_review
  -> offered
  -> accepted
  -> fulfillment_confirmed
  -> authorized
  -> active
  -> completed
  -> closed
```

Approved exception states are `rejected`, `cancelled`, `suspended`, and
`terminated`. A later technical specification must define the transition matrix
and actor permissions before implementation.

- A draft has no financial effect.
- Acceptance captures the terms and version.
- Fulfillment confirmation identifies capacity but does not advance the queue.
- Nation Reserve authorization completes the queue-allocation trigger.
- Active operation requires robot serial identifiers and an effective interval.
- Completion stops new operation under the contract.
- Closure requires financial reconciliation or a recorded exception.

Material changes after acceptance require a versioned amendment and renewed
acceptance, not overwriting accepted terms.

## 18. Heartbeat API payload baseline

The API must use a versioned, authenticated, idempotent event envelope:

| Field               | Requirement                                   |
| ------------------- | --------------------------------------------- |
| `schemaVersion`     | Supported payload schema version              |
| `eventId`           | Globally unique idempotency key               |
| `manufacturerId`    | Authenticated reporting organization          |
| `robotSerialNumber` | Registered unique robot identifier            |
| `observedAt`        | Robot observation time in UTC                 |
| `sentAt`            | Manufacturer transmission time in UTC         |
| `sequenceNumber`    | Monotonically increasing robot event sequence |
| `operationalState`  | Canonical reported state                      |
| `isOperating`       | Explicit operation indicator                  |
| `healthState`       | Manufacturer-reported health classification   |

Optional versioned fields may include contract context, error codes, software
version, and non-sensitive diagnostics. Location must not be mandatory unless a
later privacy-reviewed specification authorizes it.

The service must authenticate and authorize the reporter, validate the schema
and timestamps, process repeated `eventId` values idempotently, detect gaps and
replay, preserve original evidence, distinguish receipt time from observation
time, and return machine-readable results.

Heartbeat interval, grace window, clock-skew tolerance, retention, batch limits,
and rate limits are configurable and **TBD**. Their absence blocks payable-time
implementation; engineering must not invent defaults.

## 19. Dispute resolution

Eligible users must be able to dispute contract operation, verified time,
invoice lines, owner compensation, queue actions, or approved adjustment types.

```text
opened -> acknowledged -> under_review -> resolved -> closed
```

`withdrawn` and `reopened` are controlled exception states.

A dispute records its category, claimant, organization, contested records,
reason, evidence, timestamps, reviewer, decision, and resulting adjustments.
Opening a dispute must not alter source evidence. Corrections are linked
adjustments or compensating records.

Submission windows, response targets, appeal limits, and payment-hold behavior
are configurable and **TBD**. Role separation should prevent reviewers from
silently approving their own financial corrections.

## 20. Pricing and versioning

The $5.00 operating rate, 15% platform fee, and 20-active-robot cap are baseline
values. They must not change through an ordinary deployment or untracked
configuration edit.

A rule change must:

1. receive an approved specification revision;
2. receive an immutable rule-set version and effective time;
3. define treatment of existing contracts, queues, invoices, and accrued pay;
4. be communicated where required;
5. apply prospectively unless an approved correction requires otherwise; and
6. preserve the rule version used by every calculation.

New rules must not silently recalculate finalized historical transactions.

## 21. Business Rule Constants registry

A later appendix must be the sole authoritative registry for configurable
numeric and timing values, including downpayment amounts, ownership limits,
pricing, invitation expiration, heartbeat timing, payout schedules, maintenance
targets, queue withdrawal policy, dispute windows, notification timing,
retention periods, rate limits, and rounding rules.

Implementations should reference stable constant identifiers rather than
scattered literals. Secrets and infrastructure settings are not business-rule
constants.

## 22. Product principles

Future development must favor simplicity, automation, transparent billing and
payroll, manufacturer standardization, security and privacy by default,
auditability, predictable experiences, scalability without foundational
redesign, and accessibility for small and large fleet operators.

## 23. Governance and traceability

Every implementation prompt must identify the baseline version and sections it
implements. Requirements should be traceable to tests, API contracts, data
migrations, and interface acceptance criteria.

Changes require:

1. a proposed revision and rationale;
2. impact analysis;
3. approval by the designated Nation Reserve product authority;
4. a version and effective-date update;
5. migration and communication plans where applicable; and
6. preservation of the superseded version.

Open questions must be resolved by an authoritative revision or referenced
appendix, never an ad hoc engineering assumption.
