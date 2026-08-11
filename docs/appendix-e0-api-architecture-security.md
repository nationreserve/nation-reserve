# Nation Reserve Master Specification

## Volume I - Appendix E0

# API Architecture & Security Standards

**Version:** 1.0  
**Status:** Authoritative API Architecture Specification  
**Placement:** After Appendix D and before Appendix E

---

# Purpose

This appendix defines how RoboWorkPool APIs behave and how they are secured.
Appendix E defines which endpoints exist; this appendix governs every endpoint
regardless of implementation language or deployment topology.

When an endpoint definition conflicts with these standards, the conflict must be
resolved in the specification before implementation. Security-sensitive values
identified as policy constants must not be invented by engineering.

---

# 1. API Philosophy

RoboWorkPool APIs are:

- REST-first;
- stateless at the request boundary;
- JSON-based unless a documented media type is required;
- consistently named;
- secure by default;
- backward compatible within a major version; and
- idempotent wherever retries could otherwise duplicate a material action.

Resources use plural nouns and lowercase path segments. JSON properties use
`camelCase`. URLs must not expose implementation details or secrets.

API servers may use durable sessions, databases, caches, and queues internally.
"Stateless" means an individual request carries the authentication and request
context needed to process it; it does not prohibit server-side revocation or
workflow state.

---

# 2. API Classification

Every endpoint must declare exactly one API class.

## 2.1 Public API

The Public API serves unauthenticated, read-only website and public-information
requests.

Requirements:

- no authentication;
- no confidential or user-specific data;
- `GET` and `HEAD` only unless explicitly revised;
- conservative anonymous throttling by network and abuse signals;
- cache policy declared per endpoint;
- no shared caching for personalized or sensitive responses;
- SEO-safe output only where the public website consumes the endpoint; and
- an explicit CORS policy rather than reflecting arbitrary origins.

Liveness and readiness probes are operational endpoints. Readiness details
exposed publicly must not reveal credentials, topology, hostnames, or sensitive
failure information.

## 2.2 Client API

The Client API serves Robot Owners, Hiring Company users, and authorized
platform personnel.

Requirements:

- short-lived access tokens;
- rotating refresh tokens bound to a server-side session;
- configurable absolute and idle session expiration;
- revocation on logout, security reset, or administrative action;
- MFA enforcement according to role and risk policy;
- device and session visibility;
- authorization middleware on every protected route;
- organization scoping before data access; and
- authenticated user and organization throttling.

Browser refresh tokens should use `Secure`, `HttpOnly`, appropriately scoped
cookies with an explicit `SameSite` policy. Access tokens must not be placed in
URLs or persistent browser storage. Any cookie-authenticated state-changing
request requires CSRF protection.

## 2.3 Manufacturer API

The Manufacturer API is restricted to approved manufacturers and Robot
Companies. Sandbox and production are separate trust environments.

Requirements:

- explicit manufacturer approval;
- separately scoped sandbox and production credentials;
- a public credential identifier and protected secret;
- signed requests using the approved canonicalization scheme;
- authenticated manufacturer identity;
- timestamp and allowed-clock-skew validation;
- nonce or event-identifier replay protection;
- constant-time signature comparison;
- credential rotation with a controlled overlap window;
- immediate credential revocation;
- fleet-aware throttling based on approved capacity;
- idempotency and duplicate-event handling;
- robot-level authorization; and
- auditable registration and credential actions.

Secrets are shown only at creation or rotation and are stored using a
non-reversible verifier or approved secrets-management mechanism as appropriate
to the signing design. Logs must never contain raw secrets or full
authorization headers.

Heartbeat retries must reuse the same event identifier and idempotency identity.
Duplicate accepted events return a deterministic result and never create
duplicate payable time.

## 2.4 Internal Service API

Internal APIs connect the API server, billing, payroll, queue workers,
notifications, reporting, and audit capabilities. Network location alone is not
authentication.

Requirements:

