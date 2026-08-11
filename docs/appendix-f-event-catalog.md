# Nation Reserve Master Specification

# Volume I — Appendix F

# Event Catalog

**Version:** 1.0
**Status:** Authoritative Event-Driven Architecture Specification

---

# Purpose

RoboWorkPool should be designed as an **event-driven platform**, where significant business actions generate events that other services can react to without tight coupling.

Rather than having every subsystem call every other subsystem directly, events allow payroll, billing, notifications, reporting, auditing, analytics, and future integrations to remain independent while responding consistently to changes.

This appendix defines:

- Every major event
- The event producer
- Event payload requirements
- Consumers
- Retry behavior
- Ordering expectations
- Audit requirements
- Idempotency requirements

---

# Event Design Principles

Every event should be:

- Immutable
- Timestamped
- Versioned
- Globally unique
- Auditable
- Replayable
- Idempotent

Events are facts.

They should **never** be edited after publication.

---

# Standard Event Envelope

Every event should contain:

```text
Event ID
Event Type
Event Version
Timestamp (UTC)
Producer Service
Correlation ID
Actor
Entity Type
Entity ID
Payload
```

Example:

```json
{
  "eventId": "evt_001",
  "eventType": "robot.heartbeat.received",
  "version": "1",
  "timestamp": "2027-01-01T12:00:00Z",
  "producer": "heartbeat-service",
  "correlationId": "req_123",
  "entityType": "Robot",
  "entityId": "robot_456",
  "payload": {}
}
```

---

# Event Categories

Platform events are grouped into:

- Authentication
- User
- Queue
- Robot
- Manufacturer
- Heartbeat
- Contract
- Assignment
- Billing
- Payroll
- Maintenance
- Notification
- Support
- Administrative
- Security
- System

---

# Authentication Events

## auth.user.registered

Triggered:

New account created.

Consumers:

- Email Service
- Audit Service
- Analytics

---

## auth.email.verified

Consumers:

- User Service
- Notification Service

---

## auth.user.logged_in

Consumers:

- Security
- Analytics
- Audit

---

## auth.password.changed

Consumers:

- Security
- Notifications

---

## auth.mfa.enabled

Consumers:

- Security
- Audit

---

# User Events

## user.profile.updated

Consumers:

- Audit
- Analytics

---

## user.preferences.updated

Consumers:

- Notification Service

---

## user.account.suspended

Consumers:

- Security
- Contracts
- Notifications

---

# Queue Events

## queue.joined

Triggered:

User enters downpayment queue.

Consumers:

- Queue Service
- Notifications
- Analytics

---

## queue.position.changed

Triggered whenever position changes.

Consumers:

- Notification Service
- Dashboard
- Analytics

---

## queue.downpayment.received

Consumers:

- Billing
- Queue
- Audit

---

## queue.reservation.completed

Consumers:

- Robot Fulfillment
- Notifications

---

# Manufacturer Events

## manufacturer.approved

Consumers:

- API Service
- Notifications

---

## manufacturer.api.created

Consumers:

- Audit
- Security

---

## manufacturer.model.registered

Consumers:

- Robot Registry

---

## manufacturer.robot.registered

Consumers:

- Robot Registry
- Analytics

---

# Robot Events

## robot.created

Robot successfully registered.

Consumers:

- Robot Registry
- Audit

---

## robot.activated

Consumers:

- Dashboard
- Contracts
- Notifications

---

## robot.transferred

Consumers:

- Payroll
- Ownership History
- Audit

---

## robot.retired

Consumers:

- Payroll
- Contracts
- Billing
- Analytics

---

## robot.suspended

Consumers:

- Contracts
- Billing
- Notifications

---

# Heartbeat Events

This is the most critical event family in RoboWorkPool.

---

## heartbeat.received

Generated every valid heartbeat.

Consumers:

- Verification
- Monitoring

---

## heartbeat.verified

Generated after validation succeeds.

Consumers:

- Payroll
- Billing
- Analytics
- Reporting

This event contributes to payable operating time.

---

## heartbeat.invalid

Consumers:

- Security
- Manufacturer Dashboard
- Audit

---

## heartbeat.missed

Triggered after allowable tolerance expires.

Consumers:

- Notifications
- Monitoring
- Assignment Service

---

## heartbeat.connection.restored

Consumers:

- Dashboard
- Notifications

---

## heartbeat.robot.offline

Consumers:

- Payroll
- Contracts
- Notifications

---

## heartbeat.robot.online

Consumers:

- Payroll
- Contracts
- Dashboard

---

# Contract Events

## contract.created

Consumers:

Assignments

Notifications

Audit

---

## contract.approved

Consumers:

Robot Assignment

Billing

Notifications

---

## contract.cancelled

Consumers:

Billing

Assignments

Payroll

---

## contract.completed

Consumers:

Reporting

Billing

Analytics

---

# Assignment Events

## assignment.created

Consumers:

Robot Service

Notifications

---

## assignment.started

Consumers:

Dashboard

Reporting

---

## assignment.completed

