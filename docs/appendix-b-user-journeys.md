# Nation Reserve Master Specification

# Volume I — Appendix B

# User Journey Specifications

**Version:** 1.0
**Status:** Authoritative Product Specification

---

# Purpose

This appendix defines the complete user experience for every primary RoboWorkPool user.

Unlike technical documentation, this appendix explains the product from the user's perspective.

It serves as the authoritative specification for:

- UX designers
- Frontend developers
- Backend developers
- QA
- API development
- Codex implementation

Every future screen should support one of these journeys.

---

# Primary User Types

RoboWorkPool consists of four primary user types:

1. Robot Owner
2. Hiring Company
3. Robot Manufacturer
4. Platform Administrator

Each journey should be designed so that a first-time user can successfully complete their objectives with minimal training.

---

# Journey 1 — Robot Owner

## Primary Goal

Own one or more robots that automatically generate income through verified operating hours.

The platform should minimize manual intervention after initial setup.

---

# Robot Owner Lifecycle

```
Landing Page

↓

Create Account

↓

Verify Email

↓

Verify Identity

↓

Payment & Tax Setup

↓

Join Downpayment Queue (optional)

↓

Receive Robot

↓

Manufacturer Activation

↓

Heartbeat Verification

↓

Robot Available

↓

Accept Contracts (automatic or manual based on owner settings)

↓

Robot Performs Work

↓

Heartbeat Generates Verified Hours

↓

Automatic Payroll

↓

Maintenance

↓

Return to Service

↓

Transfer or Retire Robot
```

---

# Landing Page

The Robot Owner should immediately understand:

- What RoboWorkPool is.
- That robots earn a standardized **$5/hour** while operating.
- That no contract negotiation is required.
- That uptime is verified automatically through the Heartbeat API.
- How to begin.

Primary Call-to-Action:

**Become a Robot Owner**

Secondary CTA:

Learn More

Pricing

FAQ

---

# Create Account

Information collected:

- Full legal name
- Email
- Password
- Country
- State (if applicable)
- Phone number

Validation:

- Email uniqueness
- Password strength
- Terms acceptance
- Privacy acceptance

---

# Email Verification

Robot owners cannot continue until:

- Email verified

The system should support:

- Resend verification
- Expiration
- Verification status

---

# Identity Verification

Collect:

- Government ID
- Selfie verification (if required)
- Date of birth
- Address

Purpose:

- Fraud prevention
- Tax compliance
- Ownership verification

---

# Payment Setup

Robot Owner configures:

- Bank account
- Tax information
- Preferred payout schedule

Supported payout schedules:

- Weekly
- Biweekly
- Monthly

---

# Dashboard

Primary navigation:

Dashboard

Robots

Contracts

Payroll

Queue

Maintenance

Notifications

Settings

Support

---

Dashboard shows:

Total Robots

Verified Hours Today

Verified Hours This Week

Estimated Earnings

Pending Payroll

Robot Status Summary

Notifications

Maintenance Alerts

---

# Downpayment Queue

If the owner does not yet own a robot:

Display:

Current queue position

Estimated wait

Estimated delivery

Downpayment amount

Payment history

Reservation status

The queue should update automatically.

---

# Queue Rules

Users may only see:

Their own reservation

Their own payment history

Their own estimated delivery

Other users remain anonymous.

---

# Robot Registration

After robot delivery:

Robot serial

Manufacturer

Model

Firmware

Heartbeat status

Warranty

Ownership confirmation

---

# Heartbeat Activation

The dashboard should clearly show:

Connected

Last heartbeat

Heartbeat frequency

Current uptime

Verification status

Connection health

The owner should never manually submit uptime.

---

# Robot Status Screen

Displays:

Robot Name

Serial

Manufacturer

Current Status

Hours Today

Hours Week

Lifetime Hours

Current Contract

Maintenance Status

Firmware Version

Last Heartbeat

Current Assignment

---

# Contracts

Robot owners generally do not negotiate individual hourly rates.

Instead they review:

Assigned company

Contract duration

Location

Expected operating schedule

Status

Estimated earnings

---

# Payroll Screen

Displays:

Current verified hours

Current pay period

Pending payout

Completed payouts

Taxes withheld

Adjustments

Platform fees (clearly distinguished from owner earnings)

Export tax documents

---

# Maintenance

Owners can:

Request maintenance

View maintenance history

See current repair status

Receive completion notifications

Maintenance pauses payable operating time until the robot returns to Active status.

---

# Notifications

Examples:

Robot online

Robot offline

Heartbeat interrupted

Robot assigned

Payroll processed

Maintenance scheduled

Maintenance completed

Queue moved

Firmware update available

---

# Settings

Robot Owner settings include:

Personal information

Security

Notifications

Payment methods

Tax information

Automatic contract preferences

Privacy

Support

---

# Robot Transfer

Owners may transfer ownership through an approved workflow.

Transfer requires:

Identity verification

Robot verification

Administrative approval (if required)

Ownership history should never be deleted.

---

# Robot Retirement

Retirement permanently removes a robot from active operation.

