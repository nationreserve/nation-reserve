# Nation Reserve Master Specification

# Volume I — Appendix A

# RoboWorkPool Product Rules (Immutable Business Rules)

**Status:** Authoritative Business Specification

## Purpose

This appendix defines the core business rules governing RoboWorkPool. These rules are considered foundational product requirements and should remain stable throughout implementation unless intentionally revised through a future version of the specification.

If any implementation prompt, design discussion, or engineering decision conflicts with this appendix, this appendix takes precedence.

---

# Chapter 1 — Product Mission

RoboWorkPool exists to create a standardized marketplace for autonomous humanoid robot labor.

The platform's objectives are to:

* Make robot labor simple to purchase.
* Make robot ownership financially accessible.
* Provide transparent billing.
* Automate payroll.
* Standardize manufacturer integrations.
* Reduce operational complexity.
* Scale across many robot manufacturers.

The experience should resemble hiring cloud computing resources rather than negotiating temporary labor.

---

# Chapter 2 — Core Pricing Model

The platform uses a **standardized flat hourly operating rate**.

## Verified Operating Rate

Every verified operating robot earns:

**$5.00 per verified operating hour.**

This rate is independent of:

* job type
* employer
* industry
* robot manufacturer
* robot model
* geographic location (unless a future version explicitly changes this)

The platform intentionally avoids market-based hourly bidding for robot labor.

---

## Platform Fee

RoboWorkPool charges a **15% platform fee**.

The intent is for the robot owner to receive the full standardized operating payment while the Hiring Company pays the platform fee in addition to that operating cost. The precise billing presentation (line item, bundled total, or invoice format) may evolve, but the business rule remains that the platform fee is separate from the owner's flat operating compensation.

---

## No Negotiated Hourly Rates

Users cannot negotiate hourly robot wages through the platform.

All hourly labor is based on the standardized operating rate.

Future premium services may exist, but they should not alter the core operating-rate philosophy without an intentional specification update.

---

# Chapter 3 — Robot Ownership

## Maximum Ownership

A single robot owner account may own up to:

**20 active robots.**

Inactive, retired, or transferred robots should follow administrative rules defined elsewhere, but the ownership cap applies to active operational robots.

---

## Ownership Verification

Every robot must have:

* unique serial identifier
* manufacturer association
* ownership record
* operational status
* maintenance status

Duplicate robot registration is prohibited.

---

# Chapter 4 — Hiring Philosophy

Hiring Companies do **not** purchase robots from RoboWorkPool.

Instead they:

* create contracts
* reserve robot operating time
* schedule work
* receive invoices
* pay only for verified operation

The platform is designed around robot labor as a service.

---

# Chapter 5 — Heartbeat API

The RoboWorkPool Heartbeat API is the authoritative source of operational verification.

Dedicated tracking hardware is intentionally excluded from the platform.

Manufacturers integrate directly through software.

---

## Heartbeat Verification

Heartbeat events establish:

* robot online status
* verified operation
* uptime
* health
* connectivity

Heartbeat data serves as the primary evidence used when calculating payable operating time.

---

## Manufacturer Integration

Manufacturers receive a documented onboarding flow.

That flow should include:

1. Create manufacturer account.
2. Obtain API credentials.
3. Register robot models.
4. Register robot serial identifiers.
5. Configure heartbeat endpoint.
6. Perform sandbox verification.
7. Validate heartbeat timing.
8. Confirm production readiness.
9. Activate production credentials.
10. Begin reporting.

No robot should become billable until successful heartbeat verification has been completed.

---

# Chapter 6 — Scheduling Philosophy

Scheduling exists to improve operational planning.

Scheduling is **not** the authoritative source for payroll.

Scheduling should support:

* workforce planning
* reservations
* shift visibility
* historical reporting
* operational forecasting
* contract planning

Heartbeat verification remains the primary determinant of payable operating time.

---

# Chapter 7 — Payroll Rules

Payroll should be calculated automatically from:

* verified heartbeat data
* approved contract
* active operational status
* dispute adjustments
* administrative corrections

Manual payroll calculations should be the exception rather than the standard workflow.

---

# Chapter 8 — Billing Rules

Hiring Companies should receive invoices generated from verified operating time.

Invoices should be:

* itemized
* transparent
* auditable

Billing should clearly distinguish:

* operating charges
* platform fees
* adjustments
* credits
* taxes (where applicable)

---

# Chapter 9 — Robot Status

Every robot must always have exactly one operational state, such as:

* Active
* Scheduled
* Operating
* Idle
* Offline
* Maintenance
* Repair
* Retired

Status transitions should be recorded in an audit log.

---

# Chapter 10 — Maintenance & Repairs

Robots marked:

* Under Repair
* Maintenance
* Inactive

must not generate payable operating time.

The transition into and out of these states should require authorization and remain auditable.

---

# Chapter 11 — Contract Identification

Each robot assigned to a contract must include its unique serial identifier.

Hiring Companies should be able to identify the exact robot operating under a contract to support maintenance reporting, issue tracking, and operational transparency.

---

# Chapter 12 — Downpayment Queue

The platform includes a dedicated Downpayment Queue page.

Its purposes are to:

* show queue progress
* improve transparency
* reduce uncertainty
* encourage participation

---

## Queue Visibility

Users should always see:

* their queue position
* estimated progress
* their own reservation information

Other users' personally identifying information remains hidden.

---

## Queue Ordering

The queue should:

* display the next position at the top
* update dynamically
* support scrolling
* allow users to locate their own position

Queue movement should be deterministic and auditable.

---

# Chapter 13 — Workforce Planning

Hiring Companies should be able to plan future robot demand.

Planning tools should include:

* projected staffing
* shift planning
* robot quantities
* geographic deployment
* expected operating hours
* contract coverage
* future expansion planning

These planning features support operational efficiency but do not replace heartbeat verification for payroll.

---

# Chapter 14 — Administrative Principles

Administrators should be able to:

* suspend robots
* suspend manufacturers
* suspend companies
* correct billing
* adjust disputes
* investigate fraud
* review heartbeat logs
* audit operational history

Administrative actions should be logged and attributable.

---

# Chapter 15 — Product Principles

The following principles should guide all future development:

* Simplicity over unnecessary complexity.
* Automation over manual processes.
* Transparency in billing and payroll.
* Standardization across manufacturers.
* Security by default.
* Auditability of financial and operational records.
* Predictable user experience.
* Scalability without redesign.
* Accessibility for both small and large fleet operators.

---

# Governance

Any future implementation prompt that conflicts with these rules should be revised before implementation.

Changes to these business rules should be treated as specification revisions, not ad hoc engineering decisions.

---

I also think there are a few more areas worth specifying before Prompt 002, such as the **Robot Owner journey**, **Hiring Company journey**, **Manufacturer journey**, **contract lifecycle**, **heartbeat API payload specification**, **dispute resolution**, and **future pricing/versioning policies**. Including those now will give Codex an even clearer blueprint and reduce ambiguity during implementation.
