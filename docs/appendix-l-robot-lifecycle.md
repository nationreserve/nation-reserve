# Nation Reserve Master Specification

# Volume I — Appendix L

# Robot Lifecycle Specification

**Version:** 1.0
**Status:** Authoritative Robot State, Transition, and Ownership Specification

---

# Purpose

This appendix defines the complete lifecycle of every robot managed through RoboWorkPool.

It establishes:

- Robot identity
- Registration
- Ownership
- Activation
- Heartbeat connection
- Contract eligibility
- Assignment
- Active operation
- Inactive reporting
- Maintenance
- Suspension
- Ownership transfer
- Retirement
- Replacement
- Historical preservation
- Allowed and prohibited state transitions

Every portal, API, workflow, event, notification, billing calculation, and fraud-control rule involving a robot must follow this lifecycle.

---

# Core Lifecycle Principle

A robot is not automatically eligible to work or generate payment merely because it exists in the database.

The platform must separately determine whether the robot is:

- Properly registered
- Uniquely identified
- Owned by an eligible owner
- Supported by an approved manufacturer
- Connected through an approved Heartbeat API integration
- Technically activated
- Operationally available
- Assigned to an active contract
- In a payable state
- Free from maintenance, suspension, ownership, or security restrictions

Robot identity, ownership, operational status, assignment status, and financial eligibility must remain separate concepts.

---

# Robot Lifecycle Overview

```text
Manufacturer Model Registered
↓
Robot Serial Registered
↓
Awaiting Ownership
↓
Ownership Claimed
↓
Ownership Verified
↓
Awaiting Activation
↓
Activation Testing
↓
Active and Available
↓
Reserved or Assigned
↓
Operating
↓
Paused, Offline, or Maintenance
↓
Returned to Service
↓
Transferred, Replaced, or Retired
```

A robot may move through some operational states repeatedly throughout its usable life.

---

# Robot Identity Model

Every robot must have a permanent RoboWorkPool identity.

Required identity fields include:

```text
Platform Robot ID
Manufacturer ID
Robot Model ID
Manufacturer Serial Number
Normalized Serial Number
Hardware or Device Identity, if supported
Current Owner ID
Current Lifecycle State
Current Operational State
Current Assignment State
Current Heartbeat State
Current Maintenance State
Current Financial Eligibility State
Created Timestamp
Activation Timestamp
Retirement Timestamp, if applicable
Identity Version
```

The platform-generated Robot ID must never be reused.

A retired or removed robot must not have its identity reassigned to another physical robot.

---

# Serial Number Requirements

Each physical robot must have a manufacturer-issued serial identifier.

The serial must be:

- Unique within the manufacturer's fleet
- Stable throughout the robot's life
- Visible or retrievable for operational identification
- Registered before production activation
- Included in relevant assignment and company interfaces
- Preserved in historical records

The platform should store both:

- The original serial as provided by the manufacturer
- A normalized serial used for comparison and duplicate detection

Normalization may include:

- Trimming whitespace
- Standardizing letter case
- Removing approved formatting separators
- Preserving meaningful leading zeros

Normalization must not change the actual legal or manufacturer-facing serial display.

---

# Composite Identity

The primary external identity may use:

```text
Manufacturer ID + Manufacturer Serial Number
```

The internal primary key must use the platform Robot ID.

This allows two manufacturers to use similar serial formats without creating ambiguity while still supporting platform-wide duplicate and fraud analysis.

---

# Robot Model Dependency

A robot cannot enter production registration unless its model has been approved.

The Robot Model record should define:

- Manufacturer
- Model name
- Model version
- Supported task categories
- Hardware capabilities
- Software integration version
- Heartbeat schema support
- Maintenance requirements
- Safety restrictions
- Geographic restrictions
- Required certifications
- Supported firmware ranges
- Operational-state mapping
- Approval status

A model suspension may affect all robots associated with that model.

---

# Robot Lifecycle State Families

The platform should not rely on one overloaded status field.

Each robot should have several coordinated state dimensions.

## Registration State

- Draft
- Registered
- Registration Rejected
- Registration Conflict
- Archived

## Ownership State

- Unassigned
- Ownership Pending
- Ownership Verified
- Ownership Disputed
- Transfer Pending
- Ownership Restricted

## Activation State

- Not Eligible
- Awaiting Activation
- Activation In Progress
- Activation Failed
- Activated
- Reactivation Required

## Heartbeat State

- Never Connected
- Connecting
- Online
- Degraded
- Offline
- Invalid
- Credential Restricted

## Operational State

- Unavailable
- Available
- Reserved
- Assigned
- Operating
- Paused
- Charging
- Faulted
- Emergency Stopped

## Maintenance State

- No Maintenance
- Maintenance Requested
- Maintenance Scheduled
- In Maintenance
- Awaiting Verification
- Maintenance Completed
- Maintenance Disputed

## Compliance State

- Eligible
- Review Required
- Restricted
- Suspended
- Banned

## Financial Eligibility State

- Not Payable
- Potentially Payable
- Payable
- Payment Review
- Financial Hold

## Final Lifecycle State

- Active
- Transferred
- Replaced
- Retired
- Decommissioned
- Destroyed
- Lost
- Stolen

These dimensions may coexist.

Example:

```text
Registration: Registered
Ownership: Ownership Verified
Activation: Activated
Heartbeat: Offline
Operational: Assigned
Maintenance: No Maintenance
Compliance: Eligible
Financial Eligibility: Not Payable
Final Lifecycle: Active
```

