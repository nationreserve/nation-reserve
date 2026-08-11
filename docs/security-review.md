# Security Hardening Review

## Decision

Pilot security approval is **blocked pending external/manual testing and closure of the findings below**.

| ID | Severity | Finding | Status | Remediation |
|---|---|---|---|---|
| SEC-023-001 | Critical | Acceptance waiver mutations trusted a caller-provided verification boolean. | Resolved in Prompt 023 | Consume a hashed, session-bound, purpose-bound, expiring, single-use administrative step-up grant. |
| SEC-023-002 | High | No executed database-backed cross-organization object authorization suite is available locally. | Open | Run PostgreSQL isolation tests for every listed resource and retain evidence. |
| SEC-023-003 | High | Full browser E2E suite exceeds five minutes and critical journeys are component-shell tests. | Open | Add real browser automation with screenshots and privacy-negative cases. |
| SEC-023-004 | High | File upload intent/quarantine exists, but no executed malware-engine/object-storage policy evidence is available. | Open | Validate bucket policy, presigned constraints, quarantine and malicious fixture rejection. |
| SEC-023-005 | High | Cloud IAM, WAF, TLS, secret manager and network controls have source definitions but no applied-environment evidence. | Open | Independent cloud configuration review and staging penetration test. |
| SEC-023-006 | Medium | Frontend development-role fixtures are compiled into routing behavior. APIs remain authenticated, but production UX can display fixture context before API denial. | Open | Remove or environment-gate fixtures before pilot. |
| SEC-023-007 | Medium | Source secret scanning is fixture-pattern based, not a full SAST/dependency/secret scan. | Open | Run protected CI scanners and triage findings. |

Verified source controls include password hashing, refresh-token rotation, session revocation, server-side permissions, organization checks, HMAC heartbeat signing, replay controls, webhook signature verification, idempotency, upload quarantine, append-only audit/financial records, CORS restriction and rate limiting. These observations are source review, not penetration-test results.
