# Stripe and Supabase Financial Integration Completion Report

## Status boundary

### CODE IMPLEMENTED

The repository contains the production-oriented Stripe provider abstraction, webhook-authoritative settlement, immutable financial records, user and manufacturer finance APIs, Stripe Elements UI, reconciliation controls, migrations, and deny-by-default Supabase data controls described below.

### EXTERNAL ACCOUNT CONFIGURATION STILL REQUIRED

No live Stripe or Supabase account was available in this environment. The migrations were not applied to a hosted database and no real card, ACH, Connect payout, webhook, refund, dispute, or reconciliation was executed. Production readiness therefore requires the manual setup and end-to-end tests at the end of this report.

## 1–26. Architecture and supported flows

1. **Stripe architecture:** REST backend owns Stripe secret operations; the browser uses Stripe Elements and only receives client secrets. Signed, idempotently stored webhooks are authoritative for settlement.
2. **Supabase architecture:** Supabase is the planned hosted PostgreSQL and private object-storage infrastructure. The existing Fastify API and database migrations remain authoritative; Supabase Auth is not silently substituted for the existing authentication system.
3. **Users that can pay:** individual robot owners fund downpayments/direct ownership; hiring companies pay invoices and contract charges through the existing company billing implementation.
4. **Users that can receive:** robot owners receive uptime earnings and manufacturers receive approved purchase-order settlements through Stripe Connect.
5. **Payment methods:** reusable cards and US bank accounts are modeled. Bank methods remain unavailable until Stripe reports verification/availability.
6. **Bank-account payment flows:** owner ACH funding and company bank-payment support flow through provider-backed payment methods; asynchronous settlement remains webhook-authoritative.
7. **Bank-account payout flows:** owner and manufacturer Connect onboarding, status refresh, eligibility checks, transfers, and settlement events are implemented.
8. **Stripe Customers:** individual users receive idempotent Stripe Customers with internal user metadata; company Customer behavior remains supported by the pre-existing billing implementation.
9. **Stripe Connect:** owner and manufacturer connected accounts, onboarding/refresh URLs, requirements, payout readiness, and safe identifiers are persisted.
10. **Downpayments:** real external funding creates a pending ledger item and credits the downpayment balance/queue only after a successful signed webhook.
11. **Seven-day ownership payments:** an authenticated owner can pay the remaining direct-allocation amount with an active external method before the allocation deadline.
12. **Balance plus external payment:** the allocation service computes the outstanding amount after already-applied internal funds; the external PaymentIntent covers only the remainder.
13. **Company billing:** reusable company methods, invoice collection, retries, refunds, disputes, and settlement already exist and remain integrated.
14. **Uptime contract billing:** verified operating time continues into the existing invoice and company collection ledger.
15. **Robot-owner earnings:** uptime earnings remain in the existing robot-owner statements and ledger.
16. **Robot-owner payouts:** eligible statements transfer through the owner's verified Connect account; paid webhooks finalize payout state.
17. **Manufacturer settlement:** accepted/fulfillable purchase orders can create explicit gross, platform-fee, and net payables. Platform transfer is implemented where selected; external settlement can still be documented as external.
18. **Manufacturer bank payouts:** verified Connect accounts can receive payable transfers. Paid, failed, and reversed webhook outcomes update transfer/payable state.
19. **Platform fees:** manufacturer payables explicitly store gross, platform fee, and generated net amount; the unified ledger supports platform-fee records.
20. **Refunds:** authorized downpayment refunds reserve available balance before provider submission. Signed success updates refunded totals and the immutable ledger; provider failure restores the reserved balance.
21. **Disputes:** disputes are persisted and create debit/credit records. Related allocations and ownership are flagged for financial review and are never silently removed.
22. **Webhooks:** signature verification, environment matching, durable event identity, duplicate protection, attempt/failure state, transactional application, and safe retry behavior are implemented.
23. **Reconciliation:** an administrator can compare up to 500 known funding PaymentIntents with Stripe and persist matched/mismatched items without treating the browser as settlement authority.
24. **Tables/migrations:** individual financial profiles/methods, funding payments, unified immutable ledger, manufacturer profiles/payables/transfers, reconciliation items, refunds, disputes, review flags, and training-compensation deprecation are included.
25. **RLS:** financial tables are RLS-enabled with no direct-client allow policy. This is intentional deny-by-default; access remains through the authenticated backend/service role until narrowly scoped policies are deliberately approved.
26. **Storage:** private training-data, manufacturer-document, and contract-document buckets are conditionally created when the Supabase storage schema is available. No public object policy is installed; signed/backend access must be configured and tested.

