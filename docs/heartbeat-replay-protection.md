# Heartbeat Replay Protection

Each credential has unique message-ID and nonce-hash constraints plus a locked
sequence projection. A configurable reorder window permits limited network disorder
without accepting old sequences. Timestamp limits block future and stale batches.
Duplicate evidence is idempotent and never extends an operating interval.

```mermaid
sequenceDiagram
  participant R as Robot
  participant A as API
  participant D as PostgreSQL
  R->>A: Replayed message
  A->>D: Lock credential and sequence state
  D-->>A: Existing message ID or nonce
  A-->>R: duplicate / replay decision
  Note over A,D: No interval extension
```

