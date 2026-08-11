# Nation Reserve Master Specification

# Volume I — Appendix D

# Data Ownership & Relationships

**Version:** 1.0
**Status:** Authoritative Data Architecture Specification

---

# Purpose

This appendix defines the ownership, lifecycle, and relationships of every major data entity in RoboWorkPool.

Its objectives are to:

- Eliminate ambiguity in database design.
- Prevent duplicate ownership models.
- Define parent/child relationships.
- Establish deletion and retention rules.
- Provide a foundation for APIs, permissions, auditing, and reporting.

Every table, API, and business rule implemented by Codex should conform to this appendix.

---

# Core Design Principles

The data model should prioritize:

- Single source of truth
- Explicit ownership
- Immutable audit history
- Soft deletion where historical integrity is important
- Referential integrity
- Scalability for millions of records
- Clear separation between operational and historical data

---

# Ownership Hierarchy

At the highest level:

```text
Nation Reserve Platform
│
├── Users
│   ├── Robot Owners
│   ├── Hiring Company Users
│   ├── Manufacturer Users
│   └── Administrators
│
├── Companies
│   ├── Facilities
│   ├── Departments
│   ├── Contracts
│   └── Invoices
│
├── Manufacturers
│   ├── Robot Models
│   ├── Firmware Versions
│   └── Registered Robots
│
├── Robots
│   ├── Heartbeats
│   ├── Assignments
│   ├── Maintenance Records
│   ├── Ownership History
│   └── Audit Events
```

---

# Entity: User

A User is the authentication identity.

A User may have exactly one primary role:

- Robot Owner
- Hiring Company User
- Manufacturer User
- Administrator

Future versions may allow multiple roles if required, but MVP should enforce one primary role.

## User Owns

- Authentication credentials
- MFA settings
- Notification preferences
- Session history
- API tokens (where applicable)
- Support tickets

Users never directly own contracts, robots, or invoices unless acting through their associated entity.

---

# Entity: Robot Owner

A Robot Owner represents the person or organization that legally owns robots.

## Robot Owner Owns

- Robot portfolio
- Banking information
- Tax information
- Downpayment Queue position
- Payroll records
- Ownership transfers

## Robot Owner References

- User
- Robots
- Payments
- Notifications
- Documents

A Robot Owner may own up to **20 active robots**.

---

# Entity: Hiring Company

Represents the customer purchasing robot labor.

## Hiring Company Owns

- Facilities
- Departments
- Contracts
- Workforce plans
- Billing profile
- Invoices
- Payment history

## Hiring Company References

- Users
- Assignments
- Reports
- Notifications

Hiring Companies do **not** own robots.

---

# Entity: Manufacturer

Represents an approved robot manufacturer.

## Manufacturer Owns

- Robot models
- Firmware versions
- API credentials
- API configuration
- Heartbeat integrations
- Documentation

## Manufacturer References

- Registered robots
- Analytics
- Support records

Manufacturers do not own robots after sale unless they retain ownership through a Robot Owner account.

---

# Entity: Robot Model

Represents a hardware model.

Examples:

- Atlas X1
- Atlas X2

Robot Models Own:

- Specifications
- Supported firmware
- Capabilities
- Certification status

Robot Models do not own robots.

---

# Entity: Robot

Robot is the central operational object.

Every Robot has:

- One serial number
- One manufacturer
- One current owner
- One operational state

A robot cannot exist without:

- Manufacturer
- Robot Owner

---

## Robot Owns

Heartbeats

Assignments

Maintenance records

Operational history

Ownership history

Documents

Audit history

Firmware installation history

Performance metrics

---

## Robot References

Manufacturer

Robot Model

Current Contract (if assigned)

Current Assignment

Current Status

---

# Ownership History

Ownership history is immutable.

Transfering ownership creates:

New ownership record

End date for previous owner

Reason

Administrator reference (if applicable)

History is never deleted.

---

# Entity: Heartbeat

Heartbeats belong to exactly one robot.

---

Heartbeat Stores

Timestamp

Robot serial

Connection status

Firmware version

Runtime

Health indicators

Verification status

Network metadata

---

Heartbeats are immutable.

Corrections occur through administrative annotations, not edits.

---

# Entity: Facility

Facilities belong to Hiring Companies.

Facility Owns:

Departments

Assignments

Location

Operating hours

Facility settings

---

# Entity: Department

Department belongs to exactly one Facility.

Departments Own:

Workforce plans

Assignments

Schedules

Department settings

---

# Entity: Workforce Plan

Belongs to:

Department

Owns:

Projected staffing

Coverage

Expected robot count

Expected operating hours

Planning notes

---

Workforce plans never generate payroll directly.

---

# Entity: Contract

Belongs to:

Hiring Company

A Contract Owns:

Assignments

Billing

Operational history

Status history

Approval history

Documents

---

