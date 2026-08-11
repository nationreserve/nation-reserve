# Secret management

AWS Secrets Manager stores database/Redis credentials, JWT and encryption keys, Stripe credentials/webhook secrets, email/storage/search credentials, manufacturer peppers, heartbeat keys, and monitoring credentials. ECS task identity grants individual secret reads. GitHub uses OIDC; long-lived cloud keys are prohibited.

Secrets never enter Terraform state as plaintext inputs, images, frontend bundles, logs, SBOMs, or release manifests. Environments have separate secrets. Expiration and access are monitored and audited. Local `.env` is ignored and contains development-only values.
