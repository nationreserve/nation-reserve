# Release management

`release-manifest.json` records release number, commit, branch, tool versions, lockfile hash, specification version, migration bundle/version, and image digests. Database tables record releases, deployments, migration executions, scans, approvals, failures, and rollback linkage. Production approval, deployment, restore, and rollback permissions belong only to platform administrative roles and require step-up authentication in the operational API.

Main remains deployable. Feature branches use PRs; release and hotfix branches retain the same security minimum. Feature flags separate deployment from exposure but cannot bypass authorization, timeline/audit, immutable financial rules, or verified-time requirements.
