# Frontend architecture

The web app consumes two workspace packages: `design-system` owns rendering primitives and vocabulary; `application-shell` owns identity, context, navigation, guards, shell state, and development fixtures. Feature pages remain in `apps/web` until their assigned prompt. Organization-scoped cache keys contain user, organization, environment, epoch, resource, and filters.

```text
route → session context → route guards → shell → page state → feature page
                         ↘ navigation filters (role, permission, flag, maintenance)
```

Authenticated API calls remain server-authorized. Hiding navigation is usability, never authorization.
