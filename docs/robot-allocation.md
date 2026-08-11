# Robot Allocation and Assignment Management

Allocation is permitted only for an approved contract version. The service checks
manufacturer, requested model, registration, verified ownership, activation,
availability, compliance, lifecycle, maintenance, and interval conflicts inside a
transaction.

Partial fulfillment is valid and reported as requested, allocated, and remaining
capacity. Every successful allocation creates one assignment per robot with
`ready` operational state and `not_eligible` financial state.

Replacement creates a new assignment linked to the prior assignment and marks the
prior record `replaced`; cancellation records the initiating party and reason.
Neither operation deletes history. Audit and outbox entries accompany every
material transition.

Prompt 005 permits only pre-operation states (`pending`, `ready`, and `scheduled`)
plus terminal administrative outcomes needed to preserve history. Live operation
and financial eligibility are introduced only with heartbeat processing.
