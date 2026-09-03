import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CONNECT_STRIPE_EVENTS,
  PLATFORM_STRIPE_EVENTS,
  verifyStripeWebhook,
} from "./stripe-webhook-verifier.js";
const platform = "whsec_platform_runtime_neutral",
  connect = "whsec_connect_runtime_neutral";
const body = (type: string, account?: string) =>
  new TextEncoder().encode(
    JSON.stringify({
      id: `evt_${type}`,
      type,
      created: 1700000000,
      livemode: false,
      ...(account ? { account } : {}),
      data: {
        object: {
          id: type.startsWith("account.") ? (account ?? "acct_1") : "obj_1",
          status: type,
          metadata: {},
        },
      },
    }),
  );
const header = (raw: Uint8Array, secret: string) => {
  const t = "1700000000",
    v = createHmac("sha256", secret)
      .update(`${t}.${new TextDecoder().decode(raw)}`)
      .digest("hex");
  return `t=${t},v1=${v}`;
};
const verify = (raw: Uint8Array, secret: string) =>
  verifyStripeWebhook({
    rawBody: raw,
    signature: header(raw, secret),
    platformSecret: platform,
    connectSecret: connect,
    expectedEnvironment: "test",
    now: 1700000000000,
  });
describe("runtime-neutral Stripe webhook verifier", () => {
  it("authenticates platform signatures", async () =>
    expect(await verify(body("payment_intent.succeeded"), platform)).toMatchObject({
      webhookSource: "platform",
    }));
  it("rejects invalid platform signatures", async () =>
    expect(
      verify(body("payment_intent.succeeded"), "whsec_wrong_platform_value"),
    ).rejects.toThrow("PAYMENT_WEBHOOK_SIGNATURE_INVALID"));
  it("authenticates Connect signatures", async () =>
    expect(await verify(body("account.updated", "acct_1"), connect)).toMatchObject({
      webhookSource: "connect",
    }));
  it("rejects invalid Connect signatures", async () =>
    expect(
      verify(body("account.updated", "acct_1"), "whsec_wrong_connect_value"),
    ).rejects.toThrow("PAYMENT_WEBHOOK_SIGNATURE_INVALID"));
  it("rejects a Connect event signed by the platform destination", async () =>
    expect(verify(body("account.updated", "acct_1"), platform)).rejects.toThrow(
      "PAYMENT_WEBHOOK_EVENT_SOURCE_NOT_ALLOWED",
    ));
  it("rejects a platform event signed by the Connect destination", async () =>
    expect(verify(body("transfer.created"), connect)).rejects.toThrow(
      "PAYMENT_WEBHOOK_EVENT_SOURCE_NOT_ALLOWED",
    ));
  it("rejects signed JSON that is not an event object", async () => {
    const raw = new TextEncoder().encode("[]");
    await expect(verify(raw, platform)).rejects.toThrow("PAYMENT_WEBHOOK_JSON_INVALID");
  });
  it.each([
    "identity.verification_session.created",
    "identity.verification_session.processing",
    "identity.verification_session.verified",
    "identity.verification_session.requires_input",
    "identity.verification_session.canceled",
  ])("authenticates Identity platform event %s", async (event) =>
    expect(await verify(body(event), platform)).toMatchObject({
      type: event,
      webhookSource: "platform",
    }),
  );
  it("contains every required transfer and payout transition", () => {
    for (const event of ["transfer.created", "transfer.updated", "transfer.reversed"])
      expect(PLATFORM_STRIPE_EVENTS.has(event)).toBe(true);
    for (const event of [
      "payout.created",
      "payout.updated",
      "payout.paid",
      "payout.failed",
      "account.updated",
      "account.external_account.created",
      "account.external_account.updated",
      "account.external_account.deleted",
    ])
      expect(CONNECT_STRIPE_EVENTS.has(event)).toBe(true);
  });
});
