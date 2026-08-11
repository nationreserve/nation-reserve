# Security release gates

Gitleaks blocks secrets; pnpm audit blocks high dependency findings; source fixtures detect key patterns; Trivy blocks high/critical container findings; SBOMs are retained; Checkov blocks unsafe Terraform. Release evidence also requires SAST/DAST results, authorization/storage isolation tests, webhook/signature tests, upload malware/quarantine checks, TLS/security-header review, and external penetration testing before general availability.

Exceptions require owner, scope, severity, compensating control, expiration, approval, and `security.exception_approved` timeline/audit evidence. Critical exploitable findings cannot be silently waived.
