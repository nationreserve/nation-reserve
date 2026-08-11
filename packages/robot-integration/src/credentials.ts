import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
export type IntegrationEnvironment = "sandbox" | "production";
export const manufacturerScopes = [
  "manufacturer.models.read", "manufacturer.robots.register", "manufacturer.robots.read",
  "manufacturer.activation.create", "manufacturer.activation.test",
  "manufacturer.activation.complete", "manufacturer.integration.logs.read",
] as const;
export type ManufacturerScope = typeof manufacturerScopes[number];
export function issueCredential(environment: IntegrationEnvironment, pepper: string) {
  const prefix = randomBytes(6).toString("hex");
  const secret = randomBytes(32).toString("base64url");
  const marker = environment === "sandbox" ? "sbx" : "prod";
  const raw = `rwp_${marker}_${prefix}_${secret}`;
  return { raw, prefix: `rwp_${marker}_${prefix}`, secretHash: hashIntegrationSecret(raw, pepper) };
}
export function hashIntegrationSecret(raw: string, pepper: string) {
  return createHmac("sha256", pepper).update(raw).digest("hex");
}
export function parseCredential(raw: string) {
  const match = /^rwp_(sbx|prod)_([a-f0-9]{12})_([A-Za-z0-9_-]{43})$/.exec(raw);
  if (!match) throw new Error("MANUFACTURER_CREDENTIAL_INVALID");
  return { environment: match[1] === "sbx" ? "sandbox" : "production" as IntegrationEnvironment,
    prefix: `rwp_${match[1]}_${match[2]}` };
}
export function constantTimeHashEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