This robot exists and is assigned but is not generating payable time because it is offline.

---

# Master Lifecycle States

For simplified UI and workflow display, the platform may derive one master lifecycle state.

Recommended values:

1. Pending Registration
2. Awaiting Ownership
3. Ownership Verification
4. Awaiting Activation
5. Activation Testing
6. Available
7. Reserved
8. Assigned
9. Operating
10. Temporarily Offline
11. Maintenance
12. Suspended
13. Ownership Transfer
14. Replacement Processing
15. Retired

The master state is derived from authoritative state dimensions and must not replace them in backend logic.

---

# Stage 1 — Manufacturer Model Registration

Before registering an individual robot, the manufacturer must register and receive approval for its robot model.

Required model workflow:

```text
Draft Model
↓
Submitted for Review
↓
Technical Review
↓
Security Review
↓
Operational Mapping Review
↓
Approved for Sandbox
↓
Production Approval
```

An individual robot may be sandbox-tested before full model production approval, but it must not create payable time.

---

# Stage 2 — Individual Robot Registration

An approved manufacturer registers each physical robot before shipment or activation.

Required registration information:

- Manufacturer
- Model
- Serial number
- Manufacturing date, if available
- Hardware revision
- Firmware version
- Supported API version
- Intended region
- Initial ownership or fulfillment program, if known
- Device credential or provisioning method
- Warranty information, if supported
- Safety or capability restrictions

The manufacturer dashboard should confirm successful registration before shipment where operationally practical.

---

# Registration Validation

The platform must verify:

- Manufacturer is approved.
- Model is approved.
- Serial is valid.
- Serial is not already registered.
- Firmware is supported.
- Region is permitted.
- Required credentials or provisioning references are present.
- Registration payload matches the approved schema.

Failure creates a rejected or conflict state.

---

# Registration Outcomes

## Registered

Robot identity successfully created.

## Registration Rejected

Required data or policy validation failed.

## Registration Conflict

The serial, device key, ownership claim, or other identity data conflicts with an existing robot.

## Manual Review Required

The robot may be legitimate, but automated validation cannot resolve the record.

No rejected, conflicting, or manually unresolved robot may become payable.

---

# Stage 3 — Awaiting Ownership

A registered robot may exist before an owner is assigned.

Possible reasons:

- Robot is in manufacturer inventory.
- Robot is reserved for a future queue participant.
- Shipment has not occurred.
- Financing is incomplete.
- Ownership transfer records are pending.
- The platform company temporarily controls fulfillment.

During this state:

- No Robot Owner payroll is created.
- The robot cannot enter ordinary owner contracts.
- Sandbox and logistics heartbeats must remain nonpayable.
- Manufacturer and authorized administrators may view the record.

---

# Stage 4 — Ownership Claim

A Robot Owner may claim a robot through an approved workflow.

Possible claim methods:

- Manufacturer assigns the robot to the buyer.
- Owner enters a secure activation or claim code.
- Fulfillment program assigns the robot.
- Existing owner initiates a transfer.
- Administrator resolves documented ownership.
- Purchase-system integration confirms the transaction.

Entering a serial number alone is insufficient.

---

# Ownership Claim Requirements

A claim should include:

- Robot
- Claiming owner
- Ownership type
- Effective or expected ownership date
- Purchase, transfer, or fulfillment reference
- Manufacturer confirmation where required
- Required documents
- Claim method
- Acceptance of ownership terms

---

# Ownership Verification

Ownership verification may require:

- Manufacturer confirmation
- Purchase confirmation
- Delivery confirmation
- Payment or financing confirmation
- Identity verification
- Organization authority
- Previous-owner approval
- Secure device challenge
- Administrative review

The result must be one of:

- Verified
- Rejected
- More Information Required
- Disputed
- Expired

---

# Ownership Effective Time

Every verified ownership record must have an exact effective timestamp.

This timestamp determines:

- Which owner controls the robot
- Which owner receives earnings
- Which owner may request maintenance
- Which owner may transfer or retire the robot
- Which historical owner appears in contract and financial records

Ownership must never overlap between two owners for the same robot and same timestamp.

---

# Ownership History

Ownership changes must create immutable history records.

Each ownership record should contain:

```text
Ownership Record ID
Robot ID
Owner ID
Ownership Start Timestamp
Ownership End Timestamp
Acquisition Method
Source Transaction
Verification Method
Approved By
Transfer Reference
Status
Audit Reference
```

Past ownership records must not be overwritten.

---

# Stage 5 — Awaiting Activation

After ownership is verified, the robot enters Awaiting Activation.

The owner and manufacturer should see a checklist including:

- Ownership verified
- Robot model approved
- Serial confirmed
- Required firmware installed
- Manufacturer credentials active
- Robot connected to an eligible network
- Heartbeat integration configured
- Safety and maintenance checks complete
- Region eligible
- Owner payout setup complete where required
- No active suspension or dispute

The owner should not be able to schedule payable operation before the robot passes activation.

---

# Activation Responsibility

Activation is a shared process.

## Manufacturer Responsibilities

- Register serial
- Provision API or device credentials
- Confirm supported firmware
- Map robot states
- Test heartbeat transmission
- Resolve technical integration failures

## Robot Owner Responsibilities

- Confirm possession or control
- Connect the robot to the required network
- Complete owner verification
- Complete payout setup
- Accept robot operating terms
- Ensure the robot is physically ready

## Platform Responsibilities

