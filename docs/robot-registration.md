# Robot Registration

```mermaid
sequenceDiagram
  Robot Manufacturer->>Manufacturer API: Registration + idempotency key
  API->>PostgreSQL: validate credential, approval, model revision, version
  PostgreSQL->>PostgreSQL: request + robot + hardware identity + audit/outbox
  API-->>Robot Manufacturer: permanent Robot ID
```

Registration normalizes serials, enforces manufacturer uniqueness, hashes secret
hardware identity, and begins unowned, inactive, unavailable, and nonpayable. It does
not establish ownership, allocation, assignment, work, or financial eligibility.

