# Nation Reserve Master Specification

# Volume I — Appendix K

# Fraud Prevention & Trust Systems

**Version:** 1.0
**Status:** Authoritative Fraud, Abuse, and Investigation Specification

---

# Purpose

This appendix defines how RoboWorkPool prevents, detects, investigates, and responds to fraud, abuse, manipulation, and unauthorized activity.

The fraud-prevention system must protect:

- Robot Owners
- Hiring Companies
- Manufacturers
- Nation Reserve
- Financial providers
- Platform data
- The integrity of verified operating time

The platform must make fraud difficult without requiring a separate physical tracking device for every robot.

The manufacturer integration and Heartbeat API remain the primary method for proving robot connectivity and qualifying operating time.

---

# Core Trust Principle

No single user-entered field should be sufficient to create payable operating time.

Payable time must be supported by multiple correlated records, including:

- Registered robot identity
- Unique serial identifier
- Approved manufacturer identity
- Valid API authentication
- Signed heartbeat messages
- Monotonic sequence or event identifiers
- Active contract
- Active assignment
- Eligible robot state
- Valid time window
- Network continuity
- Absence of disqualifying events

The Heartbeat API is authoritative for operating-time verification, but heartbeat records must still pass fraud and eligibility controls.

---

# Fraud-Control Philosophy

RoboWorkPool should use layered controls:

1. Prevent invalid activity before acceptance.
2. Detect suspicious patterns during operation.
3. Limit financial exposure while an issue is unresolved.
4. Preserve evidence.
5. Apply proportionate restrictions.
6. Provide review and appeal processes.
7. Correct financial records through audited adjustments.

The system should not rely on one universal fraud score.

Different fraud categories require different evidence and response rules.

---

# Fraud Categories

The platform must address:

- Identity fraud
- Organization fraud
- Robot ownership fraud
- Robot identity and serial fraud
- Manufacturer fraud
- Heartbeat and uptime fraud
- Contract fraud
- Assignment fraud
- Hiring Company reporting abuse
- Queue manipulation
- Billing fraud
- Payment fraud
- Payroll fraud
- Maintenance fraud
- Account takeover
- API abuse
- Administrative abuse
- Collusion
- Document fraud
- Referral or promotional abuse, if introduced later

---

# Risk Levels

## Low Risk

Examples:

- Minor profile mismatch
- One failed payment
- Occasional delayed heartbeat
- Accidental duplicate API request
- Unusual but explainable login

Possible response:

- Additional validation
- Warning
- Temporary monitoring
- User correction request

---

## Medium Risk

Examples:

- Repeated serial registration failures
- Repeated invalid heartbeats
- Frequent payout-account changes
- Unusual queue activity
- Conflicting ownership information
- Multiple suspicious devices

Possible response:

- Step-up verification
- Temporary financial hold
- Restricted action
- Manual review

---

## High Risk

Examples:

- Fabricated heartbeat activity
- Duplicate serial use
- Account takeover indicators
- Identity or document fraud
- Unauthorized production API use
- Coordinated billing abuse
- Manipulation of payable hours
- Suspicious administrator override

Possible response:

- Immediate suspension
- Credential revocation
- Payout or payment hold
- Contract restriction
- Formal investigation

---

## Critical Risk

Examples:

- Widespread fraudulent uptime
- Compromised manufacturer credentials affecting a fleet
- Internal administrator abuse
- Organized payment fraud
- Deliberate ledger manipulation
- Security incident threatening platform-wide integrity

Possible response:

- Emergency containment
- Fleet or service shutdown
- Global credential rotation
- Financial settlement freeze
- Security and legal escalation
- Mandatory incident review

---

# Identity Fraud Prevention

Robot Owners, company representatives, manufacturers, and privileged administrators must complete verification appropriate to their role and risk level.

Potential controls include:

- Email verification
- Phone verification
- Identity verification
- Business verification
- Beneficial-owner verification where required
- Tax information verification
- Bank-account ownership verification
- Sanctions or compliance screening where applicable
- Device and session risk analysis
- Document authenticity checks

Identity verification must not be treated as permanent proof that every future action is legitimate.

High-risk changes should require renewed verification.

---

# High-Risk Account Changes

The following actions should trigger step-up authentication or review:

- Changing legal name
- Changing ownership entity
- Changing payout bank account
- Changing company payment account
- Changing tax information
- Transferring robot ownership
- Rotating production API credentials
- Adding a new organization administrator
- Disabling MFA
- Changing security contact
- Requesting a large refund
- Modifying queue position
- Creating a large financial adjustment

Controls may include:

- Password confirmation
- MFA
- Email confirmation
- Cooling-off period
- Previous-contact notification
- Manual review
- Dual approval

---

# Organization Fraud Prevention

Hiring Companies and manufacturers must be verified as legitimate organizations before receiving full production access.

Checks may include:

- Legal company name
- Registration number
- Tax identifier
- Address
- Domain ownership
- Authorized representative
- Beneficial owners where required
- Operating history
- Business purpose
- Industry
- Payment risk
- Technical integration legitimacy

A public website or company email address alone is not sufficient verification.

---

# Robot Ownership Fraud

A Robot Owner must not be able to claim a robot solely by entering a serial number.

Ownership verification should use a combination of:

- Manufacturer registration record
- Purchase or transfer record
- Delivery confirmation
- Manufacturer ownership assignment
- Secure activation code
- Existing owner approval
- Administrator review where necessary

A robot must have one authoritative legal owner at a given timestamp.

Disputes may temporarily lock transfer and payout actions.

---

# Duplicate Serial Prevention

Each robot must have a unique manufacturer-scoped and platform-wide identifier.

The platform should track:

- Manufacturer ID
- Model ID
- Manufacturer serial
- Platform robot ID
- Hardware identity or device key where available
- Ownership history
- Activation history

Duplicate serial behavior must trigger investigation.

Examples:

- Same serial submitted by multiple owners
- Same serial active from incompatible locations
- Same serial sending from multiple credentials
- Same serial registered under different manufacturers
- Recycled serial without approved retirement and reissuance process

A duplicate serial should not automatically create a second robot record.

---

# Robot Identity Binding

During production activation, the platform should bind a robot to approved credentials or cryptographic identity where supported.

Possible mechanisms include:

- Manufacturer-issued device certificate
- Device-specific private key
- Hardware-backed key
- Signed provisioning token
- One-time activation challenge
- Manufacturer-confirmed device registration

The MVP should support secure manufacturer-level authentication even when device-level keys are not universally available.

The architecture should permit stronger device identity later without redesigning the robot model.

---

# Manufacturer Approval Controls

A manufacturer must complete:

- Business approval
- Technical review
- Security review
- Sandbox testing
- Robot model registration
- Heartbeat conformance testing
- Incident-contact setup
- Production approval

Production access must not be granted solely because sandbox requests succeed.

---

# Manufacturer Credential Security

Manufacturer API credentials must be:

- Unique per environment
- Stored securely
- Rotatable
- Revocable
- Scoped
- Audited
- Restricted by permitted actions
- Protected from plaintext display after initial issuance where practical

Production and sandbox credentials must never be interchangeable.

The platform should support credential overlap during controlled rotation.

---

# Signed Heartbeat Requests

Heartbeat requests should use authenticated signing.

A signed request should incorporate at least:

- HTTP method
- Request path
- Request timestamp
- Request body digest
- Manufacturer credential identifier
- Nonce or sequence value where applicable

The server must verify:

- Signature validity
- Credential status
- Timestamp tolerance
- Payload integrity
- Environment
- Manufacturer authorization
- Robot registration
- Replay status

Invalid signatures must never create payable time.

---

# Replay Prevention

The platform must reject or safely deduplicate replayed heartbeat requests.

Replay detection may use:

- Event ID
- Nonce
- Robot sequence number
- Manufacturer message ID
- Timestamp
- Payload hash
- Idempotency key

A valid retry of the same original heartbeat must not create additional operating time.

---

# Sequence Validation

Where manufacturer integrations support sequence numbers, each robot should send a monotonic sequence.

The system should detect:

- Duplicate sequence
- Sequence rollback
- Large unexplained jump
- Multiple sequences from separate sources
- Reuse after credential change
- Reset without approved device restart or firmware event

A sequence reset may be legitimate after certain events but must be recorded and validated.

---

# Timestamp Validation

Heartbeat timestamps should be evaluated against:

- Server receipt time
- Permitted clock skew
- Last accepted robot timestamp
- Contract window
- Assignment window
- Robot state history

The system must reject or quarantine timestamps that are:

- Unreasonably old
- Too far in the future
- Out of sequence
- Incompatible with prior records
- Repeated across suspicious intervals

Backdated heartbeat uploads should not create automatic payable time unless an explicitly approved recovery process exists.

---

# False Uptime Prevention

A network connection alone does not prove that a robot is performing valid work.

RoboWorkPool should distinguish:

- Connected
- Operational
- Assigned
- Payable
- Suspended
- In maintenance
- Offline
- Retired

To contribute to payable time, the robot must satisfy all required states.

At minimum:

```text
Valid heartbeat
+
Active robot
+
Active assignment
+
Active contract
+
Eligible operating state
+
Allowed time window
=
Potentially payable interval
```

The platform must not credit time merely because a device continues sending background network requests.

---

# Operational State Signals

Manufacturers should provide a standardized operating state when technically possible.

Examples:

- Idle and available
- Assigned and active
- Working
- Paused
- Charging
- Maintenance
- Faulted
- Emergency stopped
- Offline

The financial rules must define which states are payable.

An ambiguous or unknown state should not automatically be considered payable.

---

# Schedule Correlation

Schedules are not the authoritative source of payment, but they should be used as a fraud-detection signal.

The system should compare:

- Scheduled assignment window
- Contract window
- Heartbeat activity
- Reported inactivity
- Robot state
- Facility
- Serial identifier

Examples of suspicious activity:

- Heartbeats continuing long after a contract ends
- Payable activity before assignment begins
- Multiple overlapping assignments for one robot
- One robot appearing active for incompatible companies
- Continuous 24-hour activity without expected charging or maintenance patterns

Such patterns should trigger review rather than automatic guilt.

---

# Location Correlation

Location verification is optional unless required by the contract, robot type, or future policy.

When available, location may come from:

- Robot GPS
- Facility network
- Manufacturer telemetry
- Authorized company confirmation
- Geofenced assignment location

Location must not be treated as perfectly accurate.

The system should consider:

- GPS error
- Indoor positioning limitations
- Network routing
- VPNs
- Manufacturer architecture
- Privacy requirements

Impossible travel or simultaneous incompatible locations should raise risk.

---

# Network Correlation

The platform may evaluate technical metadata such as:

- Source IP
- Autonomous system
- Certificate identity
- Request latency
- Device fingerprint
- Manufacturer gateway
- Request pattern
- Region

These signals may identify anomalies but should not independently determine financial guilt.

A manufacturer may legitimately route an entire fleet through a central gateway.

---

# Heartbeat Fraud Patterns

The fraud engine should identify patterns such as:

- Perfectly periodic fabricated heartbeats
- Identical payloads across many robots
- Impossible uptime
- Duplicate event identifiers
- Shared serial identifiers
- Heartbeats after retirement
- Heartbeats during maintenance
- Heartbeats during suspension
- Heartbeats from revoked credentials
- Timestamp manipulation
- Sudden unexplained fleet-wide activity
- Unusual sequence resets
- Robot state inconsistent with assignment
- Frequent offline and online cycling intended to exploit tolerance
- Heartbeats continuing after a company reports a physical shutdown

---

# Tolerance Abuse Prevention

The heartbeat tolerance window must not be exploitable as guaranteed payable time.

The platform should avoid automatically granting the full tolerance period after every last heartbeat.

Possible calculation rules include:

- Pay only through the latest verified point.
- Use a limited continuity interval based on surrounding valid heartbeats.
- Exclude final trailing tolerance after confirmed disconnect.
- Cap recoverable gaps.
- Require valid pre-gap and post-gap signals.

The exact algorithm must be tested against legitimate network interruptions and intentional heartbeat cycling.

---

# Contract Fraud Prevention

Potential contract fraud includes:

- Fake companies creating contracts
- Contracts for nonexistent facilities
- Unauthorized company employees approving contracts
- Hidden self-dealing
- Manipulated dates
- Duplicate contracts
- Capacity requests intended to block competitors
- Contract creation without payment capacity
- Collusion between company and owner

Controls should include:

- Company verification
- Role checks
- Approval thresholds
- Facility validation
- Payment-method validation
- Capacity limits
- Duplicate detection
- Contract versioning
- Audit logs
- Conflict-of-interest review where necessary

---

# Assignment Fraud Prevention

A robot should not be simultaneously assigned to incompatible active work.

The system must detect:

- Overlapping assignments
- Assignment without active contract
- Assignment to suspended robot
- Assignment after ownership transfer
- Assignment while under maintenance
- Assignment beyond manufacturer capability restrictions
- Manual assignment by unauthorized user
- Retroactive assignment intended to claim prior heartbeat time

Retroactive assignments must not automatically make previous heartbeat time payable.

---

# Hiring Company Inactive Reports

Hiring Companies must be able to report a robot as:

- Inactive
- Missing
- Damaged
- Unsafe
- Unavailable
- Incorrect serial
- Incorrect assignment

Each contract should display the unique serial identifier of every assigned robot so the company can identify the affected unit.

An inactive report should include:

- Robot serial
- Assignment
- Reporter
- Timestamp
- Reason
- Optional description
- Optional evidence
- Whether an emergency stop is requested

The report should immediately flag the related time for review.

---

# Preventing Abuse of Inactive Reports

A company report should not automatically erase valid payable time.

The system must compare the report against:

- Heartbeat history
- Robot state
- Other personnel reports
- Maintenance records
- Facility evidence
- Manufacturer telemetry
- Prior reporting patterns

Repeated false reports by a Hiring Company may trigger:

- Warning
- Restricted reporting privileges
- Billing review
- Account investigation
- Contract suspension

Robot Owners must be protected from companies using false reports to avoid payment.

---

# Company Confirmation Workflow

For certain contracts, the platform may allow a company to confirm exceptions such as:

- Robot physically inactive despite heartbeat
- Robot present but not performing assigned function
- Robot removed early
- Incorrect robot delivered
- Safety shutdown

Company confirmation is supplementary evidence.

It must not replace the heartbeat system as the standard source of operating-time calculation.

---

# Queue Manipulation Prevention

Potential queue fraud includes:

- Duplicate accounts
- False identity
- Multiple positions for one person
- Payment reversals after securing position
- Unauthorized position changes
- Insider manipulation
- Transfer or resale of positions
- Bot-based signups
- Collusive referral abuse

Controls should include:

- Identity verification
- Payment confirmation
- Duplicate detection
- Position-history ledger
- Administrative reason codes
- Dual approval for sensitive overrides
- Nontransferability enforcement
- Audit records
- Bot protection
- Payment chargeback monitoring

---

# Queue Position Integrity

Queue positions must not be stored as an easily editable number without history.

The platform should maintain a queue ledger recording:

- Join event
- Program
- Initial position
- Payment status
- Eligibility state
- Movement event
- Pause event
- Removal event
- Fulfillment event
- Administrative correction
- Responsible actor
- Reason

A visible position may be calculated from the queue ledger and active eligibility rules.

---

# Queue Administrative Overrides

An administrator may modify queue status only through a controlled workflow.

Required fields:

- Affected user
- Queue program
- Previous state
- New state
- Reason code
- Written justification
- Supporting evidence where applicable
- Approver
- Timestamp

High-impact changes should require dual approval.

Users affected by material changes should receive notification unless restricted for legal or security reasons.

---

# Payment Fraud Prevention

Payment controls should address:

- Stolen payment methods
- Account takeover
- Chargeback abuse
- Friendly fraud
- Synthetic identities
- Repeated failed payments
- Unusual payment velocity
- Mismatched billing identity
- High-risk geography
- Split payment attempts
- Refund abuse

The platform should use payment-provider fraud tools but must not depend on them exclusively.

---

# Company Payment Risk

Hiring Companies may be assigned risk controls such as:

- Spending limit
- Prefunding requirement
- Deposit requirement
- Payment method restrictions
- Invoice terms
- Credit limit
- Reserve
- Delayed capacity expansion
- Manual approval for large contracts

Verified robot operation should not substantially exceed secured or approved company payment exposure without risk authorization.

---

# Payroll Fraud Prevention

Potential payroll fraud includes:

- Fake Robot Owner identity
- Payout account substitution
- Owner claiming another person's robot
- Duplicate ownership
- Artificial uptime
- Collusion
- Multiple payouts for the same interval
- Retroactive ownership manipulation
- Unauthorized payroll adjustment

Controls should include:

- Verified ownership
- Verified payout account
- One payable owner per robot per interval
- Idempotent payroll generation
- Ledger-based balances
- Step-up verification for bank changes
- Cooling-off period after payout changes
- Adjustment approval limits
- Duplicate interval prevention

---

# Payout Account Changes

A payout account change should trigger:

- MFA
- Confirmation through an existing verified channel
- New account verification
- Temporary hold where risk warrants
- Notification to previous contact channels
- Audit record

High-value pending payouts may require manual review after a recent bank-account change.

---

# Owner Limit Enforcement

The maximum of 20 active robots per owner must be enforced across related accounts and organizations.

The platform should detect possible attempts to bypass the limit using:

- Duplicate identities
- Shared tax information
- Shared bank accounts
- Shared addresses
- Shared devices
- Related organizations
- Coordinated ownership transfers

Shared information is a risk signal, not automatic proof of fraud.

Legitimate organizations may share contacts or infrastructure.

---

# Maintenance Fraud

Potential maintenance abuse includes:

- False maintenance claim to stop an assignment
- Concealing a fault while claiming payable operation
- Fake repair completion
- Repeated maintenance cycling
- Backdated maintenance records
- Manufacturer or owner collusion

Maintenance records should include:

- Request source
- Robot
- Reason
- Start time
- Status history
- Service provider
- Evidence
- Completion verification
- Return-to-service checks

A robot should not return to payable status solely because a user clicks “completed.”

---

# Return-to-Service Verification

After maintenance, activation may require:

- Valid heartbeat
- Diagnostic success
- Manufacturer confirmation
- Safety confirmation
- Assignment eligibility check
- Company acceptance where applicable

The return-to-service event must be timestamped and audited.

---

# Document Fraud

Documents may include:

- Identity documents
- Company registration
- Proof of ownership
- Purchase records
- Tax records
- Bank verification
- Manufacturer certifications
- Maintenance records

Controls may include:

- File authenticity analysis
- Metadata review
- Duplicate-document detection
- Expiration tracking
- Issuer verification
- Manual review
- Secure storage
- Hashing
- Access logging

Documents must not be altered after approval without preserving prior versions.

---

# Account Takeover Prevention

The platform should use:

- MFA
- Secure password storage
- Rate limiting
- Suspicious-login detection
- Device and session management
- Session revocation
- Credential-breach screening where permitted
- Login notifications
- Step-up authentication
- Recovery protections

Account recovery must not be weaker than normal authentication.

---

# Session Risk

A session may be challenged or terminated when:

- Device changes unexpectedly
- Location changes impossibly
- Privileged action is attempted
- Password was recently reset
- MFA was disabled
- Session token appears reused
- Known compromise indicators are detected

---

# API Abuse Prevention

API protections should include:

- Authentication
- Request signing
- Rate limiting
- Payload-size limits
- Schema validation
- Timestamp validation
- Replay protection
- Idempotency
- IP and network monitoring
- Credential scoping
- Credential rotation
- Audit logging
- Abuse detection

Error responses should avoid exposing sensitive validation details that help an attacker bypass controls.

---

# Rate-Limit Abuse

The platform should distinguish:

- Accidental integration bursts
- Legitimate large fleets
- Retry storms
- Misconfigured clients
- Credential compromise
- Intentional denial-of-service activity

Manufacturer limits may be fleet-aware and contractually assigned.

Repeated excessive traffic may trigger temporary throttling, credential restriction, or emergency revocation.

---

# Administrative Abuse Prevention

Privileged users must not be trusted without control.

Risks include:

- Queue manipulation
- Financial adjustment abuse
- Unauthorized suspension
- Unauthorized access
- Favoritism
- Audit deletion attempts
- Credential misuse
- Contract override abuse

Controls should include:

- Least privilege
- Separate administrator roles
- MFA
- Device restrictions
- Approval thresholds
- Dual control
- Immutable audit logs
- Session recording or enhanced logging for sensitive workflows
- Periodic access review
- Temporary privileged access
- Automatic expiration

---