- Validate identity
- Validate ownership
- Validate heartbeat
- Validate operational state
- Confirm policy eligibility
- Record activation result

---

# Stage 6 — Activation Testing

The activation process should perform a defined test sequence.

Recommended sequence:

1. Generate activation session.
2. Confirm robot identity.
3. Confirm manufacturer credential.
4. Request or await signed test heartbeat.
5. Validate timestamp and sequence.
6. Validate model and firmware.
7. Validate operational-state mapping.
8. Confirm the message is production-authorized.
9. Test temporary offline and reconnect behavior where required.
10. Confirm no identity or ownership conflicts.
11. Record result.

---

# Activation Session

An activation session should contain:

```text
Activation Session ID
Robot ID
Owner ID
Manufacturer ID
Started Timestamp
Expiration Timestamp
Expected Tests
Completed Tests
Failed Tests
Heartbeat Samples
Firmware Version
API Version
Result
Failure Reason
Retry Count
Approved By, if manual
```

Activation sessions must expire.

Old activation tokens or sessions must not remain indefinitely usable.

---

# Activation Success

A successful activation results in:

- Activation state becomes Activated.
- Heartbeat state becomes Online or Connected.
- Operational state becomes Available unless another condition applies.
- Financial eligibility becomes Potentially Payable, not automatically Payable.
- `robot.activated` event is published.
- Owner and manufacturer receive confirmation.
- Robot becomes eligible for reservation or assignment.

Activation does not create earnings by itself.

---

# Activation Failure

Possible causes:

- Invalid signature
- Duplicate serial
- Unsupported firmware
- Wrong model
- Ownership mismatch
- Missing credential
- Revoked credential
- Invalid timestamps
- Invalid state mapping
- Region restriction
- Safety restriction
- Manufacturer suspension
- Repeated heartbeat failure

The platform must provide a safe failure explanation and next action.

Sensitive security details should be available only to authorized technical users.

---

# Reactivation

Reactivation may be required after:

- Long-term offline period
- Credential replacement
- Major firmware change
- Ownership transfer
- Model suspension and restoration
- Major maintenance
- Security incident
- Device identity change
- Administrative requirement

Reactivation should use the same validation principles as initial activation.

---

# Stage 7 — Available

An Available robot is:

- Registered
- Ownership verified
- Activated
- Not assigned to conflicting work
- Not under maintenance
- Not suspended
- Technically eligible for selection

Available does not necessarily mean:

- Currently online every second
- Guaranteed to receive work
- Physically located near demand
- Suitable for every task
- Financially payable

The matching system must still evaluate capabilities, location, timing, and contract requirements.

---

# Availability Controls

Availability may be affected by:

- Owner-set availability
- Manufacturer restrictions
- Maintenance schedule
- Charging needs
- Geographic location
- Transportation
- Contract eligibility
- Firmware requirements
- Capability requirements
- Platform risk controls

The owner may mark the robot unavailable for future assignment, subject to existing contract obligations.

---

# Stage 8 — Reserved

A robot may be reserved for a contract before final assignment.

Reserved means:

- The robot is temporarily held for a defined contract or operating window.
- It should not be offered for conflicting reservations.
- Final assignment conditions may still be pending.
- No payable time exists solely because of reservation.

A reservation should include:

- Robot
- Contract
- Proposed assignment
- Start and end window
- Expiration
- Reservation reason
- Created by
- Status

---

# Reservation Expiration

Reservations must expire automatically when:

- Contract is not approved in time.
- Required company action is incomplete.
- Owner action is incomplete.
- Robot becomes ineligible.
- Reservation window ends.
- Administrator releases capacity.

Expired reservations should return eligible robots to Available.

---

# Stage 9 — Assigned

An Assigned robot is linked to an approved assignment.

An assignment must identify:

- Robot
- Unique serial
- Robot Owner
- Hiring Company
- Contract
- Facility
- Department or work area
- Work category
- Scheduled start and end
- Operating restrictions
- Reporting contacts
- Applicable rate version
- Status

One robot must not have overlapping incompatible assignments.

---

# Assignment Readiness

Before assignment begins, the platform should confirm:

- Contract is active.
- Company is eligible.
- Robot is active.
- Owner is eligible.
- Manufacturer is approved.
- Robot capability matches requirements.
- Robot is not under maintenance.
- Robot is not suspended.
- Required insurance or documents are valid, where applicable.
- Payment risk controls are satisfied.
- Serial identity is visible to the company.

---

# Assignment Start

Assignment start may occur:

- Automatically at the approved time if all eligibility rules pass
- Through company or owner confirmation
- Through a manufacturer operational event
- Through an authorized administrator
- Through a combined workflow

The scheduled start defines expected timing but does not independently create payable time.

---

# Stage 10 — Operating

A robot enters Operating when it is:

- Assigned
- Within an eligible operating window
- Sending valid heartbeats
- Reporting an approved payable state
- Not disqualified by maintenance, suspension, safety, or fraud controls

Operating may contribute to payable time.

The final payable determination remains interval-based and must follow Appendix J.

---

# Payable Operating State

A robot interval becomes Payable only when all financial conditions are met.

Example:

```text
Registered Robot
+
Verified Owner
+
Approved Manufacturer
+
Activated Robot
+
Active Contract
+
Active Assignment
+
Valid Heartbeat
+
Eligible Robot State
+
No Disqualifying Restriction
=
Payable Interval
```

The platform must calculate eligibility continuously rather than assuming an entire scheduled shift qualifies.

---

# Operating State Changes

