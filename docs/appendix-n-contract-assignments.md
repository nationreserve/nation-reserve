# Nation Reserve Master Specification

# Volume II — Appendix N

# Contract & Assignment Specification

**Version:** 1.0
**Status:** Authoritative Contract, Workforce Planning, and Assignment Specification

---

# Purpose

This appendix defines how Hiring Companies request robot labor, how contracts are created, how robots are matched to work, how assignments operate, and how work is completed.

It governs:

- Workforce planning
- Contract creation
- Company approval
- Robot matching
- Assignment lifecycle
- Scheduling
- Replacement robots
- Company reporting
- Completion
- Cancellation
- Financial eligibility

A contract is the legal agreement.

An assignment is the operational deployment of one or more specific robots under that contract.

These are separate concepts.

---

# Core Principles

## Rule N-001 — Contract Before Assignment

A robot cannot receive a production assignment without an active contract.

---

## Rule N-002 — Assignment Before Pay

A robot cannot generate payable operating time without an active assignment.

---

## Rule N-003 — Schedule Is Not Pay

Schedules define expected work windows.

Schedules never create payroll or billing by themselves.

---

## Rule N-004 — One Assignment Per Robot

A robot may only have one incompatible active assignment at any moment.

---

# Contract Hierarchy

```text
Hiring Company
    ↓
Facility
    ↓
Department
    ↓
Contract
    ↓
Assignment(s)
    ↓
Robot(s)
```

One contract may contain many assignments.

One assignment may contain one or many robots.

---

# Workforce Planning

Before creating a contract, a company should complete a Workforce Plan.

A Workforce Plan is **not** a contract.

It is an estimate used to plan labor needs.

Each plan may include:

- Facility
- Department
- Job category
- Number of robots
- Preferred operating schedule
- Expected duration
- Special capabilities
- Priority
- Notes

Plans may be edited freely until a contract is created.

---

# Contract Types

The MVP should support:

### Ongoing Contract

Recurring operational robot labor.

---

### Fixed-Term Contract

Runs between defined start and end dates.

---

### Temporary Contract

Short-duration deployments.

---

### Pilot Contract

Testing or evaluation deployments.

Pilot contracts should still use the same heartbeat, payroll, and billing rules.

---

# Contract Record

Every contract should include:

```text
Contract ID
Company
Facility
Department
Status
Contract Type
Start Date
End Date
Renewal Settings
Requested Robot Count
Assigned Robot Count
Priority
Operating Windows
Required Capabilities
Rate Version
Created By
Approval Status
Cancellation Status
Audit Reference
```

---

# Contract Statuses

Recommended states:

- Draft
- Pending Approval
- Approved
- Active
- Partially Staffed
- Fully Staffed
- Suspended
- Completed
- Cancelled
- Archived

---

# Company Approval

Only authorized company users may approve contracts.

Approval should verify:

- Company account is active
- Payment method is valid
- Spending limits allow the contract
- Facility exists
- Department exists
- Requested robot capabilities are supported
- Operating windows are valid

---

# Required Robot Capabilities

Companies may optionally specify requirements such as:

- Lift capacity
- Indoor operation
- Outdoor operation
- Navigation type
- Manipulator support
- Battery endurance
- Environmental restrictions

The matching engine must only assign robots meeting required capabilities.

---

# Assignment Record

Every assignment must include:

```text
Assignment ID
Contract ID
Robot ID
Robot Serial
Owner ID
Company
Facility
Department
Scheduled Start
Scheduled End
Actual Start
Actual End
Status
Replacement Robot
Completion Reason
Verified Operating Time
Financial Status
```

---

# Assignment Status

Assignments may be:

- Pending
- Reserved
- Ready
- Active
- Paused
- Interrupted
- Completed
- Cancelled
- Replaced

---

# Assignment Start

Before becoming Active:

- Contract must be Active.
- Robot must be Activated.
- Robot must not be suspended.
- Robot must not be under maintenance.
- Company payment controls must pass.
- Heartbeat must be valid.

Only then may the assignment begin.

---

# Staffing Levels

Contracts should track:

```text
Requested Robots

Assigned Robots

Operating Robots

Unavailable Robots

Replacement Needed
```

Example:

Requested:

10

Assigned:

10

Operating:

9

Unavailable:

1

Replacement Needed:

1

---

# Partial Staffing

If a company requests:

20 robots

but only:

14

are available,

the contract should become:

**Partially Staffed**

The company dashboard should clearly show staffing progress.

---

# Replacement Requests

A Hiring Company may request a replacement robot when one becomes:

- Offline
- Unsafe
- Damaged
- Incorrect robot
- Maintenance required

Replacement requests should include:

- Assignment
- Robot serial
- Reason
- Urgency

---

# Replacement Workflow

```text
Robot Offline

↓

Company Reports

↓

Platform Validates

↓

Replacement Search

↓

Replacement Assigned

↓

Original Assignment Closed

↓

Replacement Assignment Begins
```

Financial history remains tied to each robot individually.

---

# Company Dashboard

Each active contract should display:

- Requested robots
- Assigned robots
- Operating robots
- Offline robots
- Maintenance robots
- Replacement requests
- Active serial numbers
- Verified operating hours
- Estimated invoice
- Current staffing percentage

