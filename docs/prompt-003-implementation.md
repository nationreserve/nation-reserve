# Prompt 003 Implementation

This increment adds the authentication database model, Argon2id and JWT primitives,
opaque token hashing, refresh rotation/reuse semantics, registration and login
service boundaries, PostgreSQL registration/session adapter, centralized role
permissions, resource authorization, step-up contracts, safe development email, and
non-production in-memory rate limiting.

Production robot authentication, heartbeat, billing, payroll, queue, contract
fulfillment, social login, passkeys, full MFA, SMS, and platform administration remain
deferred.

