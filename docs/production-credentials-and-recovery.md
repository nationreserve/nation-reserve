# Production credentials and recovery

Production credentials never belong in Git. RoboWorkPool source, migrations, Supabase functions, infrastructure, workflows, tests, and placeholder templates are backed up in the private repository; secret values persist with the production service that consumes them.

## Authoritative storage

| Variable | Consumer | Classification | Production location |
|---|---|---|---|
| `SUPABASE_URL` | server integrations; future browser client when needed | public endpoint | Supabase project configuration; hosting environment when consumed |
| `SUPABASE_PUBLISHABLE_KEY` | browser only when Supabase client access is implemented | client-safe | Supabase project API keys; web-host environment when consumed |
| `SUPABASE_SECRET_KEY` | trusted server administration only | server secret | Supabase project API keys; backend secret manager only when consumed |
| `DATABASE_URL` | API runtime and Stripe Edge Function | server secret | Supabase Edge Function secrets; future backend secret manager |
| `DIRECT_URL` | migrations and administrative database tooling | server secret | protected CI deployment environment or operator secret manager |
| `STRIPE_PUBLISHABLE_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe.js browser integration | client-safe | web-host build environment |
| `STRIPE_SECRET_KEY` | payment API/worker | server secret | backend secret manager; never the webhook-only Edge Function |
| `PAYMENT_PROVIDER_WEBHOOK_SECRET` | Stripe Edge Function | server secret | Supabase Edge Function secrets |
| `PAYMENT_PROVIDER_CONNECT_WEBHOOK_SECRET` | Stripe Edge Function | server secret | Supabase Edge Function secrets |

The Stripe webhook function additionally stores `PAYMENT_PROVIDER=stripe` and `PAYMENT_PROVIDER_ENVIRONMENT=live`. Its database connection uses Supavisor transaction mode on port 6543. Migration tooling prefers `DIRECT_URL`; it falls back to `DATABASE_URL` only for local compatibility.

The AWS/ECS target is not yet deployed. When it is provisioned, place `DATABASE_URL`, `STRIPE_SECRET_KEY`, Supabase server credentials, and other backend secrets in AWS Secrets Manager and inject them through ECS task secrets. Do not copy the Stripe API key into the webhook-only Edge Function.

## New-computer recovery

1. Clone the private GitHub repository and install the pinned Node/pnpm toolchain.
2. Install and authenticate the Supabase CLI with the operator's own account.
3. Link project reference `djejksnxdhcgtnkinxcp`; the repository intentionally does not contain credentials.
4. Obtain migration/deployment secrets from the protected CI environment or approved secret manager.
5. Validate migrations against staging before production and deploy the Edge Function from source.
6. Authenticate separately to Stripe, GitHub, AWS, and the eventual web host; never copy secrets from Git history.

Recovery is incomplete until protected CI or the production backend secret manager stores `DIRECT_URL` and backend-only Stripe/Supabase credentials, and the web host stores its client-safe build variables.
