# Nation Reserve Master Specification

# Volume I — Appendix M

# Expanded Immutable Product Rules

**Version:** 1.0
**Status:** Authoritative Consolidated Business Rules

---

# Purpose

This appendix consolidates the product, financial, operational, security, lifecycle, disclosure, and governance rules that became clear during Appendices B through L.

These rules are considered fixed for the initial RoboWorkPool implementation unless Nation Reserve formally changes them through an approved governance process.

Codex implementation prompts must treat these rules as authoritative.

No screen, API, background job, administrator action, or financial calculation may contradict them.

---

# Rule Classification

Every rule in this appendix belongs to one of four classes.

## Immutable MVP Rule

Must be implemented exactly for the initial product.

## Configurable Operational Rule

May be changed through approved versioned configuration without rewriting core architecture.

## Restricted Administrative Rule

May be overridden only through a controlled audited workflow.

## Future Expansion Rule

Must be preserved architecturally but is not required in the MVP.

---

# 1. Platform Identity

## Rule M-001 — Company and Product

**Class:** Immutable MVP Rule

The legal platform operator is:

**Nation Reserve**

The product is:

**RoboWorkPool**

The official product name must be written consistently as:

**RoboWorkPool**

---

## Rule M-002 — Platform Purpose

**Class:** Immutable MVP Rule

RoboWorkPool is a network for:

- Robot Owners
- Hiring Companies
- Robot Manufacturers
- Platform administrators

Its purpose is to coordinate robot ownership, labor access, verified operating time, billing, payroll, maintenance, and operational accountability.

---

## Rule M-003 — Hiring Companies Do Not Need to Buy Robots

**Class:** Immutable MVP Rule

A Hiring Company may contract for robot labor capacity without purchasing the robots.

The platform must not require robot ownership as a condition of hiring robot labor.

---

# 2. Standard Financial Model

## Rule M-004 — Gross Base Rate

**Class:** Immutable MVP Rule

The gross base operating rate is:

**$5.00 per verified operating hour**

This is the financial basis for both Robot Owner earnings and Hiring Company billing.

---

## Rule M-005 — Owner-Side Platform Fee

**Class:** Immutable MVP Rule

RoboWorkPool deducts a platform fee equal to:

**15% of the Robot Owner’s gross base earnings**

At the initial rate:

```text
Gross base rate:        $5.00 per verified hour
Owner platform fee:     $0.75 per verified hour
Owner net pay:          $4.25 per verified hour
```

This is before taxes, withholding, lawful adjustments, or other separately disclosed items.

---

## Rule M-006 — Company-Side Platform Fee

**Class:** Immutable MVP Rule

RoboWorkPool adds a platform fee equal to:

**15% of the Hiring Company’s base operating charge**

At the initial rate:

```text
Base operating charge:  $5.00 per verified hour
Company platform fee:   $0.75 per verified hour
Company subtotal:       $5.75 per verified hour
```

This is before applicable taxes or separately disclosed approved charges.

---

## Rule M-007 — Two-Sided Fee Disclosure

**Class:** Immutable MVP Rule

The public website is not required to promote both fees together as one marketing statement.

However:

- Robot Owners must receive clear disclosure of their 15% fee before accepting the applicable terms.
- Hiring Companies must receive clear disclosure of their 15% fee before entering a paid contract.
- Payroll records must itemize the owner-side fee.
- Company invoices must itemize the company-side fee.
- Applicable contracts and terms must disclose the relevant fee.
- The platform must not falsely present $5.00 as the Robot Owner’s net pay.
- The platform must not falsely present $5.00 as the Hiring Company’s complete cost.

---

## Rule M-008 — Gross Platform Revenue

**Class:** Immutable MVP Rule

Before expenses, taxes retained for authorities, processor costs, refunds, and reversals, RoboWorkPool earns:

**$1.50 per verified operating hour**

This consists of:

```text
Owner-side platform fee:   $0.75
Company-side platform fee: $0.75
Total platform revenue:    $1.50
```

The $5.00 base operating amount is not itself platform revenue.

---

## Rule M-009 — Partial Hours

**Class:** Immutable MVP Rule

Verified operating time is paid and billed proportionally.

A robot does not need to complete a full hour.

