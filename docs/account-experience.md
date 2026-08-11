# Nation Reserve account experience

A Nation Reserve account is the shared identity boundary. Organization memberships determine role, permissions, and data scope. First entry follows this decision:

```text
verify account → load memberships
  ├─ zero: create or accept invitation
  ├─ one: enter the authorized organization
  └─ multiple: choose an organization
```

Authentication pages use a focused shell and shared help links. Account-management pages use the authenticated shell. Password recovery remains enumeration-safe, opaque tokens never appear in visible copy, logout requires confirmation, current sessions cannot be accidentally revoked, and deletion displays retention consequences before any action.
