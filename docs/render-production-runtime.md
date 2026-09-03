# Render production runtime configuration

This document describes configuration only. Creating or syncing the Blueprint is a separate manual action. `render.yaml` has automatic deploys disabled and does not run database migrations or seeds.

## Service topology

| Service                                          | Render type                            | Command                                                       | Schedule         |
| ------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------- | ---------------- |
| `roboworkpool-production-api`                    | Web Service, Docker, standard, Ohio    | `pnpm --filter @nation-reserve/api start`                     | continuous       |
| `roboworkpool-production-redis`                  | Key Value, starter, Ohio, private-only | managed                                                       | continuous       |
| `roboworkpool-production-cache-invalidation`     | Background Worker                      | `node apps/api/dist/cache-invalidation-worker.js`             | continuous       |
| `roboworkpool-production-heartbeat-offline`      | Cron                                   | `node apps/api/dist/offline-worker.js`                        | every minute     |
| `roboworkpool-production-financial-finalization` | Cron                                   | `node apps/api/dist/financial-finalization-worker.js`         | every minute     |
| `roboworkpool-production-allocation-expiration`  | Cron                                   | `node apps/api/dist/allocation-expiration-command.js`         | every minute     |
| `roboworkpool-production-allocation-reminders`   | Cron                                   | `node apps/api/dist/allocation-reminder-command.js`           | every minute     |
| `roboworkpool-production-scheduled-reports`      | Cron                                   | `node apps/api/dist/scheduled-report-worker.js`               | every minute     |
| `roboworkpool-production-reporting-refresh`      | Cron                                   | `node apps/api/dist/reporting-worker.js`                      | every 15 minutes |
| `roboworkpool-production-operations-alerts`      | Cron                                   | `node apps/api/dist/operations-command.js evaluate-alerts`    | every 5 minutes  |
| `roboworkpool-production-invoice-generation`     | Cron                                   | `node apps/api/dist/financial-command.js generate-invoices`   | daily 02:00 UTC  |
| `roboworkpool-production-statement-generation`   | Cron                                   | `node apps/api/dist/financial-command.js generate-statements` | Monday 03:00 UTC |

All application services build with repository root context and `infrastructure/docker/Dockerfile.api`. The image uses Node 22.22, installs the locked pnpm graph, and builds `@nation-reserve/api`. No migration command is part of a deploy.

Automatic invoice collection, payment retry, payment reconciliation, settlement preparation, payout, refund, and every simulation command are deliberately absent. Those paths can move money or currently require a real authorized platform actor. The existing Supabase `stripe-webhook` Edge Function remains the Stripe event destination; it is not moved to Render.

The heartbeat offline detector is currently a one-shot command. Render Cron has one-minute granularity, so its effective evaluation interval is one minute even though the domain default is 15 seconds. Moving it to a continuously looping worker is a future latency improvement, not required for initial API hosting.

## Render environment groups

Create these groups before syncing `render.yaml`.

### `roboworkpool-production-runtime`

| Variable                           | Classification                      | Required value / source                                                                            | Current status                       |
| ---------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `NODE_ENV`                         | public/client-safe operational      | `production`                                                                                       | known                                |
| `DEPLOY_ENVIRONMENT`               | public/client-safe operational      | `production`                                                                                       | known                                |
| `DATABASE_URL`                     | server secret / external credential | Production Supabase pooled application connection for project `djejksnxdhcgtnkinxcp`, TLS required | still needed in Render               |
| `S3_ENDPOINT`                      | server configuration                | `https://djejksnxdhcgtnkinxcp.storage.supabase.co/storage/v1/s3`                                   | known, verify in Storage S3 settings |
| `S3_REGION`                        | server configuration                | Exact region shown by Supabase Storage S3 settings                                                 | still needed                         |
| `S3_ACCESS_KEY`                    | external-service credential         | Generated Supabase Storage S3 Access Key ID                                                        | still needed                         |
| `S3_SECRET_KEY`                    | external-service credential         | Matching Supabase Storage S3 Secret Access Key                                                     | still needed                         |
| `S3_TRAINING_DATA_BUCKET`          | server configuration                | `training-data-private`                                                                            | bucket exists; Render value needed   |
| `S3_MANUFACTURER_DOCUMENTS_BUCKET` | server configuration                | `manufacturer-documents-private`                                                                   | bucket exists; Render value needed   |
| `S3_CONTRACT_DOCUMENTS_BUCKET`     | server configuration                | `contract-documents-private`                                                                       | bucket exists; Render value needed   |
| `WEB_ORIGIN`                       | public/client-safe                  | `https://nationreserve.com`                                                                        | known                                |
| `LOG_LEVEL`                        | public/client-safe operational      | `info`                                                                                             | known                                |
| `PAYMENT_PROVIDER`                 | server configuration                | `stripe`                                                                                           | known                                |
| `PAYMENT_PROVIDER_ENVIRONMENT`     | server configuration                | `live`                                                                                             | known                                |
| `PAYMENT_EXECUTION_ENABLED`        | security-sensitive feature switch   | `true` only because live execution was separately approved/configured                              | known decision; enter explicitly     |
| `COOKIE_SECURE`                    | security setting                    | `true`                                                                                             | known                                |
| `TIMELINE_PROJECTION_ENABLED`      | business-rule setting               | `true`                                                                                             | known                                |
| `SPECIFICATION_SYNC_ENABLED`       | security setting                    | `false`                                                                                            | known                                |
| `DOWNPAYMENT_ENROLLMENT_ENABLED`   | business-rule setting               | `false` until public enrollment is approved                                                        | known default                        |