Contracts Reference:

Facilities

Departments

Robots

Invoices

---

Contracts do not own robots.

---

# Entity: Assignment

Assignment belongs to one Contract.

Assignment references:

One robot

One facility

One department

One operating window

---

Assignment Owns

Assignment history

Completion records

Status changes

Administrative notes

---

Assignments never own payroll.

Payroll references assignments and heartbeat verification.

---

# Entity: Invoice

Invoice belongs to one Hiring Company.

Invoice Owns:

Invoice lines

Taxes

Platform fees

Credits

Adjustments

Payments

Status history

---

Invoice References

Contracts

Assignments

Verified hours

---

# Entity: Payment

Payment belongs to:

Invoice

or

Payroll

depending on payment direction.

---

Payment Owns

Transaction history

Provider IDs

Settlement status

Receipts

Refunds

---

# Entity: Payroll Record

Payroll belongs to Robot Owner.

Payroll references:

Verified hours

Robots

Contracts

Assignments

Payment

Tax documents

---

Payroll never edits historical heartbeat data.

---

# Entity: Maintenance Record

Belongs to Robot.

Owns:

Problem description

Diagnosis

Repair

Technician

Resolution

Parts

Dates

Warranty reference

---

# Entity: Notification

Notification belongs to User.

Notification references:

Robot

Contract

Invoice

Payroll

Maintenance

Queue

Support ticket

---

Notifications are retained according to platform retention policies.

---

# Entity: Support Ticket

Belongs to User.

References:

Robot

Contract

Invoice

Heartbeat

Queue

Support staff

---

Support tickets own:

Messages

Attachments

Status history

Priority history

---

# Entity: Queue Position

Belongs to Robot Owner.

Owns:

Current position

Movement history

Reservation

Downpayment

Estimated fulfillment

---

Queue positions are never reused without audit history.

---

# Entity: Audit Log

Audit logs are append-only.

Every audit entry stores:

Timestamp

Actor

Action

Object type

Object ID

Previous value (when applicable)

New value

Source

IP address (when applicable)

Reason

---

Audit logs are never edited.

---

# Entity: Document

Documents belong to one parent object.

Examples:

Robot warranty

Tax document

Invoice PDF

Contract PDF

Identity verification

Maintenance reports

---

Documents reference:

User

Robot

Invoice

Contract

Payroll

Support ticket

---

# Deletion Rules

The following records should never be permanently deleted during normal operation:

- Robots
- Contracts
- Invoices
- Payroll
- Payments
- Heartbeats
- Audit Logs
- Ownership History
- Queue History

Instead, they should use inactive, archived, retired, or superseded states where appropriate.

---

# Cascading Rules

Deletion (or archival) should not automatically remove historical child records.

For example:

- Archiving a Robot Owner does not remove robots or payroll history.
- Retiring a Robot does not remove heartbeats or assignments.
- Closing a Contract does not remove invoices or audit logs.

Historical integrity takes precedence over storage convenience.

---

# Relationship Summary

| Parent         | Owns                                                    |
| -------------- | ------------------------------------------------------- |
| User           | Credentials, sessions, preferences, support tickets     |
| Robot Owner    | Robots, payroll, queue position                         |
| Hiring Company | Facilities, departments, contracts, invoices            |
| Manufacturer   | Models, firmware, API credentials                       |
| Robot          | Heartbeats, maintenance, assignments, ownership history |
| Facility       | Departments                                             |
| Department     | Workforce plans                                         |
| Contract       | Assignments, billing history                            |
| Assignment     | Operational records                                     |
| Invoice        | Payments, invoice lines                                 |
| Payroll        | Payroll payments                                        |
| Robot          | Maintenance records                                     |
| User           | Notifications                                           |
| User           | Support tickets                                         |

---

# Design Constraints

1. Every entity has a single authoritative owner.
2. Cross-references should not imply ownership.
3. Historical data should be preserved.
4. Financial records must be immutable except through authorized adjustments.
5. Audit logs must exist for all sensitive operations.
6. Ownership transfers must preserve complete history.
7. Heartbeats remain the authoritative operational record for payable uptime.

---

# Acceptance Criteria

This appendix is complete when:

- Every major entity has a clearly defined owner.
- Parent-child relationships are explicitly documented.
- Data retention and deletion rules are established.
- Ownership and references are distinguished.
- Historical integrity requirements are defined.
- The specification provides a stable foundation for database schema design, APIs, permissions, and auditing.

---

## Recommendation Before Appendix E

One refinement I'd like to introduce in the API specification is to distinguish between **public APIs** (used by the website), **authenticated client APIs** (used by Robot Owners, Hiring Companies, and Administrators), and **manufacturer integration APIs** (used by the Heartbeat system). Separating these classes now will make authentication, rate limiting, versioning, and security much cleaner when we define every endpoint in Appendix E.