Calculations must use verified seconds or milliseconds and must not round each heartbeat independently.

---

## Rule M-010 — Money Precision

**Class:** Immutable MVP Rule

Financial calculations must use:

- Integer minor units, or
- A decimal money library

Binary floating-point arithmetic must not be used for settlement values.

---

## Rule M-011 — Historical Rate Preservation

**Class:** Immutable MVP Rule

Rate changes must never retroactively alter settled historical transactions.

Every financial interval must retain the rate configuration version that applied when it occurred.

---

# 3. Verified Operating Time

## Rule M-012 — Heartbeat Is Authoritative

**Class:** Immutable MVP Rule

The Heartbeat API is the authoritative source used to establish qualifying robot operating time.

Schedules, workforce plans, manual timesheets, company expectations, or contract estimates do not independently create payable time.

---

## Rule M-013 — No Separate Universal Hardware Device

**Class:** Immutable MVP Rule

RoboWorkPool does not require a separate physical uptime-tracking device as a universal condition.

Approved manufacturers connect robots directly to the Heartbeat API using the platform’s integration requirements.

The architecture may support stronger hardware-backed identity later.

---

## Rule M-014 — Manufacturer Connection Before Shipment

**Class:** Configurable Operational Rule

Where practical, manufacturers should be able to:

- Register the robot
- Configure its API connection
- Validate heartbeat transmission
- Confirm integration readiness

before shipment.

The manufacturer dashboard should show whether each robot is ready for owner activation.

---

## Rule M-015 — Heartbeat Alone Is Not Sufficient

**Class:** Immutable MVP Rule

A heartbeat may contribute to payable time only when all required eligibility conditions are satisfied.

At minimum:

```text
Valid heartbeat
+
Registered robot
+
Verified ownership
+
Approved manufacturer
+
Activated robot
+
Active contract
+
Active assignment
+
Eligible operational state
+
No disqualifying restriction
=
Potentially payable interval
```

---

## Rule M-016 — Invalid Heartbeats Never Create Pay

**Class:** Immutable MVP Rule

The following must not create payable time:

- Invalid signatures
- Replayed messages
- Duplicate messages
- Revoked credentials
- Sandbox traffic
- Retired robot traffic
- Suspended robot traffic
- Unsupported robot identity
- Invalid or disallowed timestamps
- Unresolved serial conflicts

---

## Rule M-017 — Tolerance Is Not Guaranteed Pay

**Class:** Immutable MVP Rule

Heartbeat tolerance exists to account for ordinary network delay.

It must not automatically grant the full tolerance interval after the last valid heartbeat.

The calculation must prevent intentional offline cycling or trailing-gap exploitation.

---

## Rule M-018 — Schedule Correlation

**Class:** Immutable MVP Rule

A schedule may be used to:

- Plan staffing
- Define expected operating windows
- Detect anomalies
- Generate coverage alerts

A schedule must not be used as a substitute for verified heartbeat operation.

---

# 4. Robot Identity and Ownership

## Rule M-019 — Permanent Robot Identity

**Class:** Immutable MVP Rule

Every robot must have a permanent platform-generated Robot ID.

That ID must never be reused.

---

## Rule M-020 — Unique Serial Requirement

**Class:** Immutable MVP Rule

Every robot must have a unique manufacturer-issued serial identifier.

The serial must be visible to authorized Hiring Company users so an inactive robot can be identified physically and reported accurately.

---

## Rule M-021 — Serial Entry Alone Does Not Prove Ownership

**Class:** Immutable MVP Rule

A Robot Owner cannot claim a robot merely by entering a serial number.

Ownership must be supported by an approved claim and verification process.

---

## Rule M-022 — One Authoritative Owner

**Class:** Immutable MVP Rule

A robot may have only one authoritative legal owner at any exact timestamp.

Ownership periods must not overlap.

---

## Rule M-023 — Ownership Effective Timestamp

**Class:** Immutable MVP Rule

Every ownership record must have an exact effective timestamp.

Robot earnings follow the owner of record during each verified interval.

---

## Rule M-024 — Immutable Ownership History

**Class:** Immutable MVP Rule

Ownership history must be append-only.

A transfer closes one ownership period and creates another.

Historical owners must retain access to their own prior statements and records.

