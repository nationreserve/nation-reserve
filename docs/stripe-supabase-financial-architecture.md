# Stripe and Supabase financial architecture

The authenticated Fastify backend owns all business authorization and secret-key operations. Stripe performs external money movement. Supabase may host PostgreSQL and private S3-compatible Storage; it does not replace the existing API, custom authentication, migrations, or immutable RoboWorkPool ledger.

The browser receives only the Stripe publishable key and SetupIntent/PaymentIntent client secret needed by Stripe Elements. It never receives Stripe secret keys, Supabase service-role credentials, raw card details, or raw bank credentials.

## Money flows

- Owner funding: Stripe Customer/payment method → PaymentIntent → signed webhook → unified ledger → dollar down-payment account → deterministic queue.
- Direct ownership: existing balance plus a funding PaymentIntent → signed webhook → allocation balance → whole/fractional ownership, subject to the 20-unit contract cap.
- Company billing: existing company customer and invoice collection → webhook → company invoice and journal ledger.
- Owner payouts: existing Stripe Connect Express onboarding → verified capability/account state → statement transfer → connected bank.
- Manufacturer settlement: schema supports purchase-order payables and connected-account transfers. Transfers must be initiated only after an approved payable and production Connect configuration.

Training data has no worker earnings, compensation, payout ledger, or Connect onboarding. Equipment links send users directly to third-party sellers.

## Supabase

Set `DATABASE_URL` to the Supabase PostgreSQL pooler connection string. The existing SQL migration runner remains authoritative; do not also manage these tables through a competing Supabase schema workflow. The browser does not directly query financial tables, so RLS is not the authorization boundary: the API and organization/user checks are. If direct Supabase client access is introduced later, enable RLS before exposing any table.

For Supabase Storage, configure the existing S3 adapter with the project's S3-compatible endpoint and private bucket credentials. Training assets remain private and are exposed only through short-lived signed URLs. Supabase Auth is not adopted because the existing authentication/session/organization architecture is complete.

## Stripe test-mode cases

Use Stripe's documented test cards and test bank accounts for success, decline, authentication, ACH processing/failure, refunds, disputes, Connect onboarding, transfers, and failed payouts. Replay the same signed event and verify `payment_processor_events` remains unique and business ledger entries are not duplicated.
