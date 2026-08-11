# Nation Reserve - RoboWorkPool

Production-oriented TypeScript monorepo foundation for RoboWorkPool. Prompt 001
provides a Fastify API, React/Vite web app, shared packages, and local PostgreSQL,
Redis, and MinIO infrastructure.

No business features have been implemented yet.

## Product requirements baseline

The authoritative business source of truth is
[docs/product-requirements-baseline.md](docs/product-requirements-baseline.md).
Future implementation prompts must identify the baseline version and sections
they implement. The baseline documents product requirements but does not itself
authorize business-feature implementation. The complete appendix reading order is in
[docs/master-specification-index.md](docs/master-specification-index.md).

## Repository structure

```text
apps/
  api/       Fastify API and dependency health checks
  web/       React status interface
packages/
  config/    Zod environment validation
  logger/    Shared Pino configuration
  types/     Shared health response types
infrastructure/docker/
docs/
.github/workflows/
```

## Prerequisites

- Node.js 22 LTS
- pnpm 11 (Corepack can provide it)
- Docker with Docker Compose

## Setup

1. Copy `.env.example` to `.env`.
2. Replace the clearly marked local passwords if needed.
3. Install dependencies:

   ```sh
   corepack pnpm install
   ```

4. Start PostgreSQL, Redis, and MinIO:

   ```sh
   corepack pnpm docker:up
   ```

5. Start the API and web application:

   ```sh
   corepack pnpm dev
   ```

6. Open <http://localhost:5173>.
7. Verify <http://localhost:3000/health> and
   <http://localhost:3000/ready>.

## Local URLs

| Service       | URL                            |
| ------------- | ------------------------------ |
| Web           | <http://localhost:5173>        |
| API health    | <http://localhost:3000/health> |
| API readiness | <http://localhost:3000/ready>  |
| MinIO API     | <http://localhost:9000>        |
| MinIO console | <http://localhost:9001>        |
| PostgreSQL    | `localhost:5432`               |
| Redis         | `localhost:6379`               |

## Commands

| Command                      | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `corepack pnpm dev`          | Run API and web development servers                     |
| `corepack pnpm build`        | Build all workspaces                                    |
| `corepack pnpm test`         | Run all tests once                                      |
| `corepack pnpm test:watch`   | Run tests in watch mode                                 |
| `corepack pnpm lint`         | Lint all workspaces                                     |
| `corepack pnpm typecheck`    | Type-check all workspaces                               |
| `corepack pnpm format`       | Format repository files                                 |
| `corepack pnpm format:check` | Check formatting                                        |
| `corepack pnpm clean`        | Remove generated workspace output and root dependencies |
| `corepack pnpm docker:up`    | Start local dependencies                                |
| `corepack pnpm docker:down`  | Stop local dependencies                                 |
| `corepack pnpm docker:logs`  | Follow local dependency logs                            |

## Health behavior

- `GET /health` returns 200 when the API process is alive.
- `GET /ready` checks PostgreSQL, Redis, and the configured MinIO bucket. It
  returns 200 only when every dependency is up; otherwise it returns 503 with
  individual dependency states.

The API can remain alive with degraded readiness when a dependency is temporarily
unavailable.

## Local proxy and CORS

Vite proxies `/api/*` to the API and removes the `/api` prefix. The browser can
therefore call `/api/health` without permissive CORS. Fastify separately restricts
explicit cross-origin requests to `WEB_ORIGIN`.

## Troubleshooting

- If environment validation fails, compare `.env` with `.env.example`. Secrets
  have no silent defaults.
- If `/ready` returns 503, run `corepack pnpm docker:logs` and check the reported
  dependency state.
- If ports are occupied, update both `.env` and any corresponding local URLs.
- If `pnpm` is not installed globally, prefix commands with `corepack` as shown.
- Docker Desktop must be running before `docker:up`.

## Scope

Prompt 001 intentionally excludes accounts, authentication, organizations,
robots, manufacturer onboarding, telemetry, queue allocation, contracts,
scheduling, billing, notifications, administration, analytics, migrations, and
business-domain database tables. See
[`docs/architecture-foundation.md`](docs/architecture-foundation.md) for the
foundation boundaries and
[docs/product-requirements-baseline.md](docs/product-requirements-baseline.md)
for the authoritative future product rules.

## Production heartbeat (Prompt 006)