---

## Rule M-025 — Maximum Robot Ownership

**Class:** Immutable MVP Rule

A Robot Owner may own no more than:

**20 active robots**

The platform must detect attempts to evade the limit through duplicate or related accounts.

A shared address, device, or bank account is a risk signal, not automatic proof of evasion.

---

# 5. Robot Lifecycle

## Rule M-026 — Registration Before Operation

**Class:** Immutable MVP Rule

A robot must not become operational or payable before:

- Its manufacturer is approved.
- Its model is approved.
- Its serial is registered.
- Its ownership is verified.
- Its activation is complete.

---

## Rule M-027 — Separate State Dimensions

**Class:** Immutable MVP Rule

Robot status must not be represented by one overloaded status field.

At minimum, backend logic must distinguish:

- Registration
- Ownership
- Activation
- Heartbeat
- Operational
- Assignment
- Maintenance
- Compliance
- Financial eligibility
- Final lifecycle state

---

## Rule M-028 — Activation Does Not Create Earnings

**Class:** Immutable MVP Rule

Activation makes a robot eligible for future reservation or assignment.

It does not create payable operating time by itself.

---

## Rule M-029 — Availability Is Not Assignment

**Class:** Immutable MVP Rule

An Available robot is eligible to be considered for work.

Availability does not mean:

- The robot has work.
- The robot is reserved.
- The robot is assigned.
- The robot is payable.
- Earnings are guaranteed.

---

## Rule M-030 — Reservation Is Not Payable

**Class:** Immutable MVP Rule

A reservation temporarily holds robot capacity.

A reservation alone does not create pay or billing.

---

## Rule M-031 — Assignment Is Not Automatically Payable

**Class:** Immutable MVP Rule

An assignment identifies where and when a robot is expected to operate.

Only qualifying verified operating intervals become payable.

---

## Rule M-032 — Maintenance Is Nonpayable

**Class:** Immutable MVP Rule

During confirmed In Maintenance status:

- New operating time is not payable.
- New assignments are blocked.
- Diagnostic heartbeat traffic may continue but remains nonpayable.

---

## Rule M-033 — Return-to-Service Verification

**Class:** Immutable MVP Rule

A user marking maintenance complete does not immediately make the robot payable.

The robot must pass required return-to-service checks.

---

## Rule M-034 — Offline Time

**Class:** Immutable MVP Rule

Once heartbeat continuity is lost beyond the accepted policy:

- New payable intervals stop.
- Prior valid time remains preserved.
- The outage is recorded.
- A later reconnection does not automatically make the entire gap payable.

---

## Rule M-035 — Retirement Is Generally Terminal

**Class:** Immutable MVP Rule

A retired robot cannot:

- Receive new assignments
- Generate payable time
- Be re-registered as a new robot
- Have its historical identity reused

Restoration is allowed only to correct a documented erroneous retirement through a controlled process.

---

## Rule M-036 — Replacement Does Not Merge Identity

**Class:** Immutable MVP Rule

A replacement robot must retain its own:

- Platform Robot ID
- Serial
- Heartbeat history
- Assignment segments
- Payroll source records
- Maintenance records

One robot’s activity must never be moved to another robot’s identity.

---

# 6. Contracts and Assignments

## Rule M-037 — Contracts Require Eligible Companies

**Class:** Immutable MVP Rule

Only verified and eligible Hiring Companies may enter production contracts.

---

## Rule M-038 — Every Active Assignment Requires a Contract

**Class:** Immutable MVP Rule

A production assignment must reference an eligible active contract.

An assignment without a valid contract cannot create payable operation.

---

## Rule M-039 — No Incompatible Overlapping Assignments

**Class:** Immutable MVP Rule

One robot must not have overlapping incompatible active assignments.

The system must enforce this through database and state-transition controls.

---

## Rule M-040 — Retroactive Assignment Restriction

**Class:** Immutable MVP Rule

Creating an assignment retroactively must not automatically convert earlier heartbeat activity into payable time.

Any exceptional correction requires evidence, review, and an audited financial adjustment.

---

## Rule M-041 — Hiring Company Serial Visibility

**Class:** Immutable MVP Rule

Every Hiring Company contract and assignment interface must display the serial identifier of each assigned robot.