Each service receives `REDIS_URL` directly from the private Render Key Value `connectionString`. Do not place a public Redis URL in either group.

### `roboworkpool-production-api-secrets`

| Variable                                  | Classification              | Required value / source                                                                 | Current status                                                            |
| ----------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `RESEND_API_KEY`                          | external-service credential | Existing production Resend sending key                                                  | available locally; not yet in Render                                      |
| `RESEND_FROM_EMAIL`                       | public/client-safe          | `no-reply@mail.nationreserve.com`                                                       | available                                                                 |
| `AUTH_SIGNING_KEY`                        | generated secret            | Independent 48-byte base64url secret                                                    | must generate                                                             |
| `MANUFACTURER_API_KEY_PEPPER`             | generated secret            | Independent 48-byte base64url secret                                                    | must generate                                                             |
| `PAYMENT_PROVIDER_API_KEY`                | external-service credential | Stripe live secret key; this is the canonical variable used by API and payment commands | configured elsewhere; copy securely to Render                             |
| `PAYMENT_PROVIDER_WEBHOOK_SECRET`         | external-service credential | Platform-account Stripe endpoint `whsec_...`                                            | configured on Edge Function; copy securely if retaining API webhook route |
| `PAYMENT_PROVIDER_CONNECT_WEBHOOK_SECRET` | external-service credential | Connected-account Stripe endpoint `whsec_...`                                           | configured on Edge Function; copy securely if retaining API webhook route |
| `STRIPE_CONNECT_CLIENT_ID`                | external-service credential | Stripe Connect platform client ID; optional for current hosted Express onboarding code  | obtain only if future OAuth flow uses it                                  |
| `STRIPE_CONNECT_ACCOUNT_TYPE`             | server configuration        | `express`                                                                               | known                                                                     |
| `STRIPE_PLATFORM_COUNTRY`                 | server configuration        | `US`                                                                                    | known                                                                     |
| `STRIPE_PLATFORM_CURRENCY`                | server configuration        | `USD`                                                                                   | known                                                                     |
| `PAYMENT_METHOD_SETUP_RETURN_URL`         | public/client-safe URL      | `https://nationreserve.com/settings/billing`                                            | known                                                                     |
| `PAYOUT_ONBOARDING_RETURN_URL`            | public/client-safe URL      | `https://nationreserve.com/settings/payouts`                                            | known                                                                     |
| `PAYOUT_ONBOARDING_REFRESH_URL`           | public/client-safe URL      | `https://nationreserve.com/settings/payouts`                                            | known                                                                     |

`STRIPE_SECRET_KEY` is a supported legacy alias, but Render should use `PAYMENT_PROVIDER_API_KEY` so both the API and command entrypoints receive the same canonical name. Stripe publishable keys are not required by the Fastify process.

### `roboworkpool-production-heartbeat-secrets`

| Variable                              | Classification   | Required value / source                                                                      | Current status |
| ------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------- | -------------- |
| `ROBOT_HEARTBEAT_HMAC_ENCRYPTION_KEY` | generated secret | Independent 48-byte base64url secret; must remain stable to decrypt stored robot credentials | must generate  |

The API also requires this group. The offline-detection cron validates the heartbeat configuration and therefore receives it too.

## Optional tuning variables

