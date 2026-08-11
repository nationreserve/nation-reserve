# Nation Reserve Master Specification

# Volume I — Appendix E

# API Contract Specification

**Version:** 1.0
**Status:** Authoritative API Specification

---

# Purpose

This appendix defines the API contracts that govern communication between every component of RoboWorkPool.

The goals are to:

- Establish stable API contracts before implementation.
- Prevent frontend/backend mismatches.
- Define authentication and authorization requirements.
- Standardize error handling.
- Support versioning and future expansion.

No implementation should invent new endpoints without updating this specification.

---

# API Design Principles

Every API should be:

- RESTful
- Versioned
- Stateless
- JSON-based
- Idempotent where appropriate
- Secure by default
- Fully documented
- Backward compatible whenever possible

Base URL:

```text
/api/v1/
```

Future breaking changes should use:

```text
/api/v2/
```

---

# API Categories

The platform exposes four API groups:

## 1. Public API

Accessible without authentication.

Used by:

- Public website
- Landing pages
- Health monitoring

Examples:

- Health
- Readiness
- Pricing
- FAQ
- Public documentation

---

## 2. Client API

Authenticated APIs used by:

- Robot Owners
- Hiring Companies
- Administrators

Authentication required.

---

## 3. Manufacturer API

Used only by approved robot manufacturers.

Purpose:

- Robot registration
- Heartbeats
- Firmware
- Integration

Authentication:

Manufacturer API Keys + signed requests.

---

## 4. Internal Service API

Used only by platform services.

Never exposed publicly.

---

# Authentication

Public API

No authentication.

---

Client API

Authentication:

JWT Access Token

Refresh Token

MFA (when enabled)

---

Manufacturer API

Authentication requires:

Manufacturer ID

API Key

API Secret

Timestamp

Request Signature

Replay protection

Future versions may use OAuth2 in addition to signed requests.

---

# Standard Headers

Every authenticated request should include:

Authorization

```text
Bearer ACCESS_TOKEN
```

Every request should include:

```text
Content-Type: application/json
Accept: application/json
X-Request-ID
```

Manufacturer requests additionally include:

```text
X-Manufacturer-ID
X-Timestamp
X-Signature
```

---

# Standard Response Format

Successful response:

```json
{
  "success": true,
  "data": {}
}
```

---