During an assignment, the robot may report:

- Working
- Idle but contractually available
- Paused
- Charging
- Faulted
- Emergency Stopped
- Maintenance
- Offline

Whether idle or charging time is payable must be explicitly defined by contract and operating policy.

The default rule should not assume every connected state is payable.

---

# Paused State

A robot may be Paused because of:

- Scheduled break
- Company workflow interruption
- Safety check
- Temporary task delay
- Owner or operator instruction
- System command
- Low battery
- Network issue

A pause should record:

- Start time
- End time
- Initiator
- Reason
- Heartbeat state
- Payability rule

---

# Charging State

Charging may occur:

- Between assignments
- During a scheduled work period
- During a required operational cycle

Charging time must not automatically be payable.

The contract or assignment policy should define whether charging is:

- Included
- Excluded
- Partially included
- Included only when required onsite

The robot's charging state must remain visible in operational reports.

---

# Offline State

A robot becomes Offline when valid heartbeat continuity is lost beyond the approved tolerance.

Offline consequences may include:

- Stop creating new payable intervals.
- Notify the Robot Owner.
- Notify the Hiring Company during active assignments.
- Create operational incident record.
- Escalate if outage persists.
- Trigger replacement or coverage review.
- Require reactivation after a prolonged outage.

Offline status must not erase valid time before the outage.

---

# Degraded Heartbeat State

A robot may be Degraded when:

- Some heartbeats are delayed.
- Invalid-message rate is elevated.
- State information is incomplete.
- Sequence continuity is uncertain.
- Manufacturer gateway is unstable.

Degraded status may result in:

- Continued operation with review
- Temporary nonpayable status
- Short tolerance period
- Escalation
- Manual reconciliation

The rule should depend on evidence quality and contract risk.

---

# Connection Restored

When valid heartbeat operation resumes:

- Record the restoration timestamp.
- Validate sequence continuity.
- Determine whether the outage gap qualifies.
- Resume potential payable operation only from the valid point allowed by policy.
- Notify affected parties when appropriate.
- Preserve the outage incident.

Do not automatically pay the entire offline gap.

---

# Hiring Company Inactive Report

The Hiring Company may report an assigned robot as inactive even when network heartbeats continue.

Report categories include:

- Not physically operating
- Missing from site
- Wrong serial
- Damaged
- Unsafe
- Removed from assignment
- Unresponsive
- Performing no assigned work

The report must identify the robot by serial.

---

# Inactive Report Effect

An inactive report should:

- Create an incident.
- Flag relevant intervals for review.
- Notify the Robot Owner.
- Notify platform operations.
- Request manufacturer telemetry where appropriate.
- Allow temporary assignment suspension where risk warrants.
- Preserve all heartbeat evidence.

It must not automatically delete or permanently deny payment.

---

# Emergency Stop

An authorized Hiring Company user, manufacturer, owner, or platform administrator may request an emergency stop when safety is at risk.

Emergency-stop consequences may include:

- Operational state becomes Emergency Stopped.
- Financial eligibility becomes Not Payable from the effective stop time.
- Assignment becomes Paused or Suspended.
- Critical notifications are sent.
- Maintenance or investigation case is created.
- Return-to-service verification is required.

Emergency-stop permission must be restricted and audited.

---

# Assignment Completion

An assignment may complete when:

- Scheduled end is reached.
- Contract task is completed.
- Company ends the assignment.
- Owner or platform ends it under allowed terms.
- Robot is replaced.
- Contract is cancelled.
- Safety or maintenance condition prevents continuation.

Completion must record:

- Effective end time
- Completion reason
- Final heartbeat state
- Verified operating duration
- Disputed duration
- Replacement, if any
- Reporter
- Audit reference

---

# Post-Assignment State

After assignment completion, the robot may become:

- Available
- Reserved for another assignment
- Maintenance Required
- Offline
- Suspended
- Transfer Pending
- Retired

The platform must not assume automatic availability if another condition exists.

---

# Maintenance Lifecycle

Recommended maintenance flow:

```text
Maintenance Requested
↓
Triage
↓
Scheduled
↓
Robot Removed from Payable Service
↓
In Maintenance
↓
Repair Completed
↓
Awaiting Verification
↓
Returned to Service
```

---

# Maintenance Request Sources

A maintenance request may originate from:

- Robot Owner
- Hiring Company
- Manufacturer
- Automated diagnostic
- Platform Operations
- Safety incident
- Fraud investigation
- Scheduled preventive-maintenance rule

---

# Maintenance Request Record

Required fields:

```text
Maintenance Request ID
Robot ID
Requester
Request Source
Issue Category
Severity
Description
Reported Timestamp
Current Assignment
Safety Impact
Operational Impact
Evidence
Assigned Service Provider
Status
Estimated Completion
Actual Completion
Return-to-Service Result
```

---

# Maintenance Severity

## Routine

Scheduled or nonurgent service.

## Operational

Robot performance is impaired.

## High

Robot should be removed from active assignment promptly.

## Critical

Immediate shutdown or emergency stop required.

Severity may be updated as more evidence becomes available.

---

# Maintenance and Payability

During confirmed In Maintenance status:

- New operating time is not payable.
- New assignments are blocked.
- Existing assignments are paused, replaced, or ended.
- Heartbeats may continue for diagnostic purposes but remain nonpayable.

The exact maintenance start timestamp must be recorded.

---

# Maintenance Completion

A service provider or authorized user may mark repair work complete, but the robot should enter Awaiting Verification rather than immediately becoming Active.

