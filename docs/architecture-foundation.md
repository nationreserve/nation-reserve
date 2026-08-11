# Architecture foundation

## Initial topology

```text
Browser
  |
  | /api/* through the Vite development proxy
  v
React + Vite web app -----> Fastify API
                              |  |  |
                              |  |  +--> MinIO (S3-compatible object storage)
                              |  +-----> Redis
                              +--------> PostgreSQL

Shared packages:
  config  - server environment validation
  logger  - structured application logging
  types   - transport response types only
```

## Responsibilities

- `apps/api` owns the HTTP process, dependency lifecycle, health checks, error
  handling, and graceful shutdown.
- `apps/web` owns the initial status interface. It has no server credentials and
  reaches the API through the Vite proxy during local development.
- `packages/config` validates server environment variables and fails fast before
  the API starts.
- `packages/logger` creates local readable logs and production JSON logs.
- `packages/types` contains only shared health transport types.
- `docker-compose.yml` provides local PostgreSQL, Redis, and MinIO with persistent
  named volumes and health checks.

## Local request flow

The browser requests `/api/health` and `/api/ready` from Vite. Vite removes the
`/api` prefix and proxies the request to the Fastify API on port 3000. This avoids
permissive development CORS. The API also restricts explicit cross-origin access
to `WEB_ORIGIN`.

`/health` reports only API process liveness. `/ready` performs live checks against
PostgreSQL, Redis, and the configured MinIO bucket. Dependency failures produce a
503 readiness response without crashing the API process.

## Environment boundaries

`.env.example` contains local examples only. `.env` is ignored. Server secrets are
loaded only by the API and Docker Compose; Vite receives no server configuration.
CI uses injected dependencies in tests and therefore requires no live services.

## Intentional exclusions

Prompt 001 creates a runnable engineering foundation only. It deliberately
contains no users, authentication, organizations, robots, telemetry, queue,
contracts, scheduling, billing, notifications, analytics, migrations, or
business-domain tables. Those capabilities require later approved prompts and
must not leak into the foundation.

The business requirements governing those later prompts are maintained in the
[Product Requirements Baseline](product-requirements-baseline.md). That
baseline is authoritative for product behavior but does not expand the
implementation scope of Prompt 001.