Robots submit signed evidence to `POST /robot-api/v1/heartbeat` using a robot-scoped credential. HMAC-SHA-256 and Ed25519 are supported. Configure `ROBOT_HEARTBEAT_HMAC_ENCRYPTION_KEY` and the `HEARTBEAT_*` values documented in `docs/production-heartbeat.md`.

Development commands:

- `pnpm heartbeat:simulate` generates a valid signed request; set `HEARTBEAT_SIMULATOR_INVALID_SIGNATURE=true` for signature-failure testing and reuse a captured message ID/nonce for replay testing.
- `pnpm heartbeat:offline` runs one idempotent offline-detection pass.
- `pnpm --filter @nation-reserve/heartbeat-domain test` runs signing/domain tests.
- `pnpm --filter @nation-reserve/database test` checks evidence migrations; set `TEST_DATABASE_URL` for PostgreSQL integration tests.

Inspect `verified_operating_intervals`, `robot_downtime_intervals`, and `robot_operational_incidents` in PostgreSQL. These records are operational evidence only; Prompt 006 creates no payroll, invoice, payout, or payment.

## Financial subledger (Prompt 007)

All authoritative money uses integer USD minor units and versioned basis-point rates. Run:

- `pnpm financial:finalize-operating-time`
- `pnpm billing:generate-invoices`
- `pnpm payroll:generate-statements`
- `pnpm financial:reconcile`
- `pnpm settlement:prepare`
- `pnpm financial:simulate` (development only)

Inspect `journal_entries` with `journal_lines` to verify equal debit and credit totals; inspect `financial_accruals`, `company_invoices`, and `robot_owner_earnings_statements` for source attribution. Configure the `FINANCIAL_*`, `BILLING_*`, `EARNINGS_*`, and `SETTLEMENT_*` variables documented in `docs/prompt-007-implementation.md`. `SETTLEMENT_EXECUTION_ENABLED` must remain `false`: no external company charge or owner payout is connected.

## Payment execution (Prompt 008)

External execution is disabled by default. Local development uses `PAYMENT_PROVIDER=fake`, `PAYMENT_PROVIDER_ENVIRONMENT=test`, and a non-production webhook secret. For Stripe test mode, select `stripe`, provide `sk_test_...`, configure the SetupIntent and Connect return URLs, forward Stripe events to `/api/v1/payment-webhooks/stripe`, and enable execution only when intentionally testing money movement.

Company billing uses the `/api/v1/organizations/:organizationId/billing/payment-methods/*` setup and confirmation flow. Owner payout onboarding uses `/earnings/payout-account/onboarding-link` and `/refresh`. Platform operators submit invoice collections and statement payouts through the platform endpoints; status remains submitted/processing until a verified event confirms settlement.

Inspect `payment_attempts`, `payout_attempts`, `payment_processor_events`, `journal_entries`, and `journal_lines` in PostgreSQL. Run focused checks with `pnpm --filter @nation-reserve/payments test`, `pnpm --filter @nation-reserve/database test`, and `pnpm --filter @nation-reserve/api test`. See [payment architecture](docs/payment-architecture.md) and [Prompt 008 implementation](docs/prompt-008-implementation.md).
### Payment operations commands

- `pnpm payments:collect-invoices` â€” submit eligible automatic company collections.
- `pnpm payments:retry` â€” process due bounded retries with linked attempt history.
- `pnpm payments:reconcile` â€” compare nonterminal attempts with provider evidence.
- `pnpm payments:simulate-company-payment`
- `pnpm payments:simulate-owner-payout`
- `pnpm payments:simulate-webhook`
- `pnpm payments:simulate-refund`

Simulation commands require the fake test provider and are rejected in production. Owner-payout and refund simulations use the documented `PAYMENT_DEVELOPMENT_*` fixture IDs. Webhooks must be forwarded without body transformation to `/api/v1/payment-webhooks/stripe`.
## Operations Center (Prompt 009)

Platform personnel use `/platform` for cross-system health, global search, feature flags, validated configuration, jobs, workers, incidents, maintenance, announcements, diagnostics, alerts, and immutable audit exploration.

Health surfaces:

- `GET /live` â€” process liveness.
- `GET /health` â€” API health.
- `GET /ready` â€” PostgreSQL, Redis, and object-storage readiness.
- `GET /api/v1/platform/health` â€” authenticated worker, queue, memory, uptime, and configuration health.
- `GET /api/v1/platform/metrics` â€” authenticated Prometheus-compatible operational metrics.

