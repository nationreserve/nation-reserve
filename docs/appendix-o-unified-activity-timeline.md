# Editorial Note

**Appendix O is intended to appear immediately after Prompt 018 and before Prompt 019.**

During drafting, Prompts 019–023 were written before the finalized Appendix O was inserted. This appendix is therefore the authoritative version referenced throughout Prompts 019–023.

Any instruction in Prompts 019–023 referring to:

* Appendix O
* Unified Activity Timeline
* Activity Timeline System
* Timeline integration
* Timeline events
* Timeline projections
* Timeline requirements
* Timeline developer requirements

shall refer to this finalized Appendix O.

This appendix supersedes all earlier draft timeline notes.

---

# Appendix O — Unified Activity Timeline System

## Purpose

The Unified Activity Timeline System provides a consistent, chronological history for every significant object and workflow throughout RoboWorkPool.

It allows Robot Owners, Hiring Companies, Manufacturers, Platform Staff, Support Staff, Financial Administrators, and future authorized roles to understand the complete lifecycle of an object without manually searching across multiple pages.

The Timeline is **not** an audit log.

Instead:

* Audit logs exist for compliance and immutable evidence.
* Timelines exist for understandable operational history.

Both systems operate together.

---

# Primary Objectives

Every important business object shall provide:

* chronological history
* understandable status transitions
* related object navigation
* user activity
* system activity
* API activity
* administrator actions
* financial events
* operational events
* search
* filtering
* exporting
* permission-aware visibility

No major workflow should require users to manually reconstruct history from multiple screens.

---

# Timeline Principles

The Timeline system shall be:

* chronological
* immutable as historical presentation
* generated automatically
* permission aware
* searchable
* filterable
* exportable
* linked to related objects
* consistent across every portal

Timeline events explain **what happened**, not how the underlying database changed.

---

# Relationship to Audit Logs

Timeline entries are **not** replacements for audit records.

Audit logs provide:

* compliance
* forensic evidence
* immutable change history
* internal diagnostics

Timeline entries provide:

* readable business history
* workflow understanding
* customer support visibility
* operational context

Both may reference the same underlying event.

---

# Timeline Architecture

Every Timeline Event originates from:

```text
User Action
System Process
Background Worker
Manufacturer API
Heartbeat API
Payment Provider
Notification Engine
Administrator
Deployment System
Acceptance System
```

Events are emitted through the platform Event Bus.

The Timeline service subscribes to those events and creates permission-aware timeline projections.

Frontends never manually create timeline entries.

---

# Event Schema

Every Timeline Event shall contain:

```text
Timeline Event ID
Timestamp (UTC)

Display Timestamp

Event Type

Category

Summary

Expanded Description

Actor

Actor Organization

Actor Role

Target Entity

Target Entity Type

Related Objects

Current Status

Previous Status

Metadata

Attachments (when permitted)

Source System

Correlation ID
```

---

# Timeline Categories

Supported categories include:

```text
Organization

Robot

Ownership

Manufacturer

Hiring Company

Robot Owner

Training

Training Equipment

Training Session

Training Package

Work Order

Opportunity

Messaging

Contract

Assignment

Scheduling

Heartbeat

Verified Operating Time

Financial

Invoice

Payment

Statement

Payout

Support

Dispute

Incident

Notification

Administration

Deployment

Release

Migration

Acceptance

System
```

Additional categories may be introduced without changing existing events.

---

# Timeline Sources

Timeline entries may originate from:

* User interaction
* Automated workflow
* Background worker
* Manufacturer integration
* Robot Heartbeat API
* Financial provider
* Platform administration
* Release automation
* Acceptance validation

Every event shall identify its source.

---

# Timeline Permissions

Every timeline is permission scoped.

Users only see events they are authorized to view.

Examples:

Robot Owners cannot view:

* confidential negotiations
* competing manufacturers
* private company financial records

Hiring Companies cannot view:

* another company's timelines
* competing manufacturer conversations
* owner payout details

Manufacturers cannot view:

* competing manufacturer proposals
* company internal administration
* owner financial history

Platform Staff receive additional visibility according to role.

---

# Timeline Search

Every timeline supports:

* keyword search
* event category
* organization
* user
* robot
* manufacturer
* contract
* work order
* facility
* date range
* status
* severity

---

# Timeline Display

Every timeline supports:

* newest first
* oldest first
* grouped view
* expanded view
* compact view
* pagination
* infinite scrolling
* mobile cards
* desktop tables

Users may select preferred ordering.

---

# Timeline Navigation

Every event should link to related objects where authorized.

Example:

```text
Robot

↓

Assignment

↓

Contract

↓

Invoice

↓

Payment

↓

Owner Statement

↓

Payout
```

Navigation should never expose unauthorized resources.

---

# Organization Timeline

Include:

* organization created
* organization verified
* organization suspended
* organization restored
* administrator invited
* administrator removed
* settings changed

---

# Hiring Company Timeline

Include:

* organization created
* facility created
* department created
* work area created
* workforce plan created
* job definition created
* motion-training equipment requested
* motion-training equipment purchased (when applicable)
* external equipment registered
* equipment connected
* calibration completed
* training session recorded
* training files uploaded
* training package approved
* work order published
* manufacturer interest received
* manufacturer selected
* private opportunity created
* contract approved
* robot allocation
* schedule published
* verified operation
* inactive report
* replacement
* invoice generated
* payment settled

---

# Manufacturer Timeline

Include:

* application submitted
* sandbox approved
* production approved
* robot model approved
* robot registered
* ownership transfer initiated
* ownership transfer completed
* work order viewed
* manufacturer interest submitted
* private opportunity received
* training access granted
* training reviewed
* task clarification requested
* contract approved
* robot allocated
* heartbeat validated
* inactive report received
* replacement completed

---

# Robot Owner Timeline

Include:

* ownership claim
* ownership approved
* ownership transfer
* robot activated
* robot assigned
* verified operating time
* earnings accrued
* statement generated
* payout prepared
* payout completed
* ownership retired

---

# Robot Timeline

Every robot maintains its own lifecycle.

Include:

* manufactured
* registered
* approved
* activated
* ownership transfer
* assignment
* heartbeat started
* heartbeat interruption
* verified operation
* inactive report
* replacement
* maintenance
* retirement

---

# Work Order Timeline

Include:

* draft
* published
* manufacturer viewed
* interest submitted
* access granted
* opportunity created
* contract created
* paused
* closed

---

# Opportunity Timeline

Include:

* created
* manufacturer invited
* manufacturer accepted
* additional information requested
* site assessment requested
* negotiations
* contract drafted
* closed

---

# Training Equipment Timeline

Include:

* purchase requested
* purchased
* externally acquired
* registered
* connected
* tested
* calibrated
* disconnected
* retired

---

# Training Session Timeline

Include:

* created
* recorded
* imported
* validated
* uploaded
* archived

---

# Training Package Timeline

Include:

* draft
* upload completed
* review requested
* approved
* shared
* revision requested
* new version
* archived

---

# Messaging Timeline

Include:

* conversation created
* participant added
* participant removed
* attachment uploaded
* response requested
* response received
* archived

---

# Contract Timeline

```text
Work Order Published

↓

Manufacturer Interest

↓

Private Opportunity

↓

Training Shared

↓

Negotiation

↓

Contract Draft

↓

Version Submitted

↓

Version Approved

↓

Robots Allocated

↓

Schedules Published

↓

Verified Operation

↓

Inactive Report

↓

Replacement

↓

Invoice

↓

Payment

↓

Owner Statement

↓

Payout

↓

Contract Completed
```

---

# Assignment Timeline

Include:

* assignment created
* robot allocated
* robot replaced
* schedule updated
* assignment completed

---

# Schedule Timeline

Include:

* schedule published
* schedule modified
* schedule paused
* resumed
* completed

---

# Heartbeat Timeline

Include:

* heartbeat received
* heartbeat validated
* heartbeat rejected
* duplicate detected
* replay detected
* robot offline
* robot restored

---

# Verified Operating Timeline

Include:

* operating interval started
* interval verified
* interval finalized
* interval held
* interval released

---

# Invoice Timeline

Include:

* generated
* delivered
* viewed
* payment submitted
* payment processing
* settled
* refunded
* disputed

---

# Payment Timeline

Include:

* initiated
* processing
* settled
* failed
* refunded
* chargeback

---

# Statement Timeline

Include:

* generated
* finalized
* reviewed

---

# Payout Timeline

Include:

* queued
* processing
* paid
* failed
* corrected

---

# Support Timeline

Include:

* ticket opened
* assigned
* escalated
* resolved
* closed

---

# Dispute Timeline

Include:

* opened
* evidence added
* reviewed
* resolved
* appealed
* closed

---

# Incident Timeline

Include:

* incident created
* investigation
* mitigation
* resolved
* postmortem

---

# Platform Administration Timeline

Include:

* manufacturer approval
* robot model approval
* configuration changes
* feature flag changes
* maintenance windows
* announcement publication

---

# Release Timeline

Include:

* release created
* build completed
* staging deployed
* production deployed
* rollback
* completed

---

# Migration Timeline

Include:

* migration started
* migration completed
* migration failed
* restore initiated
* restore completed

---

# Acceptance Timeline

Include:

* acceptance run started
* acceptance completed
* acceptance failed
* gap detected
* waiver approved
* MVP accepted

---

# Timeline Relationships

Events should automatically relate to:

* organizations
* users
* robots
* contracts
* work orders
* opportunities
* facilities
* assignments
* invoices
* statements
* payouts
* disputes
* incidents

This allows seamless navigation between related records.

---

# Timeline Export

Support:

* CSV
* PDF
* JSON (administrative/export use)
* print-friendly format

Exports must respect permissions.

---

# Timeline Performance

Support:

* pagination
* lazy loading
* background projection updates
* indexed search
* caching where appropriate

Timelines should remain responsive even with millions of events.

---

# Timeline Retention

Timeline history should remain available according to platform retention policy.

Historical business events should not be silently deleted.

Archived events remain searchable where permitted.

---

# Timeline APIs

Every timeline should expose standardized APIs for:

* event listing
* event search
* filtering
* related objects
* export
* pagination

API responses should remain consistent across every entity type.

---

# Timeline Testing

Every entity with a timeline shall have automated tests verifying:

* event generation
* event ordering
* permissions
* related-object links
* filtering
* exports
* duplicate prevention
* recovery after queue interruption

---

# Developer Compliance Requirement

Every future implementation prompt beginning with **Prompt 019** shall treat this appendix as authoritative.

No entity, workflow, feature, API, background worker, financial event, notification, deployment, migration, release, acceptance run, or operational process shall be considered complete unless its lifecycle events have been integrated into the **Unified Activity Timeline System** defined in Appendix O.

Any intentional omission must be explicitly documented as an approved exception within the specification registry.

---

I think this should now be treated as the **canonical Appendix O**. It cleanly slots between **Prompt 018** and **Prompt 019**, and all of the references made in Prompts **019–023** now resolve to this single, authoritative specification.