- workload identity or mutually authenticated service credentials;
- least-privilege service authorization;
- encrypted transport;
- bounded connection, request, and processing timeouts;
- retry only for retry-safe failures;
- exponential backoff with jitter and a maximum attempt policy;
- idempotent consumers;
- durable queues for work that must survive process failure;
- dead-letter handling and operator visibility;
- circuit breakers for failing dependencies;
- distributed trace and correlation context;
- health, readiness, and dependency telemetry; and
- no direct public exposure.

Synchronous calls must not be retried blindly after an ambiguous write.
Asynchronous delivery is at least once unless a future contract explicitly
guarantees otherwise; consumers must deduplicate.

## 2.5 Future Partner API

The Partner API namespace is reserved for approved ERP, payroll, accounting,
analytics, and enterprise integrations.

It must reuse the versioning, error, observability, authorization, audit, and
idempotency standards in this appendix. Partner access requires an explicit
product specification, data-sharing approval, scopes, contractual controls, and
revocation procedures before activation.

---

# 3. Authentication Standards

## 3.1 Human identities

- Passwords must be checked against the approved strength and compromised-secret
  policy.
- Password verifiers must use an approved adaptive password-hashing algorithm.
- Access tokens must include issuer, audience, subject, issued-at, expiration,
  unique token identifier, and session identifier claims.
- Tokens must use approved algorithms; algorithm selection must never be
  accepted from an untrusted token without server policy enforcement.
- Refresh tokens rotate on use. Reuse of a superseded refresh token triggers
  session-family revocation and a security event.
- MFA is mandatory for privileged platform roles and configurable for other
  roles according to approved policy.
- Recovery flows must not weaken identity verification.
- Users must be able to review and revoke active sessions and trusted devices.

Access-token lifetime, refresh lifetime, idle timeout, absolute timeout, device
trust duration, and password parameters are Security Policy Constants and remain
**TBD** until approved.

## 3.2 Machine identities

API keys identify a credential but are not sufficient alone for high-trust
manufacturer writes. Manufacturer requests require the approved signature
scheme. Service identities must be short-lived or automatically rotatable where
the infrastructure supports it.

Credential records must include owner, environment, scopes, creation time,
status, last-used time, rotation lineage, and revocation time.

## 3.3 Revocation

Revocation must take effect within a documented maximum interval. Password
reset, confirmed compromise, user suspension, organization suspension, role
reduction, and explicit logout must revoke the affected sessions or credentials
according to policy.

---

# 4. Authorization

Authorization combines role-based access control with ownership and
organization boundaries. Possessing a role never permits access to an unrelated
organization's records.

Initial roles:

- Robot Owner
- Company Employee
- Company Manager
- Manufacturer Engineer
- Manufacturer Admin
- Platform Support
- Platform Admin
- Super Admin

Every protected action must evaluate:

1. authenticated identity;
2. active account, session, and organization;
3. assigned role and permission;
4. resource ownership or organization scope;
5. resource and workflow state;
6. elevated-authentication requirement; and
7. applicable policy restrictions.

Platform Support must not inherit unrestricted financial or security powers.
Super Admin access is exceptional, strongly authenticated, tightly assigned,
and fully audited. Sensitive changes should support separation of duties and
step-up authentication.

Client-supplied owner, company, or manufacturer identifiers must never override
the authenticated scope.

---

# 5. Rate Limiting

Limits must be centrally configurable, observable, and enforced consistently.
Responses use HTTP `429` and include a safe retry indication where appropriate.

- Public API: conservative anonymous limits using network and abuse signals.
- Client API: per session, user, organization, endpoint, and risk where needed.
- Manufacturer API: per credential, manufacturer, robot, endpoint, and approved
  fleet capacity.
- Internal API: protected by service authentication, concurrency controls,
  quotas, queue backpressure, and infrastructure policy rather than public
  anonymous limits.
- Partner API: per partner, credential, scope, and contractual allocation.