Retired robots:

Cannot generate income

Remain visible historically

Remain in audit records

---

# Journey 2 — Hiring Company

## Primary Goal

Obtain reliable robot labor with transparent pricing and minimal operational complexity.

Hiring Companies should never need to negotiate wages or purchase robots through RoboWorkPool.

---

# Hiring Company Lifecycle

```
Landing Page

↓

Create Company

↓

Verify Business

↓

Create Facility

↓

Create Departments

↓

Create Contract

↓

Workforce Planning

↓

Reserve Robot Capacity

↓

Robots Assigned

↓

Monitor Operations

↓

Approve Completed Work

↓

Receive Invoice

↓

Pay Invoice

↓

Historical Reporting
```

---

# Company Registration

Collect:

Business name

Legal entity

EIN (where applicable)

Business address

Primary contact

Billing contact

Industry

---

# Verification

Business verification includes:

Email verification

Business validation

Payment method

Billing information

Tax information

---

# Company Dashboard

Navigation:

Dashboard

Contracts

Facilities

Departments

Planning

Assignments

Invoices

Reports

Notifications

Settings

Support

---

Dashboard displays:

Current Active Robots

Today's Operating Hours

Expected Coverage

Current Contracts

Open Issues

Pending Invoices

---

# Workforce Planning

Companies can forecast:

Robots needed

Locations

Dates

Shifts

Departments

Expected hours

Coverage gaps

This planning assists with allocation but does not determine payroll.

---

# Contract Creation

Company specifies:

Facility

Department

Required robot count

Expected duration

Operating windows

Special requirements

Priority

The standardized hourly pricing is displayed automatically.

---

# Assignment Monitoring

Displays:

Active robots

Serial numbers

Heartbeat status

Current uptime

Current location (if applicable)

Maintenance flags

Reported issues

---

# Reporting Issues

Companies may report:

Robot damage

Unexpected downtime

Operational concerns

Safety incidents

Reports should reference the robot's unique serial identifier.

---

# Invoice Management

Companies can view:

Open invoices

Paid invoices

Credits

Adjustments

Taxes

Platform fees

Payment history

---

# Journey 3 — Robot Manufacturer

## Primary Goal

Integrate robots into RoboWorkPool through a standardized Heartbeat API with minimal implementation effort.

Manufacturers should not need proprietary hardware beyond their existing robot systems.

---

# Manufacturer Lifecycle

```
Apply

↓

Approval

↓

API Credentials

↓

Sandbox Testing

↓

Heartbeat Validation

↓

Register Models

↓

Register Robots

↓

Production Approval

↓

Monitor Fleet

↓

Firmware Management

↓

Operational Analytics
```

---

# Manufacturer Dashboard

Displays:

Registered models

Registered robots

Connected robots

Heartbeat success rate

API health

Firmware versions

Integration documentation

---

# API Integration

The manufacturer follows a documented process to:

- Obtain API credentials.
- Connect to the Heartbeat API.
- Validate authentication.
- Register supported robot models.
- Register individual robot serial numbers.
- Send heartbeat messages to the sandbox environment.
- Resolve validation errors.
- Receive production approval.
- Transition to production credentials.

The dashboard should include connection status, error reporting, API documentation links, and testing tools.

---

# Journey 4 — Platform Administrator

## Primary Goal

Maintain platform integrity, resolve issues, and oversee operations without direct involvement in day-to-day customer workflows.

---

# Administrator Lifecycle

```
Login

↓

Dashboard

↓

Review Alerts

↓

Review Queue

↓

Review Heartbeats

↓

Approve Entities

↓

Investigate Issues

↓

Resolve Disputes

↓

Audit Financials

↓

Generate Reports

↓

Monitor Platform Health
```

---

# Administrator Dashboard

The administrator dashboard should present a high-level operational view of the entire platform, including:

- Platform health
- Active robot count
- Connected manufacturers
- Heartbeat success rate
- Queue statistics
- Active contracts
- Billing summaries
- Open disputes
- Maintenance backlog
- Security alerts
- System notifications

Administrators should be able to navigate quickly to detailed records for any metric shown.

---

# Universal UX Principles

Regardless of user type, the platform should:

- Use consistent navigation patterns.
- Clearly indicate system status.
- Provide actionable error messages.
- Avoid unnecessary manual steps.
- Surface important alerts prominently.
- Preserve auditability for significant actions.
- Be responsive across desktop and tablet devices (mobile support may be added later if required).
- Minimize repetitive data entry by reusing verified information where appropriate.

---

# Acceptance Criteria

This appendix is complete when:

- The complete lifecycle for Robot Owners, Hiring Companies, Manufacturers, and Administrators is documented.
- Every major workflow is represented from onboarding through ongoing operation.
- Navigation, primary screens, and key user interactions are defined.
- The specification establishes a consistent user experience that future UI design and implementation can follow.

---

### Next Appendix

**Appendix C — Complete Screen Inventory**, which will enumerate every page, modal, drawer, wizard, and navigation path in the platform so no interface is left undefined.
