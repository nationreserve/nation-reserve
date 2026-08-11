# Prompt 014 implementation

Prompt 014 implements the complete shared authentication, Nation Reserve account, organization-entry, and account-management UI. Role-specific Robot Owner, Hiring Company, Robot Manufacturer, and Platform Administration workflows remain outside this prompt.

Implemented routes cover login, shared registration, success, email verification states, password recovery/reset, invitations, logout confirmation, organization selection/creation education, account overview/profile/security/sessions/preferences/organizations/notifications/delete, session expiration, and future API consent.

Existing Prompt 003 APIs are reused for login, logout, verification, password reset, account profile, password change, session list/revocation, organization memberships/default selection, and invitation acceptance. The UI does not claim success for missing backend contracts.
