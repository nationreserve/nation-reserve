# Organization context

`OrganizationProvider` is the single client context for user, memberships, active organization, organization type/status, active role/permissions, environment, effective flags, maintenance, and notification summary. Switching accepts only a current membership, calls the server hook, increments the cache epoch, and remembers the selection after success. Pages must not cache data without organization context.

```text
request switch → warn for unsaved changes → server validates membership
→ replace current context → invalidate/partition cache → close stale overlays → render
```
