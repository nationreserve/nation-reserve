# CD pipeline

Build and deployment are separate. A tagged commit produces an immutable release manifest and image digests. Staging promotes those digests, runs locked migrations, smoke tests, critical E2E, accessibility, payment test-mode, heartbeat simulator, upload, resilience, and performance gates. Production promotion uses the same digests and requires protected-environment approval.

ECS rolling deployment maintains 100% healthy capacity and uses circuit-breaker rollback. High-risk services may move to CodeDeploy blue/green without changing artifact semantics. Workers receive SIGTERM, stop claiming jobs, complete or release current work, and preserve idempotency.
