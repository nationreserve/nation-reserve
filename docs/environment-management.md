# Environment management

Supported environments are local, development, test, preview, staging, and production. Each cloud environment has separate database, Redis, object bucket, encryption boundary, integrations, DNS, monitoring labels, timeline, and audit records. Preview/test use synthetic data and test providers. Staging is production-like but never uses unapproved live money movement. Production startup rejects fake payments, test provider mode, insecure cookies/origins/storage, and disabled timeline projection.

Build configuration contains public compile-time values only. Runtime non-secrets are validated by Zod. Secrets come from service identity and Secrets Manager. Platform-editable configuration and feature flags remain database governed and audited.