Completion evidence may include:

- Technician report
- Manufacturer diagnostic
- Firmware report
- Replacement part record
- Test heartbeat
- Safety check
- Operational test

---

# Return-to-Service Verification

Before becoming Available or Operating again, the platform should confirm:

- Maintenance issue resolved
- Required safety check passed
- Heartbeat valid
- Firmware supported
- No active suspension
- No unresolved identity issue
- Required manufacturer approval
- Assignment eligibility

Successful verification publishes `maintenance.completed` and may publish `robot.reactivated`.

---

# Repeated Maintenance

The platform should monitor:

- Frequent failures
- Repeated same-part replacement
- Excessive downtime
- Model-wide issue pattern
- Unsafe return-to-service attempts
- Maintenance cycling intended to manipulate contracts or payments

Repeated maintenance may trigger model, manufacturer, or fraud review.

---

# Suspension Lifecycle

A robot may be suspended for:

- Safety risk
- Invalid heartbeat behavior
- Duplicate serial
- Ownership dispute
- Manufacturer suspension
- Fraud investigation
- Compliance failure
- Unsupported firmware
- Unauthorized modification
- Contract abuse
- Legal restriction

---

# Suspension Types

## Operational Suspension

Blocks assignments and operation.

## Financial Suspension

Operation may continue in limited circumstances, but payment is held or blocked.

## Security Suspension

Credentials or heartbeat acceptance are disabled.

## Ownership Suspension

Transfers and owner actions are restricted.

## Full Suspension

All active platform use is blocked except authorized review access.

---

# Suspension Record

Each suspension must include:

```text
Suspension ID
Robot ID
Suspension Type
Reason Code
Description
Effective Timestamp
Created By
Evidence
Financial Effect
Assignment Effect
Review Deadline
Appeal Availability
Released Timestamp
Released By
Resolution
```

---

# Suspension Effect on Historical Time

Suspension should affect time from the defined effective timestamp.

It must not automatically invalidate all prior historical operation.

Prior time may be adjusted only through an evidence-based financial review.

---

# Suspension Review

Every nonpermanent suspension should have:

- Assigned review owner
- Review deadline
- Required resolution conditions
- User communication
- Appeal route where applicable

Indefinite unresolved suspensions should be avoided.

---

# Restoration From Suspension

Restoration may require:

- Ownership resolution
- Credential rotation
- Firmware update
- Maintenance
- Identity validation
- Fraud case closure
- Safety approval
- Manufacturer confirmation
- Reactivation test

Restoration should create a new event and audit entry.

---

# Ownership Transfer Lifecycle

Recommended transfer flow:

```text
Current Owner Initiates Transfer
↓
Proposed Owner Identified
↓
Eligibility Checks
↓
Transfer Terms Accepted
↓
Documents and Payment Confirmed
↓
Robot Temporarily Restricted
↓
Ownership Effective
↓
Reactivation if Required
```

---

# Transfer Initiation

A transfer should include:

- Robot
- Current owner
- Proposed new owner
- Transfer type
- Proposed effective time
- Transaction reference
- Price or consideration where relevant
- Required documents
- Responsibility for active contracts
- Maintenance status
- Outstanding financial obligations

---

# Transfer Eligibility

A transfer must be blocked or reviewed when:

- Robot is stolen or lost.
- Ownership is disputed.
- Robot is under critical investigation.
- Transfer would exceed the new owner's 20-robot limit.
- Required payout or identity verification is incomplete.
- Existing contract forbids transfer.
- Manufacturer restrictions apply.
- Legal hold exists.
- Required financing obligations remain unresolved.

---

# Active Contract During Transfer

The platform must define one of the following outcomes:

- Transfer waits until assignment completion.
- Contract is novated to the new owner.
- Robot is replaced.
- Contract is terminated under approved terms.
- New owner accepts contract obligations.
- Platform temporarily restricts transfer.

The contract must never silently switch owners without recording the effective change.

---

# Financial Allocation During Transfer

Verified time before the ownership effective timestamp belongs to the previous owner.

Verified time after the effective timestamp belongs to the new owner, provided all eligibility rules pass.

If reactivation is required, the new owner does not earn payable time until reactivation succeeds.

---

# Transfer Completion

On completion:

- Current ownership record closes.
- New ownership record begins.
- Owner-facing access changes.
- Prior owner retains historical statements.
- New owner receives current management rights.
- Manufacturer and company records update.
- Active assignments are revalidated.
- Payout routing changes for future intervals.
- Audit and notification events are created.

---

# Transfer Cancellation

A pending transfer may be cancelled before completion when permitted.

The cancellation must record:

- Requester
- Reason
- Timestamp
- Financial effect
- Contract effect
- Notifications

A cancelled transfer must not create a temporary ownership gap.

---

# Robot Replacement Lifecycle

A robot may be replaced because of:

- Failure
- Maintenance duration
- Contract requirement
- Model recall
- Upgrade
- Loss
- Theft
- Safety issue
- Manufacturer decision

Replacement does not mean identity substitution.

The replacement robot must have its own unique Robot ID and serial.

---

# Assignment Replacement

When one robot replaces another in an assignment:

- Original assignment segment closes.
- Replacement assignment segment begins.
- Effective timestamps are recorded.
- Verified time remains tied to the correct robot.
- Robot Owner earnings remain separated.
- Company invoice may show both serials.
- Replacement reason is recorded.

One robot's heartbeat history must never be moved to another robot.

---

