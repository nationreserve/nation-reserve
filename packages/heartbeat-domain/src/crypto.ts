import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes,
  timingSafeEqual, verify } from "node:crypto";
import type { HeartbeatMessage } from "./schemas.js";

const signedKeys = ["schemaVersion", "messageId", "robotId", "sentAt", "sequenceNumber",
  "nonce", "manufacturerState", "assignmentId", "firmwareVersion", "apiVersion",
  "networkStatus"] as const;

export function canonicalHeartbeat(message: HeartbeatMessage): string {
  const normalized: Record<string, unknown> = {};
  for (const key of signedKeys)
    normalized[key] = key === "sentAt" ? message.sentAt.toISOString() : message[key];
  return JSON.stringify(normalized);
}
export const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
export const hmacSignature = (canonical: string, secret: string) =>
  createHmac("sha256", secret).update(canonical, "utf8").digest("base64url");
export function verifyHmac(canonical: string, secret: string, supplied: string) {
  const expected = Buffer.from(hmacSignature(canonical, secret));
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function verifyEd25519(canonical: string, publicKey: string, signature: string) {
  return verify(null, Buffer.from(canonical), publicKey, Buffer.from(signature, "base64url"));
}
export function generateSharedSecret() { return randomBytes(32).toString("base64url"); }
export function encryptSecret(secret: string, keyMaterial: string) {
  const key = createHash("sha256").update(keyMaterial).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}
export function decryptSecret(value: string, keyMaterial: string) {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm",
    createHash("sha256").update(keyMaterial).digest(), iv!);
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(encrypted!), decipher.final()]).toString("utf8");
}