## 27. Required environment variables

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` (or legacy `PAYMENT_PROVIDER_API_KEY`)
- `STRIPE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `PAYMENT_PROVIDER_WEBHOOK_SECRET`
- `STRIPE_CONNECT_CLIENT_ID`
- the existing payment execution, environment, return URL, refresh URL, country, and storage/S3 variables documented in `.env.example`

Never expose the Stripe secret key, webhook secret, Supabase service-role key, database password, raw bank data, or raw card data to the browser or logs.

## 28–30. Files and migrations

### Created

- `apps/api/src/user-financial-routes.ts`
- `apps/api/src/postgres-user-financial-service.ts`
- `apps/api/src/manufacturer-financial-routes.ts`
- `apps/api/src/postgres-manufacturer-financial-service.ts`
- `apps/api/src/user-financial-routes.test.ts`
- `apps/web/src/FinancialSettings.tsx`
- `apps/web/src/ManufacturerFinance.tsx`
- `apps/web/src/FinanceAdmin.tsx`
- `packages/payments/src/funding.test.ts`
- `packages/database/migrations/0033_deprecate_training_compensation.sql`
- `packages/database/migrations/0034_individual_stripe_financial_infrastructure.sql`
- `packages/database/migrations/0035_funding_refunds_disputes_supabase_security.sql`
- `docs/stripe-supabase-financial-architecture.md`
- `docs/windows-node-22-setup.md`
- `.nvmrc`
- `.node-version`
- this report

### Modified