# Warranty Replacement

A manufacturer warranty replacement should link:

- Original robot
- Replacement robot
- Warranty case
- Shipment record
- Ownership continuation
- Financial obligations
- Retirement or return status of original robot

The original robot remains in historical records.

---

# Lost Robot State

A robot may be marked Lost when its location or possession cannot be confirmed.

Consequences:

- Suspend new assignments.
- Stop payable eligibility.
- Notify owner and relevant parties.
- Create incident or investigation.
- Restrict ownership transfer.
- Preserve last known heartbeat and assignment.

A lost robot may later be recovered and reactivated.

---

# Stolen Robot State

A stolen robot should trigger stronger controls.

Potential actions:

- Immediate suspension
- Credential revocation
- Law-enforcement documentation where appropriate
- Ownership lock
- Location-preservation controls where lawful
- Company and manufacturer notification
- Fraud investigation
- Payout review

The platform must not transfer ownership based solely on physical possession of a stolen robot.

---

# Destroyed Robot State

A destroyed robot is permanently incapable of return to service.

Required evidence may include:

- Manufacturer confirmation
- Insurance report
- Service report
- Owner attestation
- Photographic evidence
- Administrative review

Destroyed is a terminal operational state.

The robot record remains preserved.

---

# Retirement Lifecycle

A robot may be retired because of:

- End of useful life
- Owner decision
- Unsupported model
- Legal restriction
- Manufacturer recall
- Repeated safety issues
- Permanent damage
- Platform decision
- Replacement

---

# Retirement Preconditions

Before retirement completes, the platform should evaluate:

- Active assignments
- Pending payroll
- Open invoices
- Maintenance case
- Ownership dispute
- Fraud hold
- Warranty or insurance claim
- Manufacturer return requirement
- Data retention requirement

Retirement may be initiated while obligations remain, but final closure should preserve them.

---

# Retirement Process

Recommended process:

1. Retirement requested.
2. Eligibility reviewed.
3. Active assignments ended or reassigned.
4. Heartbeat production credentials disabled for payable use.
5. Final verified time calculated.
6. Payroll and invoice records closed.
7. Maintenance and incident records preserved.
8. Final state confirmed.
9. Robot removed from active inventory.
10. Retirement event published.

---

# Retirement Types

## Voluntary Retirement

Owner chooses to remove the robot.

## Manufacturer Retirement

Manufacturer declares end of support or recall.

## Administrative Retirement

Platform retires the robot under policy.

## Destruction Retirement

Robot is physically destroyed.

## Export or Jurisdiction Retirement

Robot leaves the supported operating region.

## Permanent Security Retirement

Device identity can no longer be trusted.

---

# Retired Robot Behavior

A retired robot:

- Cannot receive new assignments.
- Cannot generate payable time.
- Cannot be re-registered as a new robot.
- Must remain visible in authorized historical records.
- May retain read-only owner and administrator history.
- May not have its serial reused unless an extraordinary manufacturer-controlled process is explicitly approved.

---

# Reactivation After Retirement

Retirement should generally be terminal.

A correction may be allowed only when:

- Retirement was entered in error.
- No conflicting replacement or ownership action occurred.
- An authorized administrator approves restoration.
- Full reactivation is completed.
- Audit history preserves the mistaken retirement and correction.

A genuinely retired or destroyed robot must not be restored through an ordinary UI action.

---

# Decommissioning

Decommissioning may include:

- Credential destruction
- Removal of platform software
- Data wipe confirmation
- Hardware recycling
- Manufacturer return
- Secure disposal
- Ownership archive

Decommissioning details may be stored separately from lifecycle retirement.

---

# Robot Data Retention

The platform should retain historical robot data according to legal and operational requirements.

Records likely requiring long-term retention include:

- Identity
- Serial
- Model
- Ownership history
- Activation history
- Assignment history
- Verified operating summaries
- Payroll source records
- Invoice source records
- Maintenance
- Suspensions
- Investigations
- Transfers
- Retirement
- Audit logs

Raw heartbeat data may have a separate retention period from summarized verified-time records.

---

# Robot Record Deletion

Physical deletion of a robot record should not be permitted once the robot has:

- An ownership record
- An activation
- A contract
- An assignment
- A heartbeat
- A financial record
- A maintenance record
- An investigation
- An audit record

Incorrect unused draft records may be archived or removed under controlled rules.

---

# State Transition Authority

Different parties may initiate different transitions.

## Manufacturer

May initiate:

- Registration
- Model association
- Credential provisioning
- Firmware change
- Maintenance recommendation
- Manufacturer suspension request
- Recall
- Warranty replacement

## Robot Owner

May initiate:

- Ownership claim
- Availability change
- Maintenance request
- Transfer request
- Voluntary retirement
- Lost or stolen report

## Hiring Company

May initiate:

- Assignment confirmation
- Inactive report
- Safety report
- Assignment completion
- Emergency-stop request where authorized
- Replacement request

## Platform Administrator

May initiate:

- Manual review
- Suspension
- Restoration
- Ownership correction
- Assignment intervention
- Retirement
- Fraud hold
- Emergency action

Every transition must still pass authorization and validation rules.

---

# Transition Validation

Every robot state transition should validate:

- Current state permits the transition.
- Actor is authorized.
- Required evidence is present.
- No blocking condition exists.
- Effective timestamp is valid.
- Related records are consistent.
- Required financial action is created.
- Required events and notifications are produced.
- Audit record is written.

---

# Prohibited Transitions

