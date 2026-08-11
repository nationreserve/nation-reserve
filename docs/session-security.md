# Session Security

Refresh tokens never enter browser-readable storage. Session rows expose dates,
device description, and status but never token hashes or full IP history. Refresh
operations use row locks so concurrent use succeeds once. Reuse compromises the
family. Password reset and logout-all revoke server records.

Cookie state changes require trusted Origin/Referer validation. SameSite is defense
in depth, not the only CSRF control. Production requires HTTPS and Secure cookies.