- `.env.example`
- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/postgres-payment-service.ts`
- `apps/api/src/postgres-expansion-service.ts`
- `apps/web/src/RootApp.tsx`
- `apps/web/src/ExpansionPages.tsx`
- `apps/web/package.json`
- `packages/payments/src/provider.ts`
- `packages/payments/src/stripe-provider.ts`
- `packages/payments/src/fake-provider.ts`
- `packages/payments/src/config.ts`
- `packages/platform-expansion/src/index.ts`
- the workspace lockfile

### Migrations created

- `0033_deprecate_training_compensation.sql`
- `0034_individual_stripe_financial_infrastructure.sql`
- `0035_funding_refunds_disputes_supabase_security.sql`

## 31–33. Tests and validation

Added provider tests for idempotent individual Customers, stable funding PaymentIntents, and asynchronous/action-required outcomes. Added route tests for authenticated funding, required idempotency, privileged refunds, and reconciliation.

Validated in this environment:

- API typecheck: passed.
- Web typecheck: passed.
- Focused user-financial API tests: 4/4 passed.
- Focused funding-provider tests: 3/3 passed.
- API production build: passed after all final refund, manufacturer-webhook, and admin UI changes.
- Web production build: passed after all final changes.

Environment limitations:

- The current runtime is Node 24.18.0 while the repository requires Node 22.x. The checks emitted an engine warning.
- No `DATABASE_URL`, Docker engine, or `psql` was available, so migrations and PostgreSQL integration tests could not run.
- No Stripe/Supabase credentials were available, so live/sandbox external integration tests could not run.
- The combined changed-file lint invocation exceeded the 60-second command budget without reporting diagnostics.

## 35–36. Training-data exclusions

No active training-worker payout account, earnings ledger, compensation calculation, payment route, Stripe payment, or compensation UI was created. The old compensation-shaped database structure is retained only as non-destructive historical schema and migration `0033` blocks new compensation ledger inserts. Training-data collection remains manufacturer-to-company coordination.

Training-equipment marketplace purchases remain third-party/external. RoboWorkPool does not collect or settle those purchases.

# MANUAL SETUP I NEED FROM YOU

1. Install and select Node 22.x (the repository pins 22.20.0), then run `corepack enable` and install dependencies with the lockfile.
2. Create or select a Supabase project and copy the project URL, public/anon key, service-role key, and direct PostgreSQL connection string.
3. Put those values in the deployment secret manager as `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL`. Do not commit them.
4. Permit database network access from the migration runner and API runtime. Use TLS and a direct/session connection for migrations; use the Supabase-recommended pooled connection for appropriate application workloads.
5. Back up the database, then run all repository migrations in order through `0035`. Confirm all migrations committed successfully.
6. Verify RLS is enabled on the financial tables. Confirm anonymous/authenticated Supabase clients cannot read or write them. Keep finance access behind the API/service role until explicit per-user policies are designed and reviewed.
7. Confirm the three private Storage buckets exist. Keep them private; configure backend signed-upload/download flows and retention policies before uploading real documents.
8. Keep the existing application authentication unless you intentionally schedule a separate Supabase Auth migration. Confirm session/JWT behavior against the deployed API.
9. Create or select a Stripe account, switch to test mode, and complete required business details.
10. Copy the test publishable and secret keys into `STRIPE_PUBLISHABLE_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, and `STRIPE_SECRET_KEY`. Never put the secret key in a `VITE_` variable.
11. Enable card payments, ACH Direct Debit/US bank accounts, and Financial Connections where required. Confirm the business is eligible and accept Stripe's required terms.
12. Enable Stripe Connect, select the account model used by this implementation, configure branding/platform settings, and set the Connect return and refresh URLs to the deployed HTTPS routes.
13. Configure payout schedules and verification requirements for robot-owner and manufacturer connected accounts. Store `STRIPE_CONNECT_CLIENT_ID` if the chosen onboarding mode requires it.
14. Add the deployed webhook endpoint used by the API. Select PaymentIntent/charge success and failure, refund updates/failures, disputes, account updates, payout/transfer paid, failed, and reversed events.
15. Copy the endpoint signing secret into `PAYMENT_PROVIDER_WEBHOOK_SECRET`; ensure `PAYMENT_PROVIDER_ENVIRONMENT=test` and keep payment execution disabled until the test configuration is reviewed.
16. Configure HTTPS application/API return URLs, CORS/origin controls, webhook ingress, and secret rotation procedures. Never route Stripe webhooks through a cache.
17. Run the complete test suite under Node 22. Resolve any repository-wide pre-existing lint/test failures separately, then run API and web production builds.
18. In Stripe test mode, test an owner card downpayment, ACH downpayment (including processing delay), queue eligibility only after settlement, and a failed payment.
19. Test direct seven-day ownership payment with external funds, with existing balance plus external remainder, fractional ownership creation, expiration, and duplicate webhook delivery.
20. Test company card/bank invoice collection for verified uptime, a failed collection, retry, refund, and dispute.
21. Complete robot-owner Connect onboarding, verify bank/payout readiness, submit an earnings payout, and test paid and failed/reversed webhook outcomes.
22. Complete manufacturer Connect onboarding, create an approved purchase-order payable, submit its net transfer, and test paid and failed/reversed outcomes.
23. Test full and partial downpayment refunds. Confirm available funds are reserved while processing and restored on failure.
24. Create a Stripe test dispute. Confirm the dispute ledger entry and financial-review flags appear and ownership is not automatically deleted.
25. Run `/platform/finance` reconciliation. Resolve every status/amount/unmatched exception and retain the run records for audit.
26. Only after all test-mode flows and operational controls pass, rotate to live keys/secrets, register a separate live webhook secret, set the live environment explicitly, repeat low-value smoke tests, and then enable payment execution.

