export type RuntimeNeutralVerifiedWebhookEvent = {
  id: string;
  type: string;
  createdAt: Date;
  environment: "test" | "live";
  webhookSource: "platform" | "connect";
  objectId: string;
  status: string;
  amountMinorUnits?: number;
  currency?: string;
  feeMinorUnits?: number;
  metadata: Record<string, string>;
};
export const PLATFORM_STRIPE_EVENTS = new Set([
  "payment_intent.succeeded",
  "payment_intent.processing",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "charge.succeeded",
  "charge.failed",
  "charge.refunded",
  "charge.refund.updated",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
  "refund.created",
  "refund.updated",
  "refund.failed",
  "transfer.created",
  "transfer.updated",
  "transfer.reversed",
  "identity.verification_session.created",
  "identity.verification_session.processing",
  "identity.verification_session.verified",
  "identity.verification_session.requires_input",
  "identity.verification_session.canceled",
]);
export const CONNECT_STRIPE_EVENTS = new Set([
  "account.updated",
  "account.external_account.created",
  "account.external_account.updated",
  "account.external_account.deleted",
  "payout.created",
  "payout.updated",
  "payout.paid",
  "payout.failed",
]);
export class StripeWebhookVerificationError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode = 400,
  ) {
    super(code);
  }
}
type UnknownRecord = Record<string, unknown>;
const enc = new TextEncoder(),
  dec = new TextDecoder();
const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const recordOrEmpty = (value: unknown): UnknownRecord => (isRecord(value) ? value : {});
const scalarString = (value: unknown, fallback = ""): string =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : fallback;
const digest = async (secret: string, value: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value))),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
};
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};
const parseVerifiedEvent = (text: string): UnknownRecord => {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new StripeWebhookVerificationError("PAYMENT_WEBHOOK_JSON_INVALID");
  }
  if (!isRecord(value))
    throw new StripeWebhookVerificationError("PAYMENT_WEBHOOK_JSON_INVALID");
  return value;
};
const stringMetadata = (value: unknown): Record<string, string> =>
  Object.fromEntries(
    Object.entries(recordOrEmpty(value)).map(([key, item]) => [key, String(item)]),
  );
export async function verifyStripeWebhook(input: {
  rawBody: Uint8Array;
  signature: string;
  platformSecret: string;
  connectSecret: string;
  expectedEnvironment: "test" | "live";
  now?: number;
}): Promise<RuntimeNeutralVerifiedWebhookEvent> {
  const parts = input.signature.split(",").map((v) => v.split("=") as [string, string]),
    timestamp = parts.find(([k]) => k === "t")?.[1],
    signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!timestamp || !/^\d+$/.test(timestamp) || !signatures.length)
    throw new StripeWebhookVerificationError("PAYMENT_WEBHOOK_SIGNATURE_INVALID");
  if (Math.abs((input.now ?? Date.now()) / 1000 - Number(timestamp)) > 300)
    throw new StripeWebhookVerificationError("PAYMENT_WEBHOOK_TIMESTAMP_INVALID");
  const text = dec.decode(input.rawBody),
    signed = `${timestamp}.${text}`,
    matches = async (secret: string) => {
      const expected = await digest(secret, signed);
      return signatures.some((actual) => safeEqual(expected, actual));
    };
  const webhookSource = (await matches(input.platformSecret))
    ? "platform"
    : (await matches(input.connectSecret))
      ? "connect"
      : undefined;
  if (!webhookSource)
    throw new StripeWebhookVerificationError("PAYMENT_WEBHOOK_SIGNATURE_INVALID");
  const event = parseVerifiedEvent(text),
    type = scalarString(event.type),
    allowed =
      webhookSource === "platform" ? PLATFORM_STRIPE_EVENTS : CONNECT_STRIPE_EVENTS;
  if (!allowed.has(type))
    throw new StripeWebhookVerificationError(
      "PAYMENT_WEBHOOK_EVENT_SOURCE_NOT_ALLOWED",
    );
  const environment: "test" | "live" = event.livemode ? "live" : "test";
  if (environment !== input.expectedEnvironment)
    throw new StripeWebhookVerificationError("PAYMENT_WEBHOOK_ENVIRONMENT_MISMATCH");
  const data = recordOrEmpty(event.data),
    o = recordOrEmpty(data.object),
    capabilities = recordOrEmpty(o.capabilities),
    requirements = recordOrEmpty(o.requirements);
  return {
    id: String(event.id),
    type,
    createdAt: new Date(Number(event.created) * 1000),
    environment,
    webhookSource,
    objectId: String(o.id),
    status: scalarString(o.status, type),
    amountMinorUnits: Number(o.amount ?? 0),
    currency: scalarString(o.currency, "usd").toUpperCase(),
    ...(o.fee ? { feeMinorUnits: Number(o.fee) } : {}),
    metadata: {
      ...stringMetadata(o.metadata),
      paymentIntentId: scalarString(o.payment_intent),
      chargeId: scalarString(o.charge),
      detailsSubmitted: String(Boolean(o.details_submitted)),
      transfersEnabled: String(capabilities.transfers === "active"),
      payoutsEnabled: String(Boolean(o.payouts_enabled)),
      requirements: JSON.stringify(
        Array.isArray(requirements.currently_due) ? requirements.currently_due : [],
      ),
      connectedAccountId: scalarString(event.account),
    },
  };
}
