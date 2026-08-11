# Prompt 014 account UI API gaps

The frontend intentionally blocks or limits four flows until approved backend contracts exist:

- `POST /api/v1/auth/register` for account-only signup before organization choice. Prompt 003 currently creates an organization atomically through role-specific registration.
- Invitation preview and decline APIs that disclose inviter, organization, role, and permissions only to the intended authenticated user without exposing the opaque token.
- Authenticated standalone organization creation after choosing an organization type.
- Account preferences persistence and a verified deletion-request workflow with recent authentication, retention disclosure, recovery period, auditing, and legal handling.

These are implementation gaps, not successful no-op actions. The UI states that no mutation occurred.
