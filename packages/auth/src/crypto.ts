import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import type { AuthConfig } from "./config.js";

const weakPasswords = new Set(["password1234", "123456789012", "qwertyuiop12"]);
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
export function assertPasswordPolicy(password: string): void {
  if (password.length < 12 || password.length > 256 || weakPasswords.has(password.toLowerCase())) {
    throw new Error("PASSWORD_POLICY_VIOLATION");
  }
}
export async function hashPassword(password: string, config: AuthConfig): Promise<string> {
  assertPasswordPolicy(password);
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: config.argon2MemoryCost,
    timeCost: config.argon2TimeCost,
    parallelism: config.argon2Parallelism,
  });
}
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try { return await argon2.verify(hash, password); } catch { return false; }
}
export function passwordNeedsRehash(hash: string, config: AuthConfig): boolean {
  return argon2.needsRehash(hash, {
    memoryCost: config.argon2MemoryCost,
    timeCost: config.argon2TimeCost,
    parallelism: config.argon2Parallelism,
  });
}
export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}
export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
export interface AccessTokenClaims {
  sub: string; sessionId: string; tokenVersion: number; issuedAt: number; expiresAt: number;
}
export async function signAccessToken(
  claims: Omit<AccessTokenClaims, "issuedAt" | "expiresAt">,
  config: AuthConfig,
): Promise<string> {
  return new SignJWT({ sessionId: claims.sessionId, tokenVersion: claims.tokenVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setSubject(claims.sub)
    .setIssuer(config.jwtIssuer).setAudience(config.jwtAudience).setIssuedAt()
    .setExpirationTime(`${config.accessTokenTtlSeconds}s`)
    .sign(new TextEncoder().encode(config.signingKey));
}
export async function verifyAccessToken(token: string, config: AuthConfig): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(config.signingKey), {
    issuer: config.jwtIssuer, audience: config.jwtAudience,
  });
  if (!payload.sub || typeof payload.sessionId !== "string" ||
      typeof payload.tokenVersion !== "number" || !payload.iat || !payload.exp) {
    throw new Error("INVALID_ACCESS_TOKEN");
  }
  return { sub: payload.sub, sessionId: payload.sessionId,
    tokenVersion: payload.tokenVersion, issuedAt: payload.iat, expiresAt: payload.exp };
}