This allows the company to identify which physical robot is inactive, damaged, unsafe, or unavailable.

---

## Rule M-042 — Inactive Reporting

**Class:** Immutable MVP Rule

Authorized Hiring Company users must be able to report a specific assigned robot as:

- Inactive
- Missing
- Damaged
- Unsafe
- Unavailable
- Incorrectly assigned
- Incorrect serial

---

## Rule M-043 — Company Reports Do Not Automatically Erase Pay

**Class:** Immutable MVP Rule

A Hiring Company report is evidence, not an automatic financial ruling.

The platform must compare it with:

- Heartbeats
- Operational state
- Manufacturer telemetry
- Maintenance records
- Assignment history
- Other evidence

False or abusive reports may trigger company review.

---

# 7. Workforce Planning and Scheduling

## Rule M-044 — Planning Is Separate From Billing

**Class:** Immutable MVP Rule

Workforce planning and scheduling help companies estimate and organize robot demand.

They are not payroll or billing systems.

---

## Rule M-045 — Active Network Correlation

**Class:** Immutable MVP Rule

During scheduled work, the system should correlate:

- Active schedule
- Active contract
- Active assignment
- Valid network heartbeat
- Eligible robot state
- Inactive reports

This correlation supports operational visibility and fraud detection.

---

## Rule M-046 — Automatic Payroll With Exception Handling

**Class:** Immutable MVP Rule

Payroll should calculate automatically from verified qualifying time.

Manual intervention should be limited to:

- Disputes
- Corrections
- Holds
- Fraud review
- Exceptional approved adjustments

The normal payroll flow must not require manual timesheet approval.

---

# 8. Billing and Payroll Integrity

## Rule M-047 — One Source Calculation

**Class:** Immutable MVP Rule

Invoices, payroll, dashboards, APIs, and reports must derive financial results from the same authoritative calculation service and ledger records.

Independent duplicate formulas are prohibited.

---

## Rule M-048 — Ledger-Based Financial Records

**Class:** Immutable MVP Rule

Financial balances must be derived from ledger entries.

Application code must not directly overwrite settled balances.

---

## Rule M-049 — Settled History Is Immutable

**Class:** Immutable MVP Rule

Settled invoices, payroll, payments, payouts, and platform fees must not be edited in place.

Corrections require linked:

- Credits
- Refunds
- Reversals
- Adjustments
- Recovery records

---

## Rule M-050 — Failed Payouts Remain Owner Liabilities

**Class:** Immutable MVP Rule

When an owner payout fails, the unpaid balance remains owed to the Robot Owner.

It does not become platform revenue.

---

## Rule M-051 — Failed Company Payments Do Not Erase Legitimate Operation

**Class:** Immutable MVP Rule

A later company payment failure must not automatically invalidate legitimate verified operating time.

The platform may apply collection, reserve, restriction, and risk controls.

---

## Rule M-052 — No Silent Processing Fees

**Class:** Immutable MVP Rule

Payment-processing fees must not be silently passed through.

Any passed-through fee must be lawful, disclosed, and separately itemized.

---

## Rule M-053 — Owner Recovery Restrictions

**Class:** Immutable MVP Rule

Money already paid to a Robot Owner must not be silently withdrawn.

Confirmed overpayments require an approved recovery process, such as:

- Future payout offset
- Repayment request
- Contractually permitted reserve deduction
- Fraud recovery
- Administrative write-off

---

# 9. Queue Rules

## Rule M-054 — Queue Is Not an Investment

**Class:** Immutable MVP Rule

The Downpayment Queue must not be described as:

- An investment
- Guaranteed appreciation
- Guaranteed income
- Guaranteed ownership
- Guaranteed delivery

---

## Rule M-055 — Own Position Only

**Class:** Immutable MVP Rule

A queue participant may view:

- Their own position
- Their own payment status
- Their own movement history
- Their own required actions

They must not see other participants’ personal information.

---

## Rule M-056 — Queue Position History

**Class:** Immutable MVP Rule

Queue position must be derived from an auditable queue ledger rather than one freely editable number.

---

## Rule M-057 — Queue Overrides Require Audit

**Class:** Immutable MVP Rule

Manual queue changes require:

- Reason
- Actor
- Previous state
- New state
- Timestamp
- Supporting evidence where applicable

High-impact changes should require dual approval.

---

## Rule M-058 — Queue Position Is Normally Nontransferable

**Class:** Immutable MVP Rule

A queue position may not be transferred or resold unless a future program explicitly authorizes a controlled transfer mechanism.

---

# 10. Manufacturer Rules

## Rule M-059 — Production Approval Required

**Class:** Immutable MVP Rule

Sandbox success does not automatically grant production access.

Manufacturers must complete:

- Business review
- Technical review
- Security review
- Model approval
- Integration testing
- Production approval

---

## Rule M-060 — Separate Environments

**Class:** Immutable MVP Rule

Sandbox and production:

- Credentials
- Data
- Endpoints
- Robot status
- Heartbeats

must remain logically separated.

Sandbox traffic must never create production pay or billing.

---

## Rule M-061 — Manufacturer Credential Security

**Class:** Immutable MVP Rule

Manufacturer credentials must be:

- Scoped
- Rotatable
- Revocable
- Audited
- Environment-specific

Secrets should not be repeatedly displayed in plaintext.

---

## Rule M-062 — Manufacturer Cannot Unilaterally Rewrite Ownership

**Class:** Immutable MVP Rule

After legal ownership has been established, a manufacturer may not unilaterally change the owner through an ordinary manufacturer dashboard action.

Ownership changes require the approved transfer or correction workflow.

---

## Rule M-063 — Narrowest Necessary Suspension

**Class:** Restricted Administrative Rule

When a manufacturer-related issue occurs, the platform should use the narrowest effective restriction:

1. Credential
2. Robot
3. Model
4. Fleet
5. Manufacturer organization

A broader suspension may be used when the risk cannot be safely contained narrowly.

---

# 11. Security and Fraud

## Rule M-064 — No Single Input Creates Pay

**Class:** Immutable MVP Rule

No single user input, administrator field, schedule, or manufacturer message may independently create payable time.

---

## Rule M-065 — Signed Requests

**Class:** Immutable MVP Rule

Production heartbeat requests must use authenticated signing or an equivalent approved integrity mechanism.

---

## Rule M-066 — Replay and Duplicate Protection

**Class:** Immutable MVP Rule

The platform must prevent the same heartbeat or financial source interval from being counted more than once.

---

## Rule M-067 — Sensitive Changes Require Step-Up Security

**Class:** Immutable MVP Rule

High-risk changes require enhanced controls.

Examples:

- Payout account change
- Payment account change
- Production credential rotation
- Ownership transfer
- MFA disablement
- Queue override
- Large refund
- Large adjustment
- Organization administrator creation

---

## Rule M-068 — Administrator Actions Are Not Trusted by Default

**Class:** Immutable MVP Rule

Administrator actions must be:

- Role-restricted
- Validated
- Audited
- Subject to thresholds
- Subject to dual approval where required

Administrators must not have unrestricted direct status or balance editing.

---

## Rule M-069 — Audit Logs Are Append-Only

**Class:** Immutable MVP Rule

Ordinary workflows and administrators must not be able to edit or delete audit events.

Corrections create new linked audit events.

---

## Rule M-070 — Fraud Alerts Are Not Automatic Guilt

**Class:** Immutable MVP Rule

Risk scores and automated alerts create review signals.

They must not automatically be treated as proof of fraud unless a specific deterministic security violation justifies immediate action.

---

## Rule M-071 — Granular Restrictions

**Class:** Immutable MVP Rule

Where safe, restrictions should be narrower than full account closure.

Examples:

- Block payout changes while preserving statement access.
- Suspend one robot rather than all owner robots.
- Revoke one manufacturer key rather than the entire fleet.
- Hold disputed funds while releasing unrelated funds.

---

# 12. Suspension, Holds, and Appeals

## Rule M-072 — Every Material Hold Requires a Record

**Class:** Immutable MVP Rule

A financial or operational hold must identify:

- Subject
- Reason
- Effective time
- Scope
- Review owner
- Review deadline
- Related case
- Resolution

---

## Rule M-073 — Historical Time Is Not Automatically Invalidated

**Class:** Immutable MVP Rule

A suspension normally affects operation from its effective timestamp onward.