Consumers:

Payroll

Billing

Reports

---

## assignment.cancelled

Consumers:

Notifications

Audit

---

# Billing Events

## invoice.created

Consumers:

Notification

Accounting

Reports

---

## invoice.sent

Consumers:

Customer Portal

---

## invoice.paid

Consumers:

Payroll

Analytics

Audit

---

## invoice.overdue

Consumers:

Notifications

Collections

---

## payment.received

Consumers:

Accounting

Reports

---

## refund.created

Consumers:

Accounting

Audit

---

# Payroll Events

## payroll.calculated

Consumers:

Payroll Review

Reports

---

## payroll.approved

Consumers:

Payment Processor

---

## payroll.sent

Consumers:

Notifications

Reports

---

## payroll.completed

Consumers:

Dashboard

Analytics

---

## payroll.failed

Consumers:

Support

Notifications

---

# Maintenance Events

## maintenance.requested

Consumers:

Manufacturer

Dashboard

---

## maintenance.started

Consumers:

Notifications

Reports

---

## maintenance.completed

Consumers:

Robot Service

Notifications

---

## maintenance.cancelled

Consumers:

Audit

---

# Notification Events

## notification.created

Consumers:

Email

SMS

Push

In-App

---

## notification.delivered

Consumers:

Analytics

---

## notification.failed

Consumers:

Retry Queue

Support

---

# Support Events

## ticket.created

Consumers:

Support Dashboard

Notifications

---

## ticket.updated

Consumers:

Support

Audit

---

## ticket.closed

Consumers:

Analytics

---

# Administrative Events

## admin.user.suspended

Consumers:

Security

Audit

Notifications

---

## admin.contract.override

Consumers:

Audit

Reports

---

## admin.billing.adjustment

Consumers:

Accounting

Audit

---

## admin.queue.modified

Consumers:

Queue

Notifications

Audit

---

# Security Events

## security.login.failed

Consumers:

Fraud Detection

Audit

---

## security.rate.limit.triggered

Consumers:

Security

Monitoring

---

## security.signature.invalid

Consumers:

Manufacturer Dashboard

Security

---

## security.permission.denied

Consumers:

Audit

Monitoring

---

# System Events

## system.started

Consumers:

Monitoring

---

## system.degraded

Consumers:

Operations

---

## system.recovered

Consumers:

Operations

---

## system.backup.completed

Consumers:

Audit

Operations

---

# Event Ordering

Certain events must occur in order.

Example:

```text
Robot Registered

↓

Robot Activated

↓

Heartbeat Received

↓

Heartbeat Verified

↓

Assignment Started

↓

Payroll Calculated

↓

Payroll Sent

↓

Payroll Completed
```

Out-of-order events should be rejected or buffered according to service requirements.

---

# Retry Policy

Transient delivery failures should be retried using exponential backoff.

Events that remain undeliverable after the configured retry limit should be placed into a dead-letter queue for investigation.

Retries must never result in duplicate business actions.

---

# Idempotency

Every consumer must safely ignore duplicate deliveries.

Examples:

- Duplicate invoice notifications should not send multiple invoices.
- Duplicate payroll events should not create multiple payroll payments.
- Duplicate robot activation events should not reactivate an already active robot.
- Duplicate heartbeat events with the same sequence number should not generate additional payable time.

---

# Correlation IDs

Every request entering the platform should receive a Correlation ID.

All events generated as part of that request must carry the same Correlation ID to enable complete tracing across services.

---

# Event Versioning

Each event type should include a version number.

- Additive payload changes should preserve compatibility where possible.
- Breaking payload changes require a new event version.
- Consumers should support multiple active versions during migration periods.

---

# Event Retention

Operational events should be retained according to platform policy.

Financial, security, payroll, ownership, and audit-related events should be retained for the full required legal and compliance periods and should not be routinely purged.

---

# Audit Requirements

The following events must always create audit records:

- Ownership transfers
- Queue modifications
- Billing adjustments
- Payroll processing
- Contract approvals
- Robot retirement
- Manufacturer approval
- Administrative overrides
- Security violations
- Heartbeat validation failures due to policy or security

---

# Future Integration Events

The event architecture should be extensible to support:

- Enterprise webhooks
- ERP integrations
- Accounting software
- Payroll systems
- Analytics platforms
- Mobile push services
- SMS providers
- Email providers
- External monitoring systems

---

# Acceptance Criteria

This appendix is complete when:

- All major business events are identified.
- Event producers and consumers are defined.
- Ordering, retry behavior, idempotency, and versioning expectations are established.
- Heartbeat events are explicitly documented as the operational backbone of verified robot uptime.
- The event-driven architecture supports future scaling and integrations without requiring redesign.

---

### Recommendation Before Appendix G

One enhancement I'd make before defining permissions is to separate **system roles** (such as Super Admin or Support Engineer) from **organization roles** (such as Company Manager or Manufacturer Engineer). That distinction makes role inheritance, auditing, and future enterprise features much cleaner when we build the permissions matrix.