# Dual Approval

The following actions should support or require two authorized approvers above configured thresholds:

- Large refunds
- Large payroll adjustments
- Queue priority overrides
- Ownership correction without ordinary transfer
- Manufacturer production approval
- Emergency credential restoration
- Deletion of a nonfinancial user resource with legal implications
- High-impact contract override
- Release of a significant financial hold

The requester should not be able to serve as the sole approver.

---

# Audit-Log Protection

Audit logs must be append-only from ordinary application workflows.

Administrators must not be able to:

- Edit an audit event
- Delete an event
- Replace an actor
- Change a timestamp
- Remove historical evidence

Corrections should create new linked audit events.

Audit-log storage should use integrity protections such as:

- Hash chaining
- Immutable storage
- Restricted write service
- Retention locks
- External archival

---

# Collusion Detection

Potential collusion may involve:

- Robot Owner and Hiring Company
- Robot Owner and manufacturer employee
- Company employee and administrator
- Manufacturer and multiple owners
- Multiple controlled accounts

Signals may include:

- Repeated counterparties
- Unusual operating patterns
- Shared payment information
- Shared devices
- Coordinated disputes
- Repeated manual adjustments
- Impossible robot activity
- Queue favoritism
- Unusual administrator interaction

Automated detection should create investigation leads, not automatic conclusions.

---

# Fraud Scoring

The platform may assign risk scores to:

- Accounts
- Organizations
- Robots
- Manufacturers
- Contracts
- Payments
- Payouts
- API credentials
- Sessions

Risk scores should be explainable through reason codes.

Example reason codes:

```text
DUPLICATE_SERIAL
INVALID_SIGNATURE_SPIKE
IMPOSSIBLE_LOCATION
RECENT_PAYOUT_CHANGE
OVERLAPPING_ASSIGNMENTS
UNUSUAL_HEARTBEAT_PATTERN
QUEUE_OVERRIDE
PAYMENT_CHARGEBACK_HISTORY
ACCOUNT_TAKEOVER_RISK
```

A user-facing denial should provide an appropriate explanation without exposing detection methods that enable evasion.

---

# Automated Actions

The platform may automatically:

- Reject invalid API requests
- Deduplicate heartbeat records
- Require MFA
- Limit transaction size
- Hold a payout
- Pause a contract
- Suspend a robot
- Revoke a credential
- Block an account
- Create an investigation
- Notify security personnel

Automated actions should be proportionate and reversible where possible.

---

# Financial Holds

A hold may apply to:

- Owner payout
- Company refund
- Queue refund
- Manufacturer settlement, if introduced
- Disputed invoice amount

A hold must record:

- Amount
- Currency
- Reason
- Start time
- Review deadline
- Responsible team
- Related investigation
- Release or resolution event

Unrelated undisputed funds should not be held without justification.

---

# Robot Suspension

A robot may be suspended for:

- Identity conflict
- Duplicate serial
- Invalid heartbeat activity
- Safety report
- Maintenance issue
- Ownership dispute
- Manufacturer suspension
- Contract abuse
- Security incident

Suspension prevents new payable operation after the effective time unless a specific exception is approved.

Historical valid time must not be erased automatically.

---

# Manufacturer Suspension

Manufacturer suspension levels may include:

## Credential Suspension

Specific key disabled.

## Model Suspension

One robot model blocked.

## Fleet Suspension

All manufacturer robots restricted.

## Organization Suspension

All manufacturer access disabled.

The platform should choose the narrowest effective action unless risk requires broader containment.

---

# Account Suspension

Account status may include:

- Active
- Restricted
- Verification Required
- Financial Hold
- Suspended
- Closed
- Banned

Restrictions should be granular where possible.

For example, a user may retain read access to statements while payout changes are blocked.

---

# Investigation Case

Each suspected fraud matter should create an investigation case containing:

```text
Case ID
Case Type
Risk Level
Status
Subject Users
Subject Organizations
Subject Robots
Related Contracts
Related Payments
Related Payroll
Related Heartbeats
Reason Codes
Evidence
Assigned Investigator
Created Timestamp
Review Deadline
Actions Taken
Communications
Decision
Appeal Status
Audit References
```

---

# Investigation Statuses

Recommended statuses:

- Open
- Triage
- Evidence Collection
- Awaiting User Response
- Awaiting External Provider
- Under Review
- Contained
- Resolved — No Fraud
- Resolved — Policy Violation
- Resolved — Confirmed Fraud
- Referred
- Closed

---

# Evidence Collection

Evidence may include:

- Raw heartbeat payloads
- Signature results
- API logs
- Sequence history
- Contract history
- Assignment history
- Ownership records
- Payment records
- Payout records
- Login history
- Device and session data
- Documents
- Communications
- Maintenance records
- Administrator actions
- Company reports

Evidence access must be restricted and audited.

---

# Evidence Integrity

Evidence should preserve:

- Original value
- Collection time
- Source
- Collector
- Hash
- Storage location
- Access history
- Related case

Evidence must not be edited in place.

Analyst notes should be stored separately from original records.

---

# User Communication

When appropriate, the platform should tell the user:

- What action was taken
- Which account or robot is affected
- Whether funds are held
- What information is needed
- How to respond
- Expected review timeframe
- Appeal process

The platform may withhold detailed fraud indicators when disclosure would create security or legal risk.

---

# Appeal Process

Users should be able to appeal material decisions such as:

- Account suspension
- Robot suspension
- Ownership denial
- Queue removal
- Payroll adjustment
- Payout hold
- Manufacturer suspension
- Contract restriction

An appeal should include:

- Decision being challenged
- Reason
- Supporting evidence
- Submission time
- Reviewer
- Outcome
- Explanation

Where practical, the appeal reviewer should not be the sole person who made the original decision.

---

# Decision Standards

Possible outcomes include:

- No issue found
- Warning
- Required correction
- Temporary restriction
- Permanent restriction
- Financial adjustment
- Credential rotation
- Contract termination
- Robot suspension
- Account closure
- Manufacturer removal
- Referral to payment provider
- Referral to authorities where legally appropriate

Decisions should be based on documented evidence and policy.

---

# False Positive Management

Fraud controls must be evaluated for false positives.

The platform should track:

- Alert volume
- Confirmed fraud rate
- User impact
- Appeal reversal rate
- Review time
- Financial loss prevented
- Legitimate transactions delayed
- Model performance by category

Rules causing excessive legitimate disruption should be reviewed.

---

# Data Minimization

Fraud prevention should collect only data that is reasonably necessary.

Sensitive signals should have:

- Defined purpose
- Access restrictions
- Retention period
- Security controls
- Legal review where required

Fraud prevention does not authorize unlimited surveillance.

---

# Retention

Recommended retention categories:

## Financial and Payroll Evidence

Retain according to applicable financial, tax, and legal requirements.

## Security Events

Retain long enough for incident investigation and compliance obligations.

## Heartbeat Evidence

Retain detailed records for the applicable dispute and audit period, with summarized operational history retained longer where appropriate.

## Investigation Files

Retain based on severity, legal requirements, and case outcome.

Retention periods must be configurable by jurisdiction and data class.

---

# Privacy and Legal Controls

Fraud-prevention processing must comply with applicable laws concerning:

- Privacy
- Consumer reporting
- Employment
- Biometrics
- Automated decision-making
- Data retention
- Cross-border transfer
- Financial services
- Electronic communications

High-impact automated decisions may require human review depending on jurisdiction.

---

# Fraud Events

The event catalog should support events such as:

```text
fraud.alert.created
fraud.case.opened
fraud.case.assigned
fraud.case.evidence_added
fraud.case.escalated
fraud.case.resolved
fraud.hold.created
fraud.hold.released
fraud.robot.suspended
fraud.robot.restored
fraud.account.restricted
fraud.account.restored
fraud.credential.revoked
fraud.appeal.submitted
fraud.appeal.resolved
```

---

# Fraud Notifications

Notification rules should support:

- Verification required
- Suspicious login
- Payout hold
- Robot suspension
- Credential revocation
- Ownership conflict
- Queue review
- Investigation information request
- Appeal decision
- Account restoration

Sensitive investigation content must not be exposed in insecure message previews.

---

# Fraud Dashboard

Authorized administrators should have a fraud dashboard showing:

