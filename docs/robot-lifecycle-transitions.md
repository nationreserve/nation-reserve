# Robot Lifecycle Transitions

Robot state dimensions remain independent. Registration, ownership, activation,
heartbeat, operation, maintenance, compliance, financial eligibility, and final
lifecycle are never collapsed into one status. Services use row locks and
`state_version`; every accepted transition writes state history, audit, and outbox.

Reactivation makes a robot unavailable and nonpayable until checks pass again.
Retirement/decommission/destruction require terminal timestamps and preserve history.

