# Stripe integration

`StripePaymentProvider` contains all Stripe HTTP shapes. It uses SetupIntents for saved company cards, Express connected accounts and hosted account links for owner onboarding, PaymentIntents for collections, Transfers for owner disbursement, and Refunds for returns. Every mutation sends an idempotency key. Retrieval methods support reconciliation. Webhooks validate the raw body, Stripe HMAC signature, five-minute timestamp tolerance, and live/test environment.

Live execution requires `PAYMENT_PROVIDER=stripe`, `PAYMENT_EXECUTION_ENABLED=true`, a matching key/environment, and HTTPS return URLs. Never expose the secret key or webhook secret to the browser.