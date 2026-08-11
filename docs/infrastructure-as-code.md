# Infrastructure as code

Terraform under `infrastructure/terraform` defines networking, private data services, private storage, ECR, ECS, ALB, identities, logs, backups, and environment isolation. Development, test, staging, and production use independent state and CIDRs. Preview environments derive from test with PR-specific names and are destroyed when the PR closes.

CI runs formatting, validation, and Checkov. Plans are retained artifacts. Applies require a protected GitHub environment, OIDC role, human approval for production, and an approved plan. Secret values and backend credentials are never committed or placed in Terraform variables files.