Failed response:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Robot serial number is required.",
    "requestId": "..."
  }
}
```

---

# Standard Error Codes

Every endpoint should consistently use standardized error codes.

Examples:

BAD_REQUEST

UNAUTHORIZED

FORBIDDEN

NOT_FOUND

CONFLICT

VALIDATION_ERROR

RATE_LIMITED

HEARTBEAT_INVALID

SERIAL_ALREADY_REGISTERED

CONTRACT_NOT_ACTIVE

PAYMENT_FAILED

INTERNAL_SERVER_ERROR

SERVICE_UNAVAILABLE

---

# Public API Endpoints

## GET /health

Purpose:

Platform process health.

Authentication:

None.

Response:

Running status.

---

## GET /ready

Purpose:

Dependency readiness.

Returns:

Database

Redis

Object Storage

Queue

API readiness

---

## GET /pricing

Returns:

Current standardized pricing.

Includes:

- $5/hour verified operating rate
- Platform fee explanation
- Billing examples
- Effective date
- Version

---

## GET /faq

Returns:

Public FAQ content.

---

## GET /status

Returns:

Public operational status.

No confidential information.

---

# Authentication API

## POST /auth/register

Creates account.

Supports:

Robot Owner

Hiring Company

Manufacturer

Returns:

Pending verification.

---

## POST /auth/login

Returns:

Access Token

Refresh Token

Session

Permissions

Role

---

## POST /auth/logout

Invalidates session.

---

## POST /auth/refresh

Returns:

New access token.

---

## POST /auth/verify-email

Completes email verification.

---

## POST /auth/request-password-reset

Generates reset request.

---

## POST /auth/reset-password

Completes password reset.

---

## POST /auth/mfa/enable

Enables MFA.

---

## POST /auth/mfa/verify

Verifies MFA.

---

# Robot Owner API

## GET /robots

Returns:

Owned robots.

Supports:

Filtering

Sorting

Pagination

---

## POST /robots

Registers newly delivered robot.

Requires:

Ownership verification.

---

## GET /robots/{id}

Returns:

Complete robot information.

---

## PATCH /robots/{id}

Updates owner-configurable fields only.

Manufacturer-controlled fields cannot be edited.

---

## GET /robots/{id}/heartbeats

Returns:

Heartbeat history.

Supports:

Date filtering.

---

## GET /robots/{id}/maintenance

Returns:

Maintenance history.

---

## POST /robots/{id}/maintenance

Creates maintenance request.

---

## POST /robots/{id}/transfer

Initiates ownership transfer.

---

## POST /robots/{id}/retire

Retires robot.

Requires confirmation.

---

# Queue API

## GET /queue

Returns:

Current user queue information.

Includes:

Position

Estimated fulfillment

Reservation status

Movement history

---

## GET /queue/history

Returns:

Complete queue movement history.

---

## POST /queue/downpayment

Records downpayment.

Returns:

Updated queue position.

---

# Payroll API

## GET /payroll

Returns:

Current payroll summary.

---

## GET /payroll/history

Returns:

Historical payroll.

---

## GET /payroll/{id}

Returns:

Payroll details.

---

## GET /tax-documents

Returns:

Tax forms.

---

# Hiring Company API

## GET /companies

Returns:

Current company.

---

## PATCH /companies

Updates company profile.

---

## GET /facilities

Returns:

Facilities.

---

## POST /facilities

Creates facility.

---

## PATCH /facilities/{id}

Updates facility.

---

## DELETE /facilities/{id}

Archives facility.

---

## GET /departments

Returns:

Departments.

---

## POST /departments

Creates department.

---

## GET /contracts

Returns:

Contracts.

Supports:

Filtering

Status

Facility

Date

---

## POST /contracts

Creates contract.

---

## GET /contracts/{id}

Returns:

Contract details.

---

## PATCH /contracts/{id}

Updates editable contract fields before activation.

---

## POST /contracts/{id}/approve

Approves contract.

---

## POST /contracts/{id}/cancel

Cancels contract.

---

## GET /planning

Returns:

Workforce planning information.

---

## POST /planning

Creates planning projection.

---

## GET /assignments

Returns:

Assignments.

---

## GET /invoices

Returns:

Invoices.

---

## GET /reports

Returns:

Company reports.

---

# Manufacturer API

## GET /manufacturer/models

Returns:

Registered models.

---

## POST /manufacturer/models

Registers model.

---

## GET /manufacturer/robots

Returns:

Registered robots.

---

## POST /manufacturer/robots

Registers robot serial.

Validation includes:

Unique serial number.

Approved model.

Manufacturer ownership.

---

# Heartbeat API

## POST /manufacturer/heartbeat

Purpose:

Primary verification endpoint for payable operating time.

This endpoint is the authoritative operational record for robot uptime.

Scheduling data is **not** used as the primary payroll source.

---

## Required Request

Every heartbeat must include:

Manufacturer ID

Robot serial

Timestamp

Firmware version

Robot state

Heartbeat sequence number

Current runtime

Health indicators

Heartbeat signature

---

Optional fields:

Battery level

Temperature

Diagnostic summary

Location (future, if supported)

---

Validation

Reject if:

Unknown robot

Unknown manufacturer

Invalid signature

Clock skew exceeds allowed tolerance

Malformed payload

Duplicate heartbeat sequence

Retired robot

Suspended manufacturer

---

Accepted Response

Returns:

Verification success

Server timestamp

Current robot status

Warnings

---

Heartbeat Frequency

Manufacturers should transmit heartbeats at a documented interval (configured by the platform).

The platform should tolerate temporary network interruptions while detecting prolonged outages.

---

Retry Behavior

Manufacturers may retry failed submissions using the same sequence number.

The API must be idempotent to prevent duplicate billable time.

---

Rate Limits

Heartbeat endpoints should have manufacturer-specific rate limits appropriate to the expected fleet size while preventing abuse.

---

# Firmware API

## POST /manufacturer/firmware

Registers firmware release.

---

## GET /manufacturer/firmware

Returns:

Supported versions.

---

# Administrator API

Administrators have privileged endpoints for:

Users

Companies

Manufacturers

Robots

Contracts

Billing

Queue

Heartbeats

Reports

Audit logs

System health

Security

Administrative endpoints should require elevated permissions and every action should generate an audit record.

---

# Pagination

Large collections should support:

Page

Page size

Cursor (future)

Sort

Filters

---

# Filtering

Collections should support filtering by relevant attributes such as:

Status

Date range

Manufacturer

Facility

Department

Robot

Contract

Owner

---

# Versioning

API version is part of the URL.

Breaking changes require a new major API version.

Minor additions should remain backward compatible.

Deprecated endpoints should provide advance notice before removal.

---

# Audit Requirements

The following API actions must always create audit entries:

- Robot registration
- Ownership transfer
- Contract approval
- Billing adjustments
- Payroll adjustments
- Queue modifications
- Administrative actions
- Manufacturer approval
- Robot retirement
- Heartbeat validation failures due to security or policy enforcement

---

# Performance Targets

Target response times under normal load:

- Public endpoints: under 250 ms
- Client endpoints: under 500 ms
- Heartbeat ingestion: under 200 ms acknowledgement (processing may continue asynchronously)
- Administrative dashboards: under 1 second for standard queries

These are design goals rather than strict guarantees and may be refined during performance testing.

---

# Acceptance Criteria

This appendix is complete when:

- Public, client, manufacturer, and internal API categories are defined.
- Authentication methods and standard request/response formats are established.
- Core endpoint inventory is documented.
- The Heartbeat API is explicitly defined as the authoritative source of billable operating time.
- Validation, error handling, auditing, pagination, filtering, versioning, and performance expectations are specified.

---

## Next Appendix

**Appendix F — Event Catalog**, which will define every significant event emitted throughout RoboWorkPool, including its trigger, payload, consumers, retry behavior, and role in the platform's event-driven architecture.