It must not automatically erase prior verified time.

---

## Rule M-074 — Material Decisions Require Notice

**Class:** Immutable MVP Rule

Affected users should receive notice of:

- Account suspension
- Robot suspension
- Ownership denial
- Queue removal
- Financial hold
- Payroll adjustment
- Manufacturer restriction
- Contract cancellation

Details may be limited when disclosure would create legal or security risk.

---

## Rule M-075 — Appeal Path

**Class:** Immutable MVP Rule

Users must have a defined appeal process for material platform decisions, subject to legal and security exceptions.

Where practical, the appeal should be reviewed by someone other than the sole original decision-maker.

---

# 13. Notifications

## Rule M-076 — Mandatory and Optional Separation

**Class:** Immutable MVP Rule

The notification system must separate:

- Mandatory system notifications
- Optional preference-based notifications

---

## Rule M-077 — Mandatory In-App Record

**Class:** Immutable MVP Rule

Mandatory notifications must produce an in-app record.

Users may not disable that record.

---

## Rule M-078 — At Least One Verified Channel

**Class:** Immutable MVP Rule

Every active user must maintain at least one verified delivery channel for mandatory notices.

At minimum:

- Verified email

Certain roles may require additional operational, billing, or security contacts.

---

## Rule M-079 — Deduplication

**Class:** Immutable MVP Rule

Ongoing unresolved conditions must not generate identical messages at every system interval.

Notifications should use incident-based deduplication and controlled escalation.

---

## Rule M-080 — No Sensitive Data in Previews

**Class:** Immutable MVP Rule

Notifications must not expose:

- API secrets
- Full tax identifiers
- Full bank information
- Identity documents
- Password reset secrets
- Confidential diagnostics beyond recipient authority

---

# 14. Public Website and Disclosure

## Rule M-081 — No Guaranteed Earnings Claims

**Class:** Immutable MVP Rule

The public website must not state or imply:

- Guaranteed income
- Guaranteed utilization
- Risk-free ownership
- Guaranteed queue fulfillment
- Guaranteed robot performance
- Guaranteed hiring capacity

---

## Rule M-082 — Accurate Rate Language

**Class:** Immutable MVP Rule

Public messaging may prominently reference:

**$5 per verified operating hour**

But linked disclosures must make clear whether the amount is:

- Gross owner compensation basis
- Company base operating charge
- Before applicable platform fees

---

## Rule M-083 — Heartbeat Limitations

**Class:** Immutable MVP Rule

The website must not imply that heartbeat connectivity alone proves:

- Work quality
- Task completion
- Safety compliance
- Correct physical location
- Contract eligibility
- Payability

---

## Rule M-084 — No Placeholder Production Statistics

**Class:** Immutable MVP Rule

Public platform statistics must be current, defined, and validated.

Placeholder or fabricated statistics must not appear in production.

---

## Rule M-085 — Role-Specific Registration

**Class:** Immutable MVP Rule

Registration must distinguish:

- Robot Owner
- Hiring Company
- Manufacturer

Users must have a correction path if they select the wrong role.

---

# 15. Permissions and Data Ownership

## Rule M-086 — Backend Authorization

**Class:** Immutable MVP Rule

UI visibility is not an authorization control.

All access must be enforced by the backend.

---

## Rule M-087 — Organization Role Separation

**Class:** Immutable MVP Rule

Platform roles and organization roles must remain separate.

A company administrator is not a platform administrator.

A manufacturer administrator is not a platform administrator.

---

## Rule M-088 — Single Authoritative Resource Owner

**Class:** Immutable MVP Rule

Every owned resource must have one authoritative owner or owning organization.

Shared access is provided through permissions, not ambiguous ownership.

---

## Rule M-089 — Historical Record Preservation

**Class:** Immutable MVP Rule

Deletion of a user or organization must not delete required:

- Financial history
- Ownership history
- Heartbeat evidence
- Audit logs
- Contract records
- Assignment records
- Maintenance records

---

# 16. API and Event Architecture

## Rule M-090 — Versioned API

**Class:** Immutable MVP Rule

Production API routes must be versioned.

Initial version:

```text
/api/v1
```

---

## Rule M-091 — API Classification

**Class:** Immutable MVP Rule