Examples of transitions that must not occur directly:

```text
Unregistered → Operating
Unverified Ownership → Payable
Awaiting Activation → Operating
Maintenance → Payable
Suspended → Operating
Retired → Assigned
Destroyed → Available
Ownership Disputed → Transfer Completed
Offline → Payable without valid restoration evidence
Draft Assignment → Payroll Created
```

These must be rejected even when attempted by privileged users unless a controlled correction workflow explicitly exists.

---

# State Transition Table

| Current state         | Allowed next state    | Primary actor                             | Important conditions                     |
| --------------------- | --------------------- | ----------------------------------------- | ---------------------------------------- |
| Pending Registration  | Registered            | Manufacturer or Platform                  | Model approved and serial valid          |
| Registered            | Awaiting Ownership    | System                                    | No assigned owner                        |
| Awaiting Ownership    | Ownership Pending     | Owner, Manufacturer, or Fulfillment       | Valid claim initiated                    |
| Ownership Pending     | Ownership Verified    | Platform or approved verification service | Evidence accepted                        |
| Ownership Verified    | Awaiting Activation   | System                                    | Owner eligible                           |
| Awaiting Activation   | Activation Testing    | Owner and Manufacturer                    | Activation session started               |
| Activation Testing    | Available             | System                                    | All checks pass                          |
| Activation Testing    | Activation Failed     | System                                    | One or more checks fail                  |
| Available             | Reserved              | Matching or Company workflow              | Contract capacity hold                   |
| Reserved              | Assigned              | Platform or authorized company workflow   | Contract approved                        |
| Assigned              | Operating             | System                                    | Valid heartbeat and operating conditions |
| Operating             | Paused                | Owner, Company, Manufacturer, or System   | Valid pause reason                       |
| Operating             | Offline               | System                                    | Heartbeat tolerance exceeded             |
| Operating             | Maintenance           | Authorized actor                          | Maintenance condition confirmed          |
| Operating             | Suspended             | Platform or emergency workflow            | Safety, fraud, or compliance reason      |
| Offline               | Operating             | System                                    | Valid connection restored                |
| Maintenance           | Awaiting Verification | Service provider or Manufacturer          | Repair completed                         |
| Awaiting Verification | Available             | Platform                                  | Return-to-service passed                 |
| Suspended             | Available             | Platform                                  | Suspension resolved and activation valid |
| Available             | Transfer Pending      | Current Owner                             | Transfer eligibility passes              |
| Transfer Pending      | Awaiting Activation   | System                                    | New owner and reactivation required      |
| Available             | Retired               | Owner, Manufacturer, or Platform          | Retirement approved                      |
| Retired               | Archived              | System                                    | Retention workflow                       |

---

# Concurrency Controls

Robot state changes must be concurrency-safe.

Examples:

- Two companies must not assign the same robot simultaneously.
- Ownership cannot transfer while another transfer completes.
- Maintenance and assignment start must not race.
- Retirement and activation cannot both succeed.
- Offline restoration and suspension must resolve deterministically.

Use:

- Database transactions
- Optimistic locking or row versions
- Unique constraints
- Idempotency keys
- State-transition guards
- Event outbox patterns

---

# State Versioning

Every robot record should have a state version.

A transition request should include or validate the expected current version.

Example:

```text
Expected version: 14
Current version: 15
Result: Conflict — refresh robot state
```

This prevents stale interfaces from overwriting newer decisions.

---

# Lifecycle Events

The event catalog should include or be expanded to include:

```text
robot.registration.submitted
robot.registration.completed
robot.registration.rejected
robot.registration.conflict_detected
robot.ownership.claimed
robot.ownership.verified
robot.ownership.rejected
robot.ownership.disputed
robot.activation.started
robot.activation.completed
robot.activation.failed
robot.available
robot.reserved
robot.assignment.created
robot.assignment.started
robot.operating
robot.paused
robot.offline
robot.connection.restored
robot.inactive_reported
robot.emergency_stopped
robot.maintenance.requested
robot.maintenance.started
robot.maintenance.completed
robot.suspended
robot.restored
robot.transfer.initiated
robot.transfer.completed
robot.transfer.cancelled
robot.replacement.started
robot.replacement.completed
robot.lost
robot.stolen
robot.recovered
robot.retirement.requested
robot.retired
robot.decommissioned
```

---

# Lifecycle Notifications

The notification system should support:

- Registration completed
- Registration conflict
- Ownership claim received
- Ownership verified
- Ownership dispute
- Activation required
- Activation succeeded
- Activation failed
- Robot assigned
- Assignment changed
- Robot operating
- Robot offline
- Connection restored
- Inactive report submitted
- Maintenance required
- Maintenance scheduled
- Maintenance completed
- Suspension
- Restoration
- Transfer initiated
- Transfer completed
- Lost or stolen report
- Retirement completed

Notification recipients depend on ownership, assignment, manufacturer, and administrative responsibility.

---

# Lifecycle Audit Requirements

The platform must audit:

- Robot creation
- Serial registration
- Identity conflict
- Ownership claim
- Ownership verification
- Activation
- Reactivation
- Assignment
- Operational-state override
- Inactive report
- Maintenance transition
- Emergency stop
- Suspension
- Restoration
- Transfer
- Replacement
- Lost or stolen status
- Retirement
- Administrative correction

Each audit record must identify:

- Actor
- Robot
- Previous state
- New state
- Timestamp
- Reason
- Source request
- Correlation ID
- Supporting records

---

# Robot Details Screen Requirements