Exact thresholds and windows are Rate Limit Policy Constants and remain **TBD**.
Limits must not allow one fleet or tenant to starve others.

---

# 6. Versioning and Compatibility

Externally consumed APIs use a major version in the path:

```text
/api/v1
```

Additive optional fields and new endpoints may remain in the current major
version. Removing or renaming fields, changing field meaning or type, adding a
new required input, changing authorization semantics incompatibly, or changing
material status/error behavior requires a new major version.

Deprecation requires:

1. publication of the replacement;
2. migration documentation;
3. a deprecation notice and date;
4. usage monitoring and affected-consumer communication;
5. an approved support window;
6. a sunset notice; and
7. removal only after the approved sunset.

Deprecation and sunset durations are Versioning Policy Constants and remain
**TBD**. Manufacturer payloads additionally carry a schema version so event
evolution is explicit.

---

# 7. Error Standards

All non-probe endpoints use one error envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be validated.",
    "requestId": "01900000-0000-7000-8000-000000000000",
    "details": [
      {
        "field": "robotSerialNumber",
        "code": "REQUIRED",
        "message": "Robot serial number is required."
      }
    ]
  }
}
```

`details` is optional. Messages must be safe for the caller and must not expose
stack traces, queries, secrets, internal hostnames, or sensitive existence
information.

Status usage:

- `400` malformed request;
- `401` missing or invalid authentication;
- `403` authenticated but not permitted;
- `404` absent or intentionally concealed resource;
- `409` state, uniqueness, or idempotency conflict;
- `422` semantically invalid input when distinguished from malformed input;
- `429` throttled;
- `500` unexpected server failure; and
- `503` dependency or readiness failure.

The universal error catalog owns stable machine-readable codes. Adding a code
requires documentation. Operational `/health` and `/ready` probes may use their
minimal probe schemas defined by the platform foundation.

---

# 8. Request Standards

- `Content-Type: application/json` for JSON bodies.
- `Accept: application/json` for JSON responses.
- Every request receives a server-trusted UUID request ID.
- A syntactically valid caller request ID may be preserved subject to length and
  trust policy; invalid values are replaced.
- Correlation and trace context propagates across internal calls and events.
- Dates and timestamps use ISO 8601 / RFC 3339 in UTC.
- Stored authoritative timestamps retain UTC semantics.
- User time zones are presentation preferences, not replacements for UTC data.
- Request-body and header sizes are bounded.
- Compression is negotiated only for safe, supported content and guarded
  against decompression abuse.
- Unknown security-sensitive fields should be rejected.

Collection endpoints must use a consistent pagination strategy. Cursor
pagination is preferred for large or rapidly changing collections. Responses
must provide a stable ordering with a unique tie-breaker. Filters and sortable
fields are allowlisted; raw database expressions are prohibited.

State-changing operations that may be retried require an `Idempotency-Key`.
Keys are scoped to the authenticated principal, endpoint, and normalized
request. Reusing a key with different input is a conflict.

---

# 9. Response Standards

Successful non-probe responses use:

```json
{
  "success": true,
  "data": {}
}
```

Paginated responses use:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "nextCursor": null,
    "hasMore": false
  },
  "links": {
    "self": "/api/v1/robots"
  },
  "warnings": []
}
```

`meta`, `links`, and `warnings` are included only where relevant. Numeric money
values must follow the financial precision standard. Sensitive fields must be
explicitly selected for serialization rather than removed after serializing an
internal object.

Caching headers, content type, version information where applicable, request
ID, and security headers must be consistent with endpoint classification.

---

# 10. Security Requirements

All API implementations must provide:

- TLS for all non-local traffic;
- managed secret storage and rotation;
- encryption at rest for protected data;
- strict schema and semantic input validation;
- parameterized data access and least-privilege database identities;
- output encoding and a content-security policy for browser surfaces;
- CSRF defenses for cookie-authenticated state changes;
- SSRF protection through URL validation, destination allowlists, network
  egress controls, redirect controls, and private-address blocking;
