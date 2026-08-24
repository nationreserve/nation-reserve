import{describe,expect,it}from"vitest";import{CONNECT_STRIPE_EVENTS,PLATFORM_STRIPE_EVENTS,isProcessedWebhookDuplicate,isSettledIncomingStripeEvent}from"./postgres-payment-service.js";
describe("Stripe event destination policy",()=>{
 it.each(["transfer.created","transfer.updated","transfer.reversed"])("handles real platform Transfer event %s",event=>expect(PLATFORM_STRIPE_EVENTS.has(event)).toBe(true));
 it.each(["transfer.paid","transfer.failed"])("does not invent Transfer event %s",event=>expect(PLATFORM_STRIPE_EVENTS.has(event)).toBe(false));
 it.each(["payout.created","payout.updated","payout.paid","payout.failed","account.updated"])("routes connected-account event %s",event=>expect(CONNECT_STRIPE_EVENTS.has(event)).toBe(true));
 it("keeps processing and failure out of transfer eligibility",()=>{expect(PLATFORM_STRIPE_EVENTS.has("payment_intent.processing")).toBe(true);expect(PLATFORM_STRIPE_EVENTS.has("payment_intent.payment_failed")).toBe(true);expect(PLATFORM_STRIPE_EVENTS.has("payment_intent.succeeded")).toBe(true);expect(isSettledIncomingStripeEvent("payment_intent.processing")).toBe(false);expect(isSettledIncomingStripeEvent("payment_intent.payment_failed")).toBe(false);expect(isSettledIncomingStripeEvent("payment_intent.succeeded")).toBe(true)});
  it("recognizes idempotently completed webhook deliveries",()=>{expect(isProcessedWebhookDuplicate("processed")).toBe(true);expect(isProcessedWebhookDuplicate("ignored")).toBe(true);expect(isProcessedWebhookDuplicate("failed")).toBe(false)});
});