The Robot Details screen should display a derived overview without hiding the underlying states.

Required sections:

## Identity

- Platform Robot ID
- Manufacturer
- Model
- Serial
- Firmware
- Activation date

## Ownership

- Current owner
- Ownership effective date
- Transfer status
- Ownership history access

## Current Status

- Lifecycle state
- Heartbeat state
- Operational state
- Assignment state
- Maintenance state
- Compliance state
- Financial eligibility

## Current Assignment

- Hiring Company
- Facility
- Department
- Contract
- Scheduled window
- Actual operation
- Serial confirmation

## Heartbeat

- Last valid heartbeat
- Online or offline
- Recent incidents
- Integration health

## Financial

- Verified time
- Pending gross earnings
- Owner platform fee
- Estimated net earnings
- Financial hold status

## Maintenance

- Current issue
- Severity
- Service status
- Expected completion
- Return-to-service status

## Actions

Actions should appear only when authorized and valid for the current state.

---

# Administrator Lifecycle Controls

Authorized administrators should be able to:

- View all state dimensions
- View state history
- Open investigation
- Suspend or restore
- Correct a registration conflict
- Resolve ownership dispute
- Approve exceptional transition
- Re-run activation checks
- Place financial hold
- End invalid assignment
- Approve retirement
- View audit and evidence

Administrators must not be able to freely type a new arbitrary state into the database.

All actions should use controlled transition commands.

---

# Manufacturer Lifecycle Controls

Manufacturers should be able to:

- Register robots
- View registration status
- Correct rejected registration data
- Provision credentials
- View activation diagnostics
- Submit firmware changes
- Initiate warranty replacement
- Report recall or safety issue
- View authorized fleet heartbeat status

Manufacturers must not be able to change legal ownership unilaterally after transfer without an approved ownership workflow.

---

# Robot Owner Lifecycle Controls

Robot Owners should be able to:

- View current robot state
- Complete activation
- Set future availability
- View assignments
- Report issue
- Request maintenance
- Initiate transfer
- Report lost or stolen
- Request retirement
- View historical earnings and ownership records

Robot Owners must not be able to:

- Edit verified heartbeat records
- Change active contract data unilaterally
- Mark maintenance complete without required verification
- Change serial
- Bypass suspension
- Backdate ownership
- Restore a retired robot

---

# Hiring Company Lifecycle Controls

Hiring Companies should be able to:

- View assigned robot identity and serial
- View operational status
- Report inactive or unsafe robot
- Request replacement
- Confirm assignment start or end where required
- View verified operating summaries
- View maintenance impact
- View replacement status

Hiring Companies must not be able to:

- Transfer ownership
- Change manufacturer data
- Alter heartbeat records
- Retire the robot
- Permanently suspend the robot
- Edit owner payroll

---

# Failure and Recovery Rules

The lifecycle must fail safely.

Examples:

- If activation verification is unavailable, keep the robot awaiting activation.
- If heartbeat verification fails, stop creating payable intervals.
- If ownership verification is unavailable, keep the claim pending.
- If audit storage fails, block sensitive state changes.
- If maintenance verification is unavailable, keep the robot awaiting verification.
- If matching fails, preserve current assignment and prevent conflicting assignment.
- If event publication fails after a database change, use an outbox for eventual delivery.

---

# Required Automated Tests

Lifecycle tests should include:

- Valid manufacturer registration
- Duplicate serial rejection
- Unsupported model rejection
- Ownership claim success
- Ownership dispute
- Activation success
- Activation invalid signature
- Activation unsupported firmware
- Reactivation after credential rotation
- Available-to-reserved transition
- Reservation expiration
- Assignment conflict
- Operating without active contract rejection
- Offline transition
- Restored connection
- Inactive company report
- Maintenance start
- Maintenance completion without verification rejection
- Return-to-service success
- Suspension
- Restoration
- Transfer during active assignment
- Transfer exceeding owner limit
- Correct earnings split at transfer timestamp
- Replacement during assignment
- Lost robot
- Stolen robot
- Retirement with active assignment rejection
- Retirement completion
- Retired robot heartbeat rejection
- Concurrent assignment attempt
- Stale state-version conflict
- Idempotent transition request
- Audit creation
- Event publication through outbox
- Fail-safe behavior when a critical dependency is unavailable

---

# Acceptance Criteria

This appendix is complete when:

- Every robot has a permanent and unique platform identity.
- Registration, ownership, activation, operational, maintenance, compliance, financial, and final lifecycle states are separated.
- The complete lifecycle from manufacturer registration through retirement is defined.
- Ownership has exact effective timestamps and immutable history.
- Activation requires verified manufacturer and heartbeat integration.
- Availability, reservation, assignment, operation, and payability are treated as separate states.
- Offline and inactive-report workflows preserve evidence and prevent improper billing.
- Maintenance requires return-to-service verification.
- Suspensions have defined effects, review deadlines, and restoration requirements.
- Transfers preserve contract, ownership, and financial continuity.
- Replacement robots retain separate identities and financial histories.
- Retirement prevents future payable operation without deleting history.
- State transitions are guarded, versioned, concurrency-safe, auditable, and event-driven.
- No user or administrator can bypass the lifecycle through arbitrary status editing.

# Next Appendix

# Appendix M — Expanded Immutable Rules

This appendix will consolidate the additional product rules that became clear during Appendices B through L, including financial, security, lifecycle, disclosure, audit, and operational rules that should be treated as fixed before Codex implementation begins.