---

# Staffing Percentage

Example:

Requested:

20 robots

Operating:

18 robots

Staffing:

90%

This is operational information only.

It does not determine billing.

---

# Assignment Matching Engine

When selecting robots, the platform should evaluate:

1. Robot eligibility
2. Capability match
3. Geographic eligibility
4. Operational availability
5. Maintenance status
6. Current assignment conflicts
7. Manufacturer approval
8. Owner eligibility
9. Contract requirements

The platform should not optimize solely for shortest distance or first available robot.

---

# Assignment Priority

Contracts may define:

- Normal
- High
- Critical

Priority affects matching order only.

It does not affect the $5 base operating rate.

---

# Scheduling Windows

Assignments may define:

- Daily windows
- Weekly windows
- Custom recurring windows
- One-time windows

The schedule defines expected operating periods.

Heartbeat still determines payable time.

---

# Missed Assignment Start

If a robot does not begin operating:

The platform should:

- Notify owner
- Notify company
- Attempt replacement if required
- Record operational incident

No payroll is generated until verified operation begins.

---

# Assignment Interruptions

Assignments may be interrupted by:

- Offline heartbeat
- Maintenance
- Emergency stop
- Company report
- Safety issue
- Weather (future)
- Manufacturer recall
- Platform suspension

The interruption should preserve all completed verified operating time.

---

# Company Early Termination

Companies may request early assignment completion.

The system should:

- Record termination reason
- End future payable intervals
- Preserve prior operation
- Notify owner
- Update staffing

---

# Owner Withdrawal

An owner may request removal of a robot.

Restrictions apply if:

- Active assignment exists
- Contract obligations prevent immediate removal
- Safety review required

The platform may delay withdrawal until permitted by contract.

---

# Emergency Removal

The platform may immediately remove a robot from assignment when:

- Safety risk
- Fraud investigation
- Credential compromise
- Emergency stop
- Critical maintenance

This action must be audited.

---

# Assignment Completion

Completion records should include:

- Completion reason
- Final verified hours
- Final operational status
- Final heartbeat status
- Billing status
- Payroll status

---

# Contract Completion

A contract completes when:

- End date reached
- Company completes work
- Cancelled
- All assignments closed

Completion should:

- Generate final billing
- Close staffing records
- Preserve history

---

# Contract Cancellation

Cancellation reasons may include:

- Company request
- Payment failure
- Fraud
- Legal issue
- Mutual agreement
- Administrative action

Historical assignments remain preserved.

---

# Automatic Renewal

Recurring contracts may automatically renew.

Renewal should create a new contract period while preserving the original contract history.

---

# Contract Versioning

Changes to:

- Operating windows
- Robot count
- Facility
- Department
- Priority

should create a new contract version.

Historical versions remain preserved.

---

# Performance Metrics

Each contract may calculate:

- Verified robot-hours
- Average staffing %
- Downtime
- Replacement count
- Offline incidents
- Completion rate
- Average response time

These are reporting metrics only.

---

# Assignment Audit

Every assignment transition must create an audit event.

Examples:

- Assignment created
- Assignment started
- Robot replaced
- Assignment paused
- Assignment resumed
- Assignment completed
- Assignment cancelled

---

# Notifications

Relevant users should receive notifications for:

- Contract approved
- Contract activated
- Robot assigned
- Robot replaced
- Robot offline
- Assignment completed
- Contract completed
- Contract cancelled

---

# API Requirements

Required endpoints include:

```text
POST /contracts
GET /contracts
PATCH /contracts

POST /assignments
GET /assignments

POST /replacement-request

POST /assignment/pause

POST /assignment/complete
```

These should follow the versioned API architecture defined earlier.

---

# Required Automated Tests

The implementation should test:

- Contract creation
- Contract approval
- Partial staffing
- Full staffing
- Assignment creation
- Assignment conflict rejection
- Offline replacement
- Maintenance replacement
- Company early termination
- Owner withdrawal
- Emergency removal
- Automatic renewal
- Version preservation
- Final billing generation
- Final payroll generation
- Audit creation

---

# Acceptance Criteria

This appendix is complete when:

- Contracts and assignments are clearly separated.
- Workforce planning is separate from contracts.
- Scheduling is separate from payroll.
- Robot matching rules are defined.
- Partial staffing is supported.
- Replacement workflows are defined.
- Completion and cancellation preserve history.
- Versioning and audits are required.
- Billing and payroll depend only on verified operating time.
- All assignment changes are fully traceable.

---

## Recommendation Before Continuing

At this point, I would add one more foundational appendix **before** moving on to UI implementation:

**Appendix O — Matching & Marketplace Engine**

That appendix would define:

- How Robot Owners opt their robots into the available pool.
- How companies receive robot matches.
- Capacity allocation when demand exceeds supply.
- Waitlists for contracts.
- Fairness rules (to avoid always selecting the same owners).
- Geographic search and travel limits.
- Capability weighting.
- Priority handling for critical contracts.
- Future auction or bidding support (if ever desired).

That matching logic is central to RoboWorkPool and will affect nearly every backend service, so it's worth specifying before implementation.
