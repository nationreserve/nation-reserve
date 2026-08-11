# Company Inactivity Reporting

An authorized Hiring Company member may report only the robot on its assignment,
using the physical manufacturer's serial number. The report creates an incident and
holds unfinalized evidence for review. It never deletes evidence or automatically
removes finalized time.

```mermaid
sequenceDiagram
  participant C as Company user
  participant A as API
  participant D as Evidence store
  C->>A: Report assigned serial inactive
  A->>D: Verify company, assignment, robot
  A->>D: Create incident and review hold
  A-->>C: Under review
```

