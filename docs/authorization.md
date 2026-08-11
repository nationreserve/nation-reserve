# Authorization

Platform roles and organization roles are separate membership contexts. A hiring
company or manufacturer administrator never becomes a Nation Reserve administrator.
The centralized matrix lives in `@nation-reserve/auth`; route handlers request
permissions rather than comparing raw role strings.

An organization decision requires an authenticated, non-revoked session; active
user; verified email; usable organization; active compatible membership; required
permission; matching resource organization; and no restriction. Backend checks are
authoritative. Hidden frontend controls are usability only.

Step-up assurance levels and middleware contracts exist for future MFA. No action is
currently represented as MFA-protected.

