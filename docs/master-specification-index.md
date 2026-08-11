# Nation Reserve Master Specification

## Master Appendix Index

**Status:** Authoritative reading order  
**Current baseline:** Product Requirements Baseline 1.2.0

These appendices define the product blueprint. They do not, by themselves,
authorize implementation of the described business features. A scoped
implementation prompt must identify the applicable appendix versions and
sections.

| Order | Appendix                                                                          | Authority                                                                       |
| ----- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A     | [RoboWorkPool Product Rules](product-requirements-baseline.md)                    | Immutable business rules and governance                                         |
| B     | [User Journey Specifications](appendix-b-user-journeys.md)                        | User lifecycles and experience requirements                                     |
| C     | [Complete Screen Inventory](appendix-c-screen-inventory.md)                       | UI surfaces, navigation, and shared components                                  |
| D     | [Data Ownership & Relationships](appendix-d-data-ownership.md)                    | Entity ownership, relationships, retention, and integrity                       |
| E0    | [API Architecture & Security Standards](appendix-e0-api-architecture-security.md) | Cross-cutting API behavior, identity, security, reliability, and compatibility  |
| E     | [API Contract Specification](appendix-e-api-contracts.md)                         | Endpoint catalog and endpoint-specific requirements                             |
| F     | [Event Catalog](appendix-f-event-catalog.md)                                      | Event names, producers, consumers, delivery, and audit requirements             |
| G     | [Roles & Permissions Matrix](appendix-g-roles-permissions.md)                     | Platform and organization authorization rules                                   |
| H     | [Notification Catalog](appendix-h-notification-catalog.md)                        | Notification policy, recipients, channels, escalation, and auditability         |
| I     | [Website & Landing Page Specification](appendix-i-website.md)                     | Public routes, content, conversion, accessibility, and marketing constraints    |
| J     | [Billing & Financial Mathematics](appendix-j-financial-mathematics.md)            | Authoritative fees, calculations, ledger, settlement, and financial tests       |
| K     | [Fraud Prevention & Trust Systems](appendix-k-fraud-trust.md)                     | Fraud controls, investigations, evidence, holds, appeals, and fail-safe trust   |
| L     | [Robot Lifecycle Specification](appendix-l-robot-lifecycle.md)                    | Robot identity, multidimensional states, transitions, ownership, and retirement |
| M     | [Expanded Immutable Product Rules](appendix-m-expanded-immutable-rules.md)        | Stable immutable rule registry M-001 through M-110; completes Volume I          |
| N     | [Contract & Assignment Specification](appendix-n-contract-assignments.md)         | Volume II contract, planning, matching inputs, assignment, and completion rules |

## Precedence

1. Appendix A baseline 1.2.0 and Appendix M jointly control immutable business behavior; Appendix M provides the stable rule IDs.
2. Appendix J controls financial mathematics under the approved immutable model.
3. Appendix E0 controls API and service security architecture.
4. Appendix K controls fraud, trust, investigation, evidence, holds, and appeals.
5. Appendix L controls robot identity and lifecycle transitions.
6. Appendix G controls roles and permissions; Appendix E0 controls enforcement standards.
7. Appendix D controls data ownership and historical integrity.
8. Appendix N controls contracts, workforce planning, and assignments subject to the immutable rules.
9. Appendix E controls which APIs exist; new conceptual endpoints require an Appendix E revision.
10. Appendix F controls event contracts and delivery semantics.
11. Appendix H controls notification policy generated from platform events.
12. Appendices B, C, and I control journeys, UI inventory, and public presentation.

When two appendices appear inconsistent, implementation must pause until the
specification is reconciled. Later placement does not silently override a
higher-precedence rule.

## Traceability requirement

Every future implementation prompt should state:

- the appendix version or baseline version it targets;
- the exact sections in scope;
- the screens, entities, endpoints, and roles affected;
- the acceptance criteria implemented;
- the policy constants required; and
- any explicitly deferred behavior.

Requirements should remain traceable from specification to design, API schema,
data migration, code, tests, and operational controls.

## Cross-appendix reconciliation notes

The following interpretations apply until a formal revision supersedes them:

- Appendix D's singular "Queue Position" ownership language means a one-to-many
  relationship: one Robot Owner may own multiple independent positions, one per
  qualifying downpayment, as required by Appendix A.
- Appendix B's weekly, biweekly, and monthly payout choices define permitted user
  options. Default cadence and processing timing remain Business Rule Constants.
- A user's Appendix D primary persona does not replace Appendix E0's granular
  permissions. Authentication identity, primary persona, organization membership,
  and assigned RBAC permissions are separate concerns.
- Heartbeat requests must satisfy the combined requirements of Appendices A, E0,
  and E. Appendix E's field list is not permission to omit E0's `schemaVersion`,
  `eventId`, signing, timestamp, replay, or idempotency controls.
- Prompt 001's unversioned `/health` and `/ready` routes remain foundation probes.
  Future public API implementation must explicitly decide whether versioned aliases
  are added; probes retain the minimal response exception defined by Appendix E0.

- Appendix J and Appendix A baseline 1.1.0 establish the two-sided fee model:
  Robot Owner gross base pay is $5.00, owner net pay is $4.25 after the 15% fee,
  and Hiring Company subtotal is $5.75 after its separate 15% fee, before taxes
  and other authorized adjustments. Earlier one-sided fee language is superseded.
- Appendix F retry examples and Appendix H notification retry sequences are
  illustrative. Production retry counts, delays, escalation thresholds, and
  retention periods remain approved policy constants rather than code defaults.
- Appendix G is authoritative for named roles and permissions. Appendix E0's
  shorter initial role list is a security-architecture summary, not a restriction
  on Appendix G's more granular role catalog.
- Appendix I pricing copy must follow Appendix J. The phrase "$5 per verified
  operating hour" means gross owner base pay and company base charge, not owner
  net pay or the company's complete cost.

- Appendix K's "multiple positions for one person" fraud signal means unauthorized,
  duplicated, identity-evasive, or policy-violating positions. It does not prohibit
  Appendix A's valid independent position for each qualifying downpayment.
- Appendix L's master lifecycle status is a derived presentation state. Its
  separate registration, ownership, activation, heartbeat, operational,
  assignment, maintenance, compliance, financial, and final-state dimensions are
  authoritative for backend logic, as reinforced by Rule M-027.
- Appendix N's statement that one assignment may contain many robots conflicts
  with its singular `Robot ID` assignment record and Appendices D and L. The
  authoritative interpretation is one robot-specific assignment record per robot,
  with many assignments grouped under one contract or deployment. A future schema
  may introduce an explicit assignment-group entity without merging robot records.
- Appendix N staffing labels `Partially Staffed` and `Fully Staffed` are staffing
  dimensions, not replacements for Appendix A's legal contract lifecycle. Contract
  lifecycle, staffing, approval, and financial states must be modeled separately.
- Appendix N endpoint paths are conceptual requirements. Appendix E remains the
  endpoint catalog, and E0 naming, versioning, authorization, and idempotency rules
  apply before any endpoint is implemented.

## Known future appendices

Appendix N recommends a future **Appendix O - Matching & Marketplace Engine**.
It is not yet part of the authoritative repository specification. Supply allocation,
owner fairness, geographic matching, capability weighting, demand waitlists, and
priority resolution must not be implemented from assumptions while it is pending.
