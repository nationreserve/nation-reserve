# Nation Reserve Master Specification

# Volume I — Appendix C

# Complete Screen Inventory

**Version:** 1.0
**Status:** Authoritative UI & Navigation Specification

---

# Purpose

This appendix defines **every screen, page, modal, wizard, drawer, and navigation path** in RoboWorkPool.

It is intended to ensure:

- Every user workflow has a dedicated interface.
- No functionality is hidden or undefined.
- Developers, designers, QA, and Codex all reference the same UI inventory.
- Future features are added consistently.

Every implementation prompt involving the frontend should reference this appendix.

---

# Global Navigation Principles

Every authenticated user should have:

- Persistent top navigation
- User profile menu
- Notification center
- Global search (role-appropriate)
- Help & Support access
- System status indicator

Navigation should remain consistent within each user role.

---

# Public Website

## Home

Purpose:
Introduce RoboWorkPool and explain the platform.

Sections:

- Hero
- $5/hour Flat Rate explanation
- How It Works
- Heartbeat API
- Why Standardized Pricing
- Benefits
- Manufacturers
- Hiring Companies
- Robot Owners
- Pricing
- FAQ
- Footer

Primary CTA:

Become a Robot Owner

Secondary CTA:

Hire Robot Workforce

---

## About

Purpose:

Explain Nation Reserve and RoboWorkPool.

Includes:

Mission

Vision

Platform philosophy

Technology

Leadership (future)

---

## Pricing

Displays:

- $5/hour verified operating rate
- Platform fee explanation
- Billing examples
- FAQ

---

## Heartbeat API

Explains:

- Manufacturer integration
- Verification
- Billing accuracy
- API overview
- Documentation links

---

## FAQ

Topics:

Robot ownership

Hiring companies

Manufacturers

Billing

Queue

Support

Heartbeat

Contracts

---

## Contact

Includes:

Support

Sales

Partnerships

Manufacturers

Press (future)

---

## Login

Purpose:

Universal authentication entry point.

---

## Register

Role selection:

- Robot Owner
- Hiring Company
- Manufacturer

Administrators are created internally.

---

# Robot Owner Portal

Primary Navigation

Dashboard

Robots

Contracts

Payroll

Queue

Maintenance

Notifications

Documents

Support

Settings

---

## Dashboard

Widgets:

Robot Summary

Today's Verified Hours

Estimated Earnings

Payroll Status

Robot Health

Maintenance Alerts

Notifications

Queue Status

Quick Actions

---

## Robot List

Displays:

All owned robots.

Columns:

Robot Name

Serial

Manufacturer

Status

Current Contract

Hours Today

Hours Week

Heartbeat

---

## Robot Details

Tabs:

Overview

Heartbeat

Assignments

Maintenance

Firmware

History

Documents

Ownership

Audit Log

---

## Add Robot

Wizard:

Verify ownership

Enter serial

Manufacturer verification

Heartbeat confirmation

Complete activation

---

## Contracts

Displays:

Active

Pending

Completed

Cancelled

---

## Contract Details

Displays:

Company

Facility

Hours

Expected duration

Robot assignment

Status

History

---

## Payroll Dashboard

Widgets:

Current pay period

Verified hours

Pending payout

Completed payouts

Tax documents

Payment history

Exports

---

## Queue Dashboard

Displays:

Current position

Estimated wait

Estimated robot delivery

Downpayment history

Reservation status

Progress timeline

---

## Queue Details

Displays:

Movement history

Position history

Estimated fulfillment

Support requests

---

## Maintenance Dashboard

Displays:

Upcoming maintenance

Open maintenance

Repair history

Warranty

Manufacturer support

---

## Maintenance Request

Wizard:

Problem type

Description

Images (future)

Priority

Submit

---

## Notifications

Filters:

Unread

Payroll

Robot

Maintenance

Contracts

System

---

## Documents

Tax forms

Ownership

Warranty

Contracts

Invoices

Statements

---

## Settings

Tabs:

Profile

Security

Payment

Tax

Notifications

Privacy

Connected Accounts

API (future)

---

## Support

Create Ticket

Existing Tickets

Knowledge Base

Live Chat (future)

---

# Hiring Company Portal

Primary Navigation

Dashboard

Contracts

Planning

Facilities

Departments

Assignments

Robots

Invoices

Reports

Notifications

Support

Settings

---

## Dashboard

Displays:

Robots Operating

Today's Hours

Coverage

Pending Contracts

Issues

Invoices

Quick Actions

---

## Workforce Planning

Displays:

Forecast calendar

Robot demand

Coverage heat map

Projected staffing

Shift planning

Department utilization

---

## Contract List

Filters:

Active

Pending

Completed

Cancelled

---

## Create Contract

Wizard

Step 1

Facility

Department

Priority

---

Step 2

Robot quantity

Expected operating schedule

Dates

Shift windows

---

