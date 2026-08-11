# Robot Ownership Claims

```mermaid
sequenceDiagram
  Owner->>API: Robot ID + one-time transfer code
  API->>PostgreSQL: lock owner, robot, and code
  PostgreSQL->>PostgreSQL: count active ownerships
  PostgreSQL->>PostgreSQL: consume code + claim + ownership + robot state
  API-->>Owner: Verified ownership
```

Transfer codes are random, hashed, expiring, revocable, and single-use. The transaction
locks the owner and directly enforces the 20-active-robot maximum. Lost, stolen,
suspended, faulted, and maintenance robots count; retired, decommissioned, and
destroyed robots do not.