The architecture must distinguish:

- Public API
- Client API
- Manufacturer API
- Internal Service API
- Future Partner API

---

## Rule M-092 — Event-Driven Side Effects

**Class:** Immutable MVP Rule

Business services should emit events rather than directly embedding unrelated notification, analytics, or integration logic.

---

## Rule M-093 — Event Idempotency

**Class:** Immutable MVP Rule

Event consumers must be idempotent.

Retries must not create duplicate financial, notification, or state-transition results.

---

## Rule M-094 — Transactional Outbox

**Class:** Immutable MVP Rule

Business changes that require event publication should use an outbox or equivalent reliable publication mechanism.

A committed business change must not be lost because event delivery temporarily fails.

---

# 17. Failure Safety

## Rule M-095 — Signature Verification Failure

**Class:** Immutable MVP Rule

When production heartbeat signature verification is unavailable or fails, the platform must not accept new payable heartbeat activity.

---

## Rule M-096 — Audit Failure

**Class:** Immutable MVP Rule

When required audit logging is unavailable, sensitive administrative or financial actions must be blocked.

---

## Rule M-097 — Financial Service Failure

**Class:** Immutable MVP Rule

When payment or payout providers are unavailable:

- Source balances remain preserved.
- Operations must not fabricate a success.
- Retries and reconciliation must occur.
- Users must see accurate pending or failed status.

---

## Rule M-098 — Verification Service Failure

**Class:** Immutable MVP Rule

When identity, ownership, or manufacturer verification is unavailable, the relevant application or transition remains pending.

It must not be silently approved.

---

## Rule M-099 — Read-Only Degradation

**Class:** Configurable Operational Rule

When safe, read-only access should remain available during partial outages even when sensitive writes are blocked.

---

# 18. Administrative Configuration

## Rule M-100 — Versioned Configuration

**Class:** Immutable MVP Rule

Configurable business values must be versioned and audited.

Examples:

- Base rate
- Platform fee rates
- Heartbeat tolerance
- Billing period
- Payout threshold
- Queue program rules
- Adjustment approval thresholds
- Notification escalation thresholds

---

## Rule M-101 — Configuration Effective Dates

**Class:** Immutable MVP Rule

A financial or operational configuration change must have:

- Version
- Effective date
- Approver
- Audit record
- Applicability rules

---

## Rule M-102 — No Arbitrary State Editing

**Class:** Immutable MVP Rule

Administrators must use controlled commands and workflows.

They must not directly type arbitrary values into:

- Robot lifecycle states
- Ownership
- Queue positions
- Financial balances
- Settled records
- Audit history

---

# 19. Data Retention and Deletion

## Rule M-103 — Robot Record Preservation

**Class:** Immutable MVP Rule

A robot record must not be physically deleted after it has any material historical activity.

It may be archived.

---

## Rule M-104 — Evidence Integrity

**Class:** Immutable MVP Rule

Original investigation and security evidence must be preserved separately from analyst notes.

Original evidence must not be edited in place.

---

## Rule M-105 — Configurable Retention by Data Class

**Class:** Configurable Operational Rule

Retention periods must be configurable by:

- Jurisdiction
- Data class
- Financial requirement
- Security requirement
- Contract requirement
- Legal hold

---

# 20. Future-Compatible Rules

## Rule M-106 — Device-Level Cryptographic Identity

**Class:** Future Expansion Rule

The architecture should permit future use of:

- Device certificates
- Hardware-backed keys
- Secure elements
- Manufacturer provisioning authorities

without changing the core robot identity model.

---

## Rule M-107 — Location Verification

**Class:** Future Expansion Rule

The architecture should permit optional location verification for contracts that require it.

Location is not a universal MVP requirement.

---

## Rule M-108 — Multi-Currency

**Class:** Future Expansion Rule

The MVP uses USD.

All financial records must still store currency explicitly so multi-currency support can be introduced later.

---

## Rule M-109 — Enterprise Roles

**Class:** Future Expansion Rule

The role system should support future custom enterprise roles and delegated permissions without weakening backend authorization.

---

## Rule M-110 — Partner API

**Class:** Future Expansion Rule

The API architecture should permit a future controlled Partner API without exposing internal service credentials or bypassing product rules.