- Open cases
- Critical alerts
- Held funds
- Suspended robots
- Restricted accounts
- Invalid heartbeat trends
- Duplicate serial alerts
- Payment fraud alerts
- Payout risk alerts
- Queue anomalies
- Manufacturer security incidents
- Aging investigations
- Appeal backlog

---

# Alert Prioritization

Alerts should be prioritized using:

- Financial exposure
- Number of robots
- Number of users affected
- Active contract impact
- Safety implications
- Credential scope
- Evidence strength
- Recurrence
- Platform-wide risk

A large fleet credential compromise should outrank a low-value isolated billing discrepancy.

---

# Monitoring Metrics

The platform should monitor:

- Invalid heartbeat percentage
- Duplicate heartbeat percentage
- Replay attempts
- Signature failures
- Serial conflicts
- Suspicious sequence resets
- Overlapping assignments
- Robot-hours placed on hold
- Payouts held
- Chargeback rate
- Failed payment rate
- Queue override count
- Administrator adjustment volume
- Account takeover alerts
- Investigation resolution time
- Appeal reversal rate

---

# Emergency Controls

Authorized security personnel should be able to:

- Revoke a manufacturer credential
- Suspend a robot
- Suspend a robot model
- Pause manufacturer heartbeat acceptance
- Freeze payout processing
- Restrict company contract creation
- Disable queue enrollment
- Block suspicious sessions
- Require global credential reset
- Activate incident mode

Emergency actions must:

- Be audited
- Include a reason
- Have a defined review owner
- Be reviewed after activation
- Avoid permanent data loss

---

# Business Continuity

Fraud systems must fail safely.

Examples:

- If signature verification is unavailable, do not accept payable heartbeats.
- If audit logging fails, block sensitive administrative actions.
- If the fraud-scoring service is unavailable, apply conservative transaction limits rather than silently approving high-risk actions.
- If identity verification is unavailable, keep applications pending.
- If payment-risk checks fail, do not expand unsecured company exposure.

Noncritical read-only functions should remain available where safe.

---

# Prohibited Practices

The platform must not:

- Generate payable time from schedules alone
- Allow manual heartbeat creation through ordinary user interfaces
- Allow users to edit verified heartbeat history
- Allow administrators to delete financial evidence
- Allow duplicate serials to operate simultaneously
- Allow retroactive assignments to automatically create pay
- Allow payout-bank changes without security checks
- Treat every anomaly as confirmed fraud
- Use undisclosed financial adjustments to recover losses
- Hide material suspensions or holds from affected users without lawful reason
- Depend entirely on user reports or entirely on manufacturer telemetry

---

# Required Automated Tests

Fraud-prevention implementation should include tests for:

- Duplicate serial registration
- Duplicate heartbeat event
- Replayed signed request
- Invalid signature
- Expired timestamp
- Future timestamp
- Sequence rollback
- Sequence reset
- Revoked credential
- Suspended robot heartbeat
- Retired robot heartbeat
- Heartbeat outside assignment
- Overlapping assignments
- Retroactive assignment
- Duplicate payroll interval
- Ownership conflict
- Payout account change
- Queue duplicate account
- Unauthorized queue override
- Unauthorized financial adjustment
- Dual-approval threshold
- Account takeover challenge
- Investigation creation
- Hold creation and release
- Appeal workflow
- Audit-log immutability
- Fail-safe behavior during security-service outage

---

# Acceptance Criteria

This appendix is complete when:

- Payable operating time cannot be created through a single unverified input.
- Heartbeat authentication, signing, replay prevention, sequencing, and timestamp controls are defined.
- Robot serial and ownership fraud controls are established.
- Hiring Company inactive reporting is supported without allowing arbitrary nonpayment.
- Queue, payment, payroll, maintenance, API, and administrator fraud controls are defined.
- Holds, suspensions, investigations, evidence, appeals, and restoration workflows are specified.
- High-risk administrative actions support dual approval.
- Historical evidence and audit logs remain immutable.
- Automated fraud actions are explainable and reviewable.
- The platform fails safely when critical trust services are unavailable.
- The fraud-prevention system does not require a separate physical uptime device as a universal platform condition.

# Next Appendix

# Appendix L — Robot Lifecycle

This appendix will define every robot state and transition from manufacturer registration through activation, assignment, maintenance, ownership transfer, suspension, and retirement.
