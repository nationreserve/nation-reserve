import { randomUUID } from "node:crypto";
import type { AuthConfig } from "./config.js";
import { createOpaqueToken, hashOpaqueToken, hashPassword, normalizeEmail,
  signAccessToken, verifyPassword } from "./crypto.js";
import type { AuthEmailAdapter } from "./email.js";
import type { RegistrationInput } from "./schemas.js";

export type PublicOrganizationType = "robot_owner" | "hiring_company" | "manufacturer";
export interface AuthUser {
  id: string; email: string; emailNormalized: string; displayName: string;
  status: string; emailVerifiedAt: Date | null;
}
export interface CredentialForAuthentication {
  passwordHash: string; failedLoginCount: number; lockedUntil: Date | null;
}
export interface AuthSession {
  id: string; userId: string; familyId: string; tokenVersion: number;
  status: string; expiresAt: Date;
}
export interface AuthenticationTransaction {
  createRegistration(input: {
    type: PublicOrganizationType; user: Omit<AuthUser, "id">;
    organizationLegalName: string; organizationDisplayName: string; foundingRole: string;
    passwordHash: string; verificationTokenHash: string; verificationExpiresAt: Date;
  }): Promise<{ userId: string; organizationId: string }>;
  audit(action: string, entityType: string, entityId: string, metadata?: object): Promise<void>;
  outbox(type: string, aggregateType: string, aggregateId: string, payload: object): Promise<void>;
}
export interface AuthenticationStore {
  transaction<T>(work: (tx: AuthenticationTransaction) => Promise<T>): Promise<T>;
  findLoginByEmail(emailNormalized: string): Promise<
    { user: AuthUser; credential: CredentialForAuthentication } | undefined>;
  recordFailedLogin(userId: string, lockUntil: Date | null): Promise<void>;
  createSession(input: { userId: string; familyId: string; refreshTokenHash: string;
    expiresAt: Date; ip?: string; userAgent?: string }): Promise<AuthSession>;
  completeLogin(userId: string): Promise<void>;
  rotateSession(input: { sessionId: string; presentedHash: string; replacementHash: string;
    lastSeenIp?: string }): Promise<AuthSession | "reuse" | "expired" | "revoked">;
  revokeFamily(sessionId: string, reason: string): Promise<void>;
}
export class RegistrationService {
  constructor(private readonly store: AuthenticationStore, private readonly email: AuthEmailAdapter,
    private readonly config: AuthConfig, private readonly exposeDevelopmentTokens = false) {}
  async register(type: PublicOrganizationType, input: RegistrationInput) {
    const verificationToken = createOpaqueToken();
    const passwordHash = await hashPassword(input.password, this.config);
    const emailNormalized = normalizeEmail(input.email);
    const expiresAt = new Date(Date.now() + this.config.emailVerificationTtlSeconds * 1000);
    const result = await this.store.transaction(async (tx) => {
      const created = await tx.createRegistration({
        type, user: { email: input.email, emailNormalized, displayName: input.displayName,
          status: "pending", emailVerifiedAt: null },
        organizationLegalName: input.organizationLegalName,
        organizationDisplayName: input.organizationDisplayName,
        foundingRole: type === "robot_owner" ? "owner" : "administrator", passwordHash,
        verificationTokenHash: hashOpaqueToken(verificationToken), verificationExpiresAt: expiresAt,
      });
      await tx.audit("user.registration.completed", "user", created.userId,
        { organizationId: created.organizationId, type });
      await tx.outbox("user.email.verification.requested", "user", created.userId, { emailNormalized });
      return created;
    });
    await this.email.sendEmailVerification({ to: emailNormalized, token: verificationToken, expiresAt });
    return { ...result, ...(this.exposeDevelopmentTokens ? { verificationToken } : {}) };
  }
}
export class AuthenticationService {
  constructor(private readonly store: AuthenticationStore, private readonly config: AuthConfig) {}
  async login(input: { email: string; password: string; ip?: string; userAgent?: string }) {
    const found = await this.store.findLoginByEmail(normalizeEmail(input.email));
    const valid = found ? await verifyPassword(found.credential.passwordHash, input.password) : false;
    if (!found || !valid || (found.credential.lockedUntil && found.credential.lockedUntil > new Date())) {
      if (found) {
        const lockUntil = found.credential.failedLoginCount + 1 >= this.config.failedLoginThreshold
          ? new Date(Date.now() + this.config.lockDurationSeconds * 1000) : null;
        await this.store.recordFailedLogin(found.user.id, lockUntil);
      }
      throw new Error("INVALID_CREDENTIALS");
    }
    if (found.user.status === "suspended" || found.user.status === "closed") throw new Error("ACCOUNT_SUSPENDED");
    const refreshToken = createOpaqueToken();
    const session = await this.store.createSession({
      userId: found.user.id, familyId: randomUUID(), refreshTokenHash: hashOpaqueToken(refreshToken),
      expiresAt: new Date(Date.now() + this.config.refreshTokenTtlSeconds * 1000),
      ...(input.ip ? { ip: input.ip } : {}), ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    });
    await this.store.completeLogin(found.user.id);
    return { accessToken: await signAccessToken({ sub: found.user.id, sessionId: session.id,
      tokenVersion: session.tokenVersion }, this.config), refreshToken, session,
      emailVerified: Boolean(found.user.emailVerifiedAt) };
  }
  async refresh(sessionId: string, token: string, ip?: string) {
    const replacement = createOpaqueToken();
    const result = await this.store.rotateSession({ sessionId,
      presentedHash: hashOpaqueToken(token), replacementHash: hashOpaqueToken(replacement),
      ...(ip ? { lastSeenIp: ip } : {}) });
    if (result === "reuse") {
      await this.store.revokeFamily(sessionId, "refresh_token_reuse");
      throw new Error("REFRESH_TOKEN_REUSE");
    }
    if (typeof result === "string") throw new Error(result === "expired" ? "SESSION_EXPIRED" : "SESSION_REVOKED");
    return { accessToken: await signAccessToken({ sub: result.userId, sessionId: result.id,
      tokenVersion: result.tokenVersion }, this.config), refreshToken: replacement };
  }
}

