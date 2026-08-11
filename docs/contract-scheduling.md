# Contract Scheduling Rules

Contract schedules are planning inputs attached to an immutable contract version.
Rules store an IANA time zone, local start/end times, weekday, recurrence bounds,
and optional effective dates. Exceptions represent closures, holidays, blackouts,
or one-off overrides without destroying the recurring rule.

Intervals must have an end after their start. Assignment intervals must be within
the selected contract version's effective period and cannot overlap another live
assignment for the same robot. All timestamps exposed by APIs use ISO 8601; local
wall-clock schedule values retain their named time zone so daylight-saving changes
are resolved deliberately.

A schedule indicates expected work only. It is not evidence of operation and does
not create billable or payable time.

