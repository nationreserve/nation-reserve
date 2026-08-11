# Role-aware navigation

Every entry in `navigationRegistry` defines label, route, organization types, permissions, optional feature flag, optional maintenance subsystem, and order. Visibility evaluates organization type, all required permissions, effective server flags, and subsystem maintenance. Direct URLs must independently evaluate `evaluateRouteGuard` and backend authorization.

```text
authenticated? → organization? → type/permission? → flag? → maintenance?
→ onboarding? → recent authentication? → allow
```
