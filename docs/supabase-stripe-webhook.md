# Supabase Stripe webhook ingress

The intended production Stripe ingress is the `stripe-webhook` Supabase Edge Function. Both the platform-account and connected-account Stripe event destinations use `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`; they retain separate endpoint signing secrets. The function has Supabase JWT verification disabled because Stripe cannot supply a Supabase JWT, but every request remains deny-by-default until the untouched request bytes authenticate against one of the two Stripe secrets.

The function reads the body once, verifies before JSON parsing, enforces the destination-specific allowlist, and delegates durable processing to the same canonical `PostgresPaymentService.processWebhook` used by the API. It does not contain financial transition SQL. The processor retains event-ID deduplication, row locks, explicit transactions, rollback, journals, immutable ledger writes, notifications, outbox events, ACH safeguards, reversals, payouts, and account readiness changes.

Configure `DATABASE_URL` with the Supavisor transaction-mode PostgreSQL connection (port 6543). The function uses a single `pg` connection per worker so `BEGIN`, `SELECT ... FOR UPDATE`, `COMMIT`, and `ROLLBACK` stay on one database session. Do not use an anonymous browser key for financial writes. Prefer a dedicated database role restricted to the tables and functions used by webhook processing.

Required secrets are `PAYMENT_PROVIDER=stripe`, `PAYMENT_PROVIDER_ENVIRONMENT=live`, `PAYMENT_PROVIDER_WEBHOOK_SECRET`, `PAYMENT_PROVIDER_CONNECT_WEBHOOK_SECRET`, and `DATABASE_URL`. No Stripe API secret is required or used by this ingress.

Deploy after linking the correct project with `supabase functions deploy stripe-webhook --project-ref <project-ref>`. Do not register the Fastify route as a second production Stripe destination. It remains available as an internal compatibility ingress using the same canonical processor.
