# Offline Detection

The idempotent offline worker locks due projections with `SKIP LOCKED`. A delayed
heartbeat first produces `degraded`; crossing `offline_after_at` marks the robot
offline/unavailable, closes its open verified interval, opens downtime, and creates
one automatic incident per robot, assignment, and incident type.

```mermaid
flowchart LR
  Due[Expected heartbeat overdue] --> G[Degraded]
  G --> T{Offline threshold reached?}
  T -->|Yes| O[Offline + close interval]
  O --> D[Open downtime and incident]
  D --> R[Valid heartbeat restores tracking without rewriting downtime]
```

