# Manufacturer API Authentication

Manufacturer credentials are not human sessions. Keys use
`rwp_sbx_<prefix>_<secret>` or `rwp_prod_<prefix>_<secret>`. The secret has 256 bits
of entropy and is returned once. PostgreSQL stores only a peppered HMAC-SHA-256 hash
and a display prefix. Authentication checks hash, status, expiry, environment,
manufacturer suspension, production approval, and explicit scope on every request.

Sandbox credentials cannot mutate production records. Rotation creates a replacement
and a bounded overlap; revocation is immediate. Raw keys are prohibited from logs,
audits, outbox payloads, and persistent browser storage.