---

# Immutable Rule Enforcement

The implementation must enforce immutable rules through multiple layers where appropriate:

- Database constraints
- Unique indexes
- State-transition guards
- Authorization middleware
- Configuration services
- Financial calculation services
- Ledger controls
- API validation
- Event consumers
- Automated tests
- Audit logging

Important rules must not exist only as comments or UI text.

---

# Rule Conflict Resolution

When implementation requirements appear to conflict, the following precedence applies:

1. Applicable law and binding contractual obligations
2. Current approved immutable business rules
3. Current approved financial configuration
4. Current approved security and fraud policy
5. Current contract-specific rules
6. Operational configuration
7. UI convenience
8. Developer implementation preference

A lower-priority rule must not override a higher-priority rule.

---

# Change-Control Process

A proposed immutable-rule change should require:

1. Written change request
2. Business impact analysis
3. Legal or compliance review where applicable
4. Financial impact analysis
5. Security review
6. Data-migration review
7. Approval by an authorized Nation Reserve decision-maker
8. Effective date
9. Version update
10. Updated tests
11. Updated documentation
12. User notice where required

---

# Required Rule Registry

The implementation should maintain a rule registry containing:

```text
Rule ID
Rule Name
Rule Class
Current Version
Effective Date
Status
Owning Domain
Implementation References
Test References
Approval Reference
Replaced Rule, if applicable
```

This registry may be represented in documentation, configuration metadata, or a dedicated administrative record.

---

# Required Implementation Traceability

Every Codex implementation prompt involving business logic should identify the relevant rule IDs.

Example:

```text
Implements:
- M-004 Gross Base Rate
- M-005 Owner-Side Platform Fee
- M-006 Company-Side Platform Fee
- M-012 Heartbeat Is Authoritative
- M-047 One Source Calculation
```

This creates traceability between:

- Product specification
- Code
- Automated tests
- Administrative controls
- Future audits

---

# Required Automated Rule Tests

At minimum, the implementation must include tests proving:

- A schedule alone cannot create pay.
- A valid heartbeat without an assignment cannot create pay.
- An assignment without a valid heartbeat cannot create pay.
- A suspended robot cannot create new payable time.
- A retired robot cannot be assigned.
- Duplicate heartbeat messages do not duplicate time.
- One robot cannot have overlapping incompatible assignments.
- One robot cannot have two owners at the same timestamp.
- A Robot Owner cannot exceed 20 active robots.
- Owner net pay is calculated from the $5.00 gross base rate less 15%.
- Company charges use the $5.00 base rate plus 15%.
- Historical rate versions remain unchanged.
- Settled ledger entries cannot be edited.
- Failed payouts remain payable liabilities.
- Queue changes produce history.
- Sensitive administrator actions produce audit events.
- Manufacturer sandbox traffic cannot create production pay.
- Maintenance completion does not bypass return-to-service verification.
- Company inactive reports do not automatically erase valid time.
- Unauthorized users cannot access another organization’s resources.
- Audit failure blocks sensitive changes.

---

# Acceptance Criteria

This appendix is complete when:

- All major rules discovered during Appendices B through L are consolidated.
- Every rule has a stable identifier.
- Financial, heartbeat, ownership, lifecycle, queue, manufacturer, security, notification, disclosure, and administrative rules are represented.
- Immutable rules are distinguishable from configurable and future rules.
- Rule precedence and change control are defined.
- Codex prompts can cite exact rule IDs.
- Automated tests can be mapped to the business specification.
- No major implementation decision remains dependent on undocumented assumptions.

# Volume I Completion Status

With Appendix M completed, Volume I now contains:

- Foundation
- Immutable Product Rules
- User Journeys
- Screen Inventory
- Data Ownership
- API Contracts
- Event Catalog
- Roles and Permissions
- Notification Catalog
- Website Specification
- Billing Mathematics
- Fraud Prevention
- Robot Lifecycle
- Expanded Immutable Rules

# Recommended Next Section

# Volume II — Appendix N — Contract and Assignment Rules

This section should define the exact contract lifecycle, workforce request structure, assignment matching, scheduling behavior, company approval controls, cancellation rules, replacement handling, and contract completion criteria before Codex implementation resumes.
