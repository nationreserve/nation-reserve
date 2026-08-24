# Stripe webhook destinations

RoboWorkPool uses platform PaymentIntents followed by separate Transfers to Express connected accounts. It does not use destination charges. Connect onboarding remains Stripe-hosted `account_onboarding` through Account Links.

Both Stripe event destinations use the same application route:

`POST /api/v1/payment-webhooks/stripe`

Create two Stripe event destinations because platform-account and connected-account destinations have independent signing secrets. RoboWorkPool validates every request against the two configured endpoint secrets and records which authorized destination authenticated it. An invalid signature is rejected.

## Platform-account destination

Configure events from the RoboWorkPool platform account:

- `payment_intent.succeeded`
- `payment_intent.processing`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.succeeded`
- `charge.failed`
- `charge.refunded`
- `charge.refund.updated`
- `charge.dispute.created`
- `charge.dispute.updated`
- `charge.dispute.closed`
- `refund.created`
- `refund.updated`
- `refund.failed`
- `transfer.created`
- `transfer.updated`
- `transfer.reversed`

Store this destination's `whsec_...` value in `PAYMENT_PROVIDER_WEBHOOK_SECRET`.

## Connected-account destination

Configure events from connected accounts:

- `account.updated`
- `account.external_account.created`
- `account.external_account.updated`
- `account.external_account.deleted`
- `payout.created`
- `payout.updated`
- `payout.paid`
- `payout.failed`

Store this destination's `whsec_...` value in `PAYMENT_PROVIDER_CONNECT_WEBHOOK_SECRET`.

For ACH and other asynchronous incoming methods, `payment_intent.processing` remains non-settled and `payment_intent.payment_failed` remains failed. Ledger settlement occurs only after `payment_intent.succeeded` or `charge.succeeded`. Transfers remain separately idempotent and are never automatically treated as reversible with the source payment.