Step 3

Review

Pricing

Submit

---

## Contract Details

Displays:

Assigned robots

Robot serials

Heartbeat

Current status

Operating hours

History

---

## Facilities

List

Map

Details

---

## Facility Details

Departments

Contracts

Robot assignments

Utilization

---

## Departments

Displays:

Department utilization

Robots assigned

Coverage

---

## Assignment Monitor

Live screen

Robot status

Heartbeat

Hours

Current task

Issues

Maintenance

---

## Invoice Dashboard

Current invoices

Past invoices

Credits

Platform fees

Taxes

Payment history

Exports

---

## Reports

Utilization

Costs

Operating hours

Coverage

Robot performance

Contract summaries

---

## Notifications

Company alerts

Invoices

Robot issues

Heartbeat interruptions

---

## Settings

Billing

Company

Security

Users

Permissions

Notifications

---

# Manufacturer Portal

Primary Navigation

Dashboard

Models

Robots

Heartbeat

API

Firmware

Analytics

Documentation

Support

Settings

---

## Dashboard

Displays:

Connected robots

Heartbeat success

API usage

Models

Firmware

Alerts

---

## Robot Models

Displays:

All supported models

Capabilities

Firmware

Compatibility

---

## Registered Robots

Displays:

Serial

Owner

Status

Heartbeat

Firmware

Connection

---

## Robot Details

Overview

Heartbeat

Firmware

History

Assignments (summary)

Errors

Audit

---

## Heartbeat Monitor

Live feed

Success rate

Failures

Latency

Retry count

Connection health

---

## API Dashboard

Credentials

Sandbox

Production

Documentation

API keys

Webhook status (future)

---

## Sandbox Testing

Run tests

Validate payloads

Retry simulations

Authentication tests

---

## Firmware

Current releases

Deployment status

Supported versions

Update history

---

## Analytics

Heartbeat uptime

Fleet health

Robot activity

Firmware adoption

---

## Documentation

Integration Guide

Authentication

Examples

SDKs (future)

FAQ

---

# Administrator Portal

Primary Navigation

Dashboard

Users

Companies

Manufacturers

Robots

Contracts

Queue

Heartbeats

Billing

Disputes

Maintenance

Reports

System

Security

Audit Logs

Notifications

Settings

---

## Operations Dashboard

Displays:

Platform health

API health

Robot count

Connected manufacturers

Heartbeat success

Queue

Billing

Alerts

Disputes

Maintenance backlog

---

## Users

Search

Suspend

Reset MFA

View history

---

## Companies

Approval queue

Verification

Status

Contracts

Billing

---

## Manufacturers

Approval

API credentials

Heartbeat monitoring

Robot models

Firmware

---

## Robots

Global registry

Search

Suspend

Transfer

Repair status

---

## Queue

Downpayment queue

Movement history

Position changes

Audit trail

---

## Heartbeats

Live heartbeat monitor

Failures

Latency

Missed heartbeats

Diagnostics

---

## Billing

Invoices

Payroll

Platform revenue

Adjustments

Refunds

---

## Disputes

Robot disputes

Billing disputes

Maintenance disputes

Resolution workflow

---

## Reports

Financial

Operational

Heartbeat

Growth

Performance

Audit

---

## Security

Sessions

MFA

Permissions

Alerts

Suspicious activity

API security

---

## Audit Logs

Every administrative action

Every billing adjustment

Every permission change

Every robot state change

---

## System

Environment health

Queues

Jobs

Database

Redis

Object storage

Version information

---

# Shared Components

These components should be reusable across portals where appropriate:

- Header
- Navigation sidebar
- Breadcrumbs
- Notification center
- Search bar
- Data tables
- Status badges
- Pagination
- Filters
- Sort controls
- Confirmation dialogs
- Success/error toasts
- Loading indicators
- Empty states
- Audit timeline
- File uploader (future)
- Date/time picker
- Robot status card
- Heartbeat status badge

---

# Screen Naming Standards

To maintain consistency:

- List screens should use plural nouns (e.g., **Robots**, **Contracts**, **Invoices**).
- Detail screens should use the singular noun followed by "Details" (e.g., **Robot Details**, **Contract Details**).
- Multi-step processes should use "Wizard" in internal documentation (e.g., **Create Contract Wizard**).
- Dashboards should present summaries and quick actions, while detail screens provide full records.

---

# Acceptance Criteria

This appendix is complete when:

- Every major public and authenticated screen is identified.
- Navigation for each user role is defined.
- Primary dashboards, detail views, wizards, and reusable components are documented.
- Future implementation can build interfaces without inventing new pages or navigation patterns.

---

## Next Appendix

**Appendix D — Data Ownership & Relationships**, which will formally define the ownership hierarchy and relationships among all major entities (users, robots, manufacturers, companies, contracts, heartbeats, invoices, payments, and more) to guide both the database schema and application logic.
