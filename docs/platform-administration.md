# Platform administration

Nation Reserve staff operate RoboWorkPool through permission-specific platform roles. Support is read-only; Operations manages workers and maintenance; Billing observes financial operations; Security handles security events and incidents; Platform Admin manages configuration, flags, announcements, and maintenance. Super Admin cannot bypass balanced journals, immutable history, validation, audit, or step-up requirements.

Administrative mutations write an audit record and outbox event in the same transaction. Bearer-authenticated routes are rate limited. Destructive controls require a short-lived, single-use password step-up grant.