- safe file-type, size, and malware controls for uploads;
- security headers appropriate to the response class;
- dependency, static-analysis, secret, and container scanning;
- immutable audit events for sensitive actions;
- redaction of credentials, tokens, personal data, and financial data in logs;
- abuse monitoring and actionable security alerts; and
- documented incident and credential-compromise procedures.

Authorization and validation must occur server-side. CORS, hidden buttons, and
client-side checks are not security boundaries.

Sensitive audit records include authentication events, role and permission
changes, credential lifecycle actions, manufacturer approval, robot
registration, heartbeat security failures, ownership transfers, contract
approval, queue corrections, financial adjustments, and administrative actions.

---

# 11. Webhook Framework (Future)

No webhook is active until a later implementation specification authorizes it.
The framework is reserved for events such as:

- robot activated or retired;
- contract approved or completed;
- heartbeat offline or restored;
- invoice generated or paid;
- payroll processed;
- maintenance requested or completed; and
- queue position changed.

Future webhooks must support signed delivery, per-subscription secrets, secret
rotation, event IDs, deduplication, exponential backoff with jitter, bounded
retries, delivery logs, replay by authorized users, subscription management,
endpoint verification, pause/disable controls, and payload versioning.

Delivery order must not be assumed unless a specific event stream guarantees it.
Consumers must tolerate duplicates. Webhook payloads should contain stable
identifiers and links rather than unnecessary sensitive record contents.

---

# 12. SDK Strategy

Official SDKs are planned for:

- TypeScript / Node.js
- Python
- C#
- Java
- Go

SDKs should be generated from or continuously checked against the authoritative
machine-readable API contract. They should expose typed clients, authentication
and signing helpers, safe retry and idempotency behavior, pagination helpers,
structured errors, telemetry hooks, and heartbeat submission utilities.

SDK versioning follows API compatibility policy but does not replace API
documentation. Generated code must be reviewed, tested, scanned, and published
through a controlled release process.

---

# 13. Observability and Operations

Every API class must emit structured metrics, logs, and traces appropriate to
its sensitivity. Telemetry must include request ID, trace identity, endpoint
template, API class, status, latency, and authenticated organization or
credential identifiers where permitted.

Logs must avoid raw request bodies by default. Heartbeat content, tokens,
credentials, identity documents, payment data, and tax data require explicit
redaction rules.

Health checks distinguish:

- liveness: the process can respond;
- readiness: required dependencies can serve traffic; and
- startup: initialization is complete where the platform requires it.

Alerts must be actionable and must not depend on confidential data in the alert
payload.

---

# 14. Policy Constants Requiring Approval

The following values must be approved in the Security or Business Rule Constants
appendix before their dependent feature is implemented:

- access, refresh, idle, and absolute session lifetimes;
- MFA and device-trust policy;
- password and recovery parameters;
- signature clock-skew and replay windows;
- credential rotation overlap and revocation targets;
- rate-limit thresholds and windows;
- request, response, upload, and batch-size limits;
- connection, request, processing, and queue timeouts;
- retry ceilings, backoff, circuit-breaker, and dead-letter thresholds;
- idempotency retention;
- API deprecation and sunset periods;
- webhook attempts, timeouts, and retention; and
- security and audit-log retention.

An unapproved value is **TBD** and blocks the affected production behavior.

---

# Acceptance Criteria

This appendix is complete when:

- every endpoint is assigned to an API class;
- authentication and authorization boundaries are explicit;
- manufacturer signing, replay, retry, and idempotency standards are defined;
- versioning, request, response, and error conventions are consistent;
- internal service reliability and identity requirements are established;
- security, auditing, and observability controls are documented;
- future webhooks and SDKs have compatible foundations; and
- unresolved numeric policies are named and prevented from becoming accidental
  engineering defaults.

---

## Next Appendix

[Appendix E - API Contract Specification](appendix-e-api-contracts.md) defines
the endpoint catalog governed by these standards.