Feature flags are server-side, environment-specific, cached briefly, safely disabled when absent, and versioned. Configuration keys use registered Zod validators. Maintenance and job cancellation require a short-lived password step-up token in `X-Admin-Step-Up`. Administrative mutation routes are permission checked, rate limited, audited, and publish outbox events.

See [platform administration](docs/platform-administration.md), [Operations Center](docs/operations-center.md), and [Prompt 009 implementation](docs/prompt-009-implementation.md).
## Specification registry and implementation control

The canonical machine-readable registry is in [docs/specification](docs/specification/README.md). It records source presence, permanent requirement IDs, traceability, screens, journeys, explanations, roles, APIs, data, events, tests, prompts, conflicts, and deferred work. The `/platform/specification` dashboard is a platform-only read projection; it is not the canonical source.

Commands:

- `corepack pnpm specification:validate` â€” schema and referential validation.
- `corepack pnpm specification:coverage` â€” warning-oriented coverage report.
- `corepack pnpm specification:coverage:strict` â€” fails on critical gaps.
- `corepack pnpm specification:report` â€” regenerate Markdown and JSON reports.
- `corepack pnpm specification:sync` â€” validate and upsert the trusted bundle into PostgreSQL without silent deletion.

To add a requirement, screen, test mapping, explanation, conflict, or prompt mapping, update the corresponding YAML and traceability record, then validate. Published requirement identifiers are never reused. Source precedence is: approved latest amendment, Appendix M, Appendix A, domain appendix, functional specification, technical architecture, current prompt, then existing behavior.

Every later prompt must start from [the required prompt header](docs/specification/prompt-header-template.md), run validation first, and list the registry artifacts it targets. Pull requests changing governed behavior must complete the specification-impact template. Strict coverage is enforced on protected main-branch pushes.

## Frontend foundation (Prompt 012)

The shared design system is in `packages/design-system`; application context, navigation, guards, and shells are in `packages/application-shell`. Run `corepack pnpm web:dev`, then open `/development/components` for the isolated component gallery. Use `web:test`, `web:test:a11y`, `web:test:e2e`, and `web:test:visual` for focused checks; `storybook` is an alias for the backend-free gallery.

Register navigation centrally in `navigationRegistry`, wrap protected pages in `OrganizationProvider`, use organization-aware cache keys, add statuses to the central `statuses` registry, and add user explanations to `docs/specification/user-explanations.yaml`. Every new screen must update Prompt 011 traceability. Theme values are `system`, `light`, and `dark`; no additional environment variable is required for the frontend foundation. The existing `VITE_API_BASE_URL` remains the API base override.


## Environments and delivery

Local development uses `pnpm docker:up`, `pnpm db:migrate`, and `pnpm dev` with development-only values copied from `.env.example`. Test is disposable. Preview environments are PR-scoped, synthetic, and forbidden from production data or secrets. Staging is production-like with test-mode integrations. Production uses the protected immutable-release workflow and requires approval.

Required CI entry points are `pnpm ci:validate`, `pnpm ci:test`, `pnpm ci:security`, and `pnpm ci:build`. Infrastructure uses `pnpm infrastructure:validate` and protected workflow plan/apply. Migrations use `pnpm migrate:plan`, `pnpm migrate:deploy`, and `pnpm migrate:status`. Runtime secrets belong in the managed secret store; production startup rejects development adapters, fake/test payments, insecure origins/cookies, placeholder secrets, and disabled Appendix O projection.

Release verification uses `pnpm release:create`, `pnpm release:validate`, `pnpm test:e2e:critical`, `pnpm test:accessibility`, `pnpm test:security`, `pnpm test:load`, `pnpm test:resilience`, and `pnpm backup:test`. Staging/production/rollback actions must use the protected GitHub workflows; local commands cannot apply production infrastructure or rollback. Smoke and launch checks are `pnpm launch:check`, `pnpm launch:smoke`, and `pnpm launch:verify`.

See [deployment architecture](docs/deployment-architecture.md), [release management](docs/release-management.md), [launch checklist](docs/checklists/production-launch.md), [manual review](docs/checklists/prompt-021-manual-review.md), [launch-day runbook](docs/runbooks/launch-day.md), and [operations runbooks](docs/runbooks/operations.md). Release, deployment, migration, rollback, restore, configuration, and security lifecycle events are automatically projected to authorized Platform timelines under canonical Appendix O.