The code has secure defaults for these. Add them only when operational tuning is approved: `SHUTDOWN_TIMEOUT_MS`, all `AUTH_*_TTL` and Argon2/lock settings, all `MANUFACTURER_*`/activation TTL and rate settings, all `HEARTBEAT_*` interval/rate/retention settings, all `FINANCIAL_*`, billing/statement prefixes and schedules, `SETTLEMENT_EXECUTION_ENABLED` (must remain `false`), payment timeout/retry/retention settings, and `OPERATIONS_*` limits/timeouts.

Do not set development-only `FINANCIAL_DEVELOPMENT_*`, `PAYMENT_DEVELOPMENT_*`, `PAYMENT_FAKE_MODE`, or heartbeat simulator variables in production.

## Web build variables

| Variable                      | Classification                         | Value                                                                         |
| ----------------------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`           | public/client-safe build value         | `https://api.nationreserve.com`                                               |
| `VITE_STRIPE_PUBLISHABLE_KEY` | public/client-safe external credential | Stripe live publishable key, only if the current payment UI build requires it |

The web source reads `VITE_API_BASE_URL`; localhost only appears in the Vite development proxy and fallback development behavior. Production must build with the value above. No browser-direct Supabase variable is required by the intended Browser -> API -> Supabase architecture.

## Secret generation commands

Run each command separately and paste each output directly into Render. Do not save the output in source files or shell history where avoidable:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Run it three times for `AUTH_SIGNING_KEY`, `MANUFACTURER_API_KEY_PEPPER`, and `ROBOT_HEARTBEAT_HMAC_ENCRYPTION_KEY`. Do not reuse a value across purposes.

## Supabase Storage

1. In the production project, enable the Storage S3 protocol.
2. Create a dedicated S3 access-key pair. These keys are server-only and bypass Storage RLS, so store them only in the Render environment group.
3. Copy the direct endpoint and exact region from Storage > S3 Configuration. The direct endpoint is expected to be `https://djejksnxdhcgtnkinxcp.storage.supabase.co/storage/v1/s3`.
4. Pre-create one non-public Files bucket (`roboworkpool-private` recommended). Production code deliberately refuses to create missing buckets.
5. Keep the bucket private. The API authorizes the user, creates short-lived presigned PUT URLs (15 minutes) and GET URLs (5 minutes), and never converts training data into public objects.

The adapter already uses `forcePathStyle: true`, SigV4 through AWS SDK v3, `HeadBucket`, `PutObject`, and `GetObject`, matching Supabase's documented S3 interface. Do not configure AWS ACLs, bucket CORS APIs, object locking, SSE-C, or versioning. Supabase does not support all AWS S3 extensions. Before launch, run a non-production upload/download smoke test containing the optional SHA-256 upload parameter because Supabase's compatibility table does not explicitly promise the `ChecksumSHA256` PutObject header.

## Redis

Use one paid private Render Key Value instance in Ohio. `ipAllowList: []` prevents public ingress. `REDIS_URL` comes from its private connection string. `allkeys-lru` matches the current use as rate-limit counters and cache entries; database-backed invalidation events remain authoritative. Journal/snapshot persistence is enabled by the Blueprint, although correctness does not rely on Redis surviving a restart.

## Domain and DNS

After the API has deployed successfully on its Render hostname and `/ready` returns 200:

1. Add `api.nationreserve.com` as the web service custom domain in Render.
2. In Cloudflare DNS, remove any conflicting `api` A/AAAA/CNAME record.
3. Add `CNAME api -> <the Render service>.onrender.com`, initially **DNS only**.
4. Keep Cloudflare SSL/TLS mode at **Full**.
5. Verify the domain in Render and wait for its managed certificate.
6. Confirm `https://api.nationreserve.com/ready` returns 200 and reports PostgreSQL, Redis, and object storage as `up`.
7. Cloudflare proxying may be enabled only after Render verification/certificate issuance and a second health/CORS check.

Render terminates public TLS. Fastify binds `0.0.0.0:10000`; CORS accepts only `https://nationreserve.com`.

## Post-creation validation

1. Build succeeds from `infrastructure/docker/Dockerfile.api`.
2. API logs contain no environment-validation or development-adapter errors.
3. `/live` returns 200.
4. `/ready` returns 200 with all three dependencies `up`.
5. An OPTIONS request with Origin `https://nationreserve.com` receives the correct CORS origin; an unapproved origin does not.
6. Confirm the Key Value instance has no public allowlist.
7. Confirm the bucket is private and a signed test upload/download works without exposing a public object URL.
8. Confirm no migration or seed command ran.
9. Keep automatic deploy disabled until this checklist passes; then choose CI-check-gated deployment deliberately.
