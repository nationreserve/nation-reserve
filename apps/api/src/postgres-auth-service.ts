/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import {
  AuthenticationService,
  type AuthConfig,
  type AuthEmailAdapter,
  hashOpaqueToken,
  hashPassword,
  normalizeEmail,
  RegistrationService,
  verifyAccessToken,
  verifyPassword,
  createOpaqueToken,
  type PublicOrganizationType,
  type RegistrationInput,
} from "@nation-reserve/auth";
import { assertRoleCompatible } from "@nation-reserve/domain";
import { PostgresAuthenticationStore } from "@nation-reserve/database";
import type { Pool, PoolClient } from "pg";
import type { AuthRouteService } from "./auth-routes.js";

export class PostgresAuthRouteService implements AuthRouteService {
  readonly #store: PostgresAuthenticationStore;
  readonly #registration: RegistrationService;
  readonly #authentication: AuthenticationService;
  constructor(
    private readonly pool: Pool,
    private readonly config: AuthConfig,
    private readonly email: AuthEmailAdapter,
    exposeDevelopmentTokens = false,
  ) {
    this.#store = new PostgresAuthenticationStore(pool);
    this.#registration = new RegistrationService(
      this.#store,
      email,
      config,
      exposeDevelopmentTokens,
    );
    this.#authentication = new AuthenticationService(this.#store, config);
  }
  async registerAccount(input: {
    email: string;
    displayName: string;
    password: string;
  }) {
    const emailNormalized = normalizeEmail(input.email);
    const passwordHash = await hashPassword(input.password, this.config);
    const userId = await tx(this.pool, async (client) => {
      const created = await client
        .query(
          `INSERT INTO users(email,email_normalized,display_name,status) VALUES($1,$2,$3,'pending') RETURNING id`,
          [input.email.trim(), emailNormalized, input.displayName.trim()],
        )
        .catch((error) => {
          if ((error as { code?: string }).code === "23505")
            throw failure("ACCOUNT_ALREADY_EXISTS", 409);
          throw error;
        });
      const id = String(created.rows[0].id);
      await client.query(
        `INSERT INTO user_credentials(user_id,password_hash,password_algorithm) VALUES($1,$2,'argon2id')`,
        [id, passwordHash],
      );
      await client.query(
        `INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id,new_state,source) VALUES($1,'user.registration.completed','user',$1,$2,'public_api')`,
        [id, JSON.stringify({ accountOnly: true })],
      );
      await outbox(client, "user.registration.completed", "user", id, {
        accountOnly: true,
        emailNormalized,
      });
      return id;
    });
    await this.requestVerification(undefined, userId);
    return { userId };
  }
  register(type: PublicOrganizationType, input: RegistrationInput) {
    return this.#registration.register(type, input);
  }
  login(input: { email: string; password: string; ip?: string; userAgent?: string }) {
    return this.#authentication.login(input);
  }
  refresh(sessionId: string, token: string, ip?: string) {
    return this.#authentication.refresh(sessionId, token, ip);
  }
  async authenticate(token: string) {
    let claims;
    try {
      claims = await verifyAccessToken(token, this.config);
    } catch {
      throw failure("AUTHENTICATION_REQUIRED", 401);
    }
    const result = await this.pool.query(
      `SELECT s.status,s.expires_at,s.refresh_token_version,
      u.status AS user_status,u.email_verified_at FROM auth_sessions s JOIN users u ON u.id=s.user_id
      WHERE s.id=$1 AND s.user_id=$2`,
      [claims.sessionId, claims.sub],
    );
    const row = result.rows[0];
    if (
      !row ||
      row.status !== "active" ||
      row.expires_at <= new Date() ||
      row.refresh_token_version !== claims.tokenVersion
    )
      throw failure("SESSION_REVOKED", 401);
    if (row.user_status === "suspended" || row.user_status === "closed")
      throw failure("ACCOUNT_SUSPENDED", 403);
    return {
      userId: claims.sub,
      sessionId: claims.sessionId,
      emailVerified: Boolean(row.email_verified_at),
    };
  }
  async requestVerification(email?: string, userId?: string) {
    const normalized = email ? normalizeEmail(email) : undefined;
    const found = await this.pool.query(
      `SELECT id,email_normalized,email_verified_at FROM users
      WHERE ($1::text IS NOT NULL AND email_normalized=$1) OR ($2::uuid IS NOT NULL AND id=$2) LIMIT 1`,
      [normalized, userId],
    );
    const user = found.rows[0];
    if (!user || user.email_verified_at) return;
    const token = createOpaqueToken();
    const expiresAt = plus(this.config.emailVerificationTtlSeconds);
    await tx(this.pool, async (client) => {
      await client.query(
        `UPDATE email_verification_tokens SET revoked_at=now()
        WHERE user_id=$1 AND used_at IS NULL AND revoked_at IS NULL`,
        [user.id],
      );
      await client.query(
        `INSERT INTO email_verification_tokens(user_id,token_hash,email_normalized,expires_at)
        VALUES($1,$2,$3,$4)`,
        [user.id, hashOpaqueToken(token), user.email_normalized, expiresAt],
      );
      await outbox(client, "user.email.verification.requested", "user", user.id, {
        emailNormalized: user.email_normalized,
      });
    });
    await this.email.sendEmailVerification({
      to: user.email_normalized,
      token,
      expiresAt,
    });
  }
  async confirmVerification(token: string) {
    await tx(this.pool, async (client) => {
      const found = await client.query(
        `SELECT t.*,u.email_normalized AS current_email_normalized FROM email_verification_tokens t
        JOIN users u ON u.id=t.user_id WHERE t.token_hash=$1 FOR UPDATE`,
        [hashOpaqueToken(token)],
      );
      const row = found.rows[0];
      if (!row || row.used_at || row.revoked_at)
        throw failure("INVALID_VERIFICATION_TOKEN", 400);
      if (row.expires_at <= new Date())
        throw failure("EXPIRED_VERIFICATION_TOKEN", 400);
      if (row.email_normalized !== row.current_email_normalized)
        throw failure("INVALID_VERIFICATION_TOKEN", 400);
      const consumed = await client.query(
        `UPDATE email_verification_tokens SET used_at=now()
        WHERE id=$1 AND used_at IS NULL RETURNING user_id`,
        [row.id],
      );
      if (!consumed.rowCount) throw failure("INVALID_VERIFICATION_TOKEN", 400);
      await client.query(
        `UPDATE users SET email_verified_at=now(),status=CASE WHEN status='pending'
        THEN 'active' ELSE status END WHERE id=$1`,
        [row.user_id],
      );
      await client.query(
        `UPDATE email_verification_tokens SET revoked_at=now()
        WHERE user_id=$1 AND id<>$2 AND used_at IS NULL AND revoked_at IS NULL`,
        [row.user_id, row.id],
      );
      await audit(client, row.user_id, "user.email.verified", "user", row.user_id);
      await outbox(client, "user.email.verified", "user", row.user_id, {});
    });
  }
  async requestPasswordReset(email: string, ip?: string) {
    const found = await this.pool.query(
      "SELECT id,email_normalized FROM users WHERE email_normalized=$1",
      [normalizeEmail(email)],
    );
    const user = found.rows[0];
    if (!user) return;
    const token = createOpaqueToken();
    const expiresAt = plus(this.config.passwordResetTtlSeconds);
    await tx(this.pool, async (client) => {
      await client.query(
        `UPDATE password_reset_tokens SET revoked_at=now()
        WHERE user_id=$1 AND used_at IS NULL AND revoked_at IS NULL`,
        [user.id],
      );
      await client.query(
        `INSERT INTO password_reset_tokens(user_id,token_hash,expires_at,requested_ip)
        VALUES($1,$2,$3,$4)`,
        [user.id, hashOpaqueToken(token), expiresAt, ip],
      );
      await outbox(client, "user.password.reset.requested", "user", user.id, {});
    });
    await this.email.sendPasswordReset({ to: user.email_normalized, token, expiresAt });
  }
  async confirmPasswordReset(token: string, password: string) {
    const passwordHash = await hashPassword(password, this.config);
    await tx(this.pool, async (client) => {
      const found = await client.query(
        `SELECT * FROM password_reset_tokens WHERE token_hash=$1 FOR UPDATE`,
        [hashOpaqueToken(token)],
      );
      const row = found.rows[0];
      if (!row || row.used_at || row.revoked_at)
        throw failure("INVALID_PASSWORD_RESET_TOKEN", 400);
      if (row.expires_at <= new Date())
        throw failure("EXPIRED_PASSWORD_RESET_TOKEN", 400);
      const consumed = await client.query(
        `UPDATE password_reset_tokens SET used_at=now()
        WHERE id=$1 AND used_at IS NULL RETURNING user_id`,
        [row.id],
      );
      if (!consumed.rowCount) throw failure("INVALID_PASSWORD_RESET_TOKEN", 400);
      await client.query(
        `UPDATE user_credentials SET password_hash=$2,password_changed_at=now(),
        failed_login_count=0,locked_until=NULL WHERE user_id=$1`,
        [row.user_id, passwordHash],
      );
      await client.query(
        `UPDATE auth_sessions SET status='revoked',revoked_at=now(),
        revocation_reason='password_reset' WHERE user_id=$1 AND status='active'`,
        [row.user_id],
      );
      await client.query(
        `UPDATE password_reset_tokens SET revoked_at=now()
        WHERE user_id=$1 AND id<>$2 AND used_at IS NULL`,
        [row.user_id, row.id],
      );
      await audit(
        client,
        row.user_id,
        "user.password.reset.completed",
        "user",
        row.user_id,
      );
      await outbox(client, "user.password.reset.completed", "user", row.user_id, {});
    });
  }
  async logout(userId: string, sessionId: string) {
    await this.revokeSession(userId, sessionId);
  }
  async logoutAll(userId: string) {
    await tx(this.pool, async (client) => {
      await client.query(
        `UPDATE auth_sessions SET status='revoked',revoked_at=now(),
        revocation_reason='logout_all' WHERE user_id=$1 AND status='active'`,
        [userId],
      );
      await audit(client, userId, "user.sessions.revoked_all", "user", userId);
      await outbox(client, "user.sessions.revoked_all", "user", userId, {});
    });
  }
  async account(userId: string) {
    const result = await this.pool.query(
      `SELECT id,email,display_name,status,email_verified_at
      FROM users WHERE id=$1`,
      [userId],
    );
    return result.rows[0] ?? failure("NOT_FOUND", 404);
  }
  async updateAccount(userId: string, displayName: string) {
    const result = await this.pool.query(
      `UPDATE users SET display_name=$2 WHERE id=$1
      RETURNING id,email,display_name,status,email_verified_at`,
      [userId, displayName],
    );
    return result.rows[0];
  }
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    _sessionId: string,
  ) {
    const found = await this.pool.query(
      "SELECT password_hash FROM user_credentials WHERE user_id=$1",
      [userId],
    );
    if (!(await verifyPassword(found.rows[0]?.password_hash ?? "", currentPassword)))
      throw failure("INVALID_CREDENTIALS", 401);
    const hash = await hashPassword(newPassword, this.config);
    await tx(this.pool, async (client) => {
      await client.query(
        "UPDATE user_credentials SET password_hash=$2,password_changed_at=now() WHERE user_id=$1",
        [userId, hash],
      );
      await client.query(
        `UPDATE auth_sessions SET status='revoked',revoked_at=now(),
        revocation_reason='password_changed' WHERE user_id=$1 AND status='active'`,
        [userId],
      );
      await audit(client, userId, "user.password.changed", "user", userId);
      await outbox(client, "user.password.changed", "user", userId, {});
    });
  }
  async sessions(userId: string, current: string) {
    const result = await this.pool.query(
      `SELECT id,status,created_at,last_seen_at,expires_at,user_agent,
      id=$2 AS is_current FROM auth_sessions WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId, current],
    );
    return result.rows;
  }
  async revokeSession(userId: string, sessionId: string) {
    const result = await this.pool.query(
      `UPDATE auth_sessions SET status='revoked',revoked_at=now(),
      revocation_reason='user_revoked' WHERE id=$1 AND user_id=$2 AND status='active'`,
      [sessionId, userId],
    );
    if (!result.rowCount) throw failure("NOT_FOUND", 404);
  }
  async organizations(userId: string) {
    const result = await this.pool.query(
      `SELECT o.id AS organization_id,o.legal_name,o.display_name,
      o.organization_type,o.status AS organization_status,m.role AS membership_role,m.status AS membership_status,
      p.default_organization_id=o.id AS is_default FROM organization_memberships m
      JOIN organizations o ON o.id=m.organization_id LEFT JOIN user_organization_preferences p ON p.user_id=m.user_id
      WHERE m.user_id=$1 ORDER BY o.display_name`,
      [userId],
    );
    return result.rows;
  }
  async setDefaultOrganization(userId: string, organizationId: string) {
    await this.pool.query(
      `INSERT INTO user_organization_preferences(user_id,default_organization_id)
      VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET default_organization_id=$2`,
      [userId, organizationId],
    );
  }
  async organization(userId: string, organizationId: string) {
    await this.requireAdmin(userId, organizationId, false);
    const result = await this.pool.query(
      `SELECT id,legal_name,display_name,organization_type,status
      FROM organizations WHERE id=$1`,
      [organizationId],
    );
    return result.rows[0];
  }
  async updateOrganization(userId: string, organizationId: string, input: object) {
    await this.requireAdmin(userId, organizationId, true);
    const body = input as { legalName?: string; displayName?: string };
    const result = await this.pool.query(
      `UPDATE organizations SET legal_name=COALESCE($2,legal_name),
      display_name=COALESCE($3,display_name) WHERE id=$1 RETURNING *`,
      [organizationId, body.legalName, body.displayName],
    );
    return result.rows[0];
  }
  async members(userId: string, organizationId: string) {
    await this.requireAdmin(userId, organizationId, false);
    const result = await this.pool.query(
      `SELECT m.id,m.user_id,u.email,u.display_name,m.role,m.status,
      m.joined_at,m.ended_at FROM organization_memberships m JOIN users u ON u.id=m.user_id
      WHERE m.organization_id=$1 ORDER BY u.display_name`,
      [organizationId],
    );
    return result.rows;
  }
  async updateMember(
    userId: string,
    organizationId: string,
    membershipId: string,
    input: object,
  ) {
    const org = await this.requireAdmin(userId, organizationId, true);
    const body = input as { role?: string; status?: string };
    if (body.role) assertRoleCompatible(org.organization_type, body.role);
    await tx(this.pool, async (client) => {
      if (body.status && body.status !== "active")
        await ensureFinalAdmin(
          client,
          organizationId,
          membershipId,
          org.organization_type,
        );
      await client.query(
        `UPDATE organization_memberships SET role=COALESCE($3,role),
        status=COALESCE($4,status),ended_at=CASE WHEN $4='removed' THEN now() ELSE ended_at END
        WHERE id=$1 AND organization_id=$2`,
        [membershipId, organizationId, body.role, body.status],
      );
      await audit(
        client,
        userId,
        "organization.membership.updated",
        "organization",
        organizationId,
      );
      await outbox(
        client,
        "organization.membership.updated",
        "organization",
        organizationId,
        { membershipId },
      );
    });
  }
  async removeMember(userId: string, organizationId: string, membershipId: string) {
    await this.updateMember(userId, organizationId, membershipId, {
      status: "removed",
    });
  }
  async createInvitation(
    userId: string,
    organizationId: string,
    email: string,
    role: string,
  ) {
    const org = await this.requireAdmin(userId, organizationId, true);
    assertRoleCompatible(org.organization_type, role);
    const token = createOpaqueToken();
    const expiresAt = plus(this.config.invitationTtlSeconds);
    const result = await tx(this.pool, async (client) => {
      const inserted = await client.query(
        `INSERT INTO organization_invitations
        (organization_id,email_normalized,role,invited_by_user_id,token_hash,expires_at)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
        [
          organizationId,
          normalizeEmail(email),
          role,
          userId,
          hashOpaqueToken(token),
          expiresAt,
        ],
      );
      await audit(
        client,
        userId,
        "organization.invitation.created",
        "organization",
        organizationId,
      );
      await outbox(
        client,
        "organization.invitation.created",
        "organization",
        organizationId,
        { invitationId: inserted.rows[0].id },
      );
      return inserted.rows[0];
    });
    await this.email.sendOrganizationInvitation({
      to: normalizeEmail(email),
      token,
      expiresAt,
      organizationName: org.display_name,
    });
    return result;
  }
  async invitations(userId: string, organizationId: string) {
    await this.requireAdmin(userId, organizationId, false);
    return (
      await this.pool.query(
        `SELECT id,email_normalized,role,status,expires_at,created_at
      FROM organization_invitations WHERE organization_id=$1 ORDER BY created_at DESC`,
        [organizationId],
      )
    ).rows;
  }
  async revokeInvitation(userId: string, organizationId: string, invitationId: string) {
    await this.requireAdmin(userId, organizationId, true);
    await this.pool.query(
      `UPDATE organization_invitations SET status='revoked',revoked_at=now()
      WHERE id=$1 AND organization_id=$2 AND status='pending'`,
      [invitationId, organizationId],
    );
  }
  async acceptInvitation(userId: string, token: string) {
    await tx(this.pool, async (client) => {
      const found = await client.query(
        `SELECT i.*,u.email_normalized AS user_email_normalized,u.email_verified_at FROM organization_invitations i
        CROSS JOIN users u WHERE i.token_hash=$1 AND u.id=$2 FOR UPDATE OF i`,
        [hashOpaqueToken(token), userId],
      );
      const row = found.rows[0];
      if (!row || row.status !== "pending") throw failure("INVITATION_INVALID", 400);
      if (row.expires_at <= new Date()) throw failure("INVITATION_EXPIRED", 400);
      if (!row.email_verified_at || row.email_normalized !== row.user_email_normalized)
        throw failure("INVITATION_EMAIL_MISMATCH", 403);
      await client.query(
        `INSERT INTO organization_memberships(organization_id,user_id,role,status)
        VALUES($1,$2,$3,'active') ON CONFLICT DO NOTHING`,
        [row.organization_id, userId, row.role],
      );
      const consumed = await client.query(
        `UPDATE organization_invitations SET status='accepted',
        accepted_by_user_id=$2,accepted_at=now() WHERE id=$1 AND status='pending'`,
        [row.id, userId],
      );
      if (!consumed.rowCount) throw failure("INVITATION_INVALID", 400);
      await audit(
        client,
        userId,
        "organization.invitation.accepted",
        "organization",
        row.organization_id,
      );
      await outbox(
        client,
        "organization.invitation.accepted",
        "organization",
        row.organization_id,
        { invitationId: row.id },
      );
    });
  }
  private async requireAdmin(userId: string, organizationId: string, write: boolean) {
    const result = await this.pool.query(
      `SELECT o.organization_type,o.status,o.display_name,m.role,m.status AS membership_status
      FROM organizations o JOIN organization_memberships m ON m.organization_id=o.id
      WHERE o.id=$1 AND m.user_id=$2`,
      [organizationId, userId],
    );
    const row = result.rows[0];
    if (!row || row.membership_status !== "active")
      throw failure("MEMBERSHIP_REQUIRED", 403);
    if (
      write &&
      (row.status !== "active" || !["owner", "administrator"].includes(row.role))
    ) {
      throw failure("PERMISSION_DENIED", 403);
    }
    return row;
  }
}
async function tx<T>(pool: Pool, work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
async function audit(
  client: PoolClient,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
) {
  await client.query(
    `INSERT INTO audit_logs(actor_type,actor_id,action,entity_type,entity_id,metadata)
    VALUES('user',$1,$2,$3,$4,'{}')`,
    [actorId, action, entityType, entityId],
  );
}
async function outbox(
  client: PoolClient,
  type: string,
  aggregateType: string,
  aggregateId: string,
  payload: object,
) {
  await client.query(
    `INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,occurred_at,payload,metadata)
    VALUES(gen_random_uuid(),$1,$2,$3,now(),$4,'{"schemaVersion":1}')`,
    [type, aggregateType, aggregateId, payload],
  );
}
async function ensureFinalAdmin(
  client: PoolClient,
  orgId: string,
  membershipId: string,
  type: string,
) {
  const role = type === "robot_owner" ? "owner" : "administrator";
  const result = await client.query(
    `SELECT count(*)::int AS count FROM organization_memberships
    WHERE organization_id=$1 AND role=$2 AND status='active' FOR UPDATE`,
    [orgId, role],
  );
  const target = await client.query(
    "SELECT role,status FROM organization_memberships WHERE id=$1 FOR UPDATE",
    [membershipId],
  );
  if (
    target.rows[0]?.role === role &&
    target.rows[0]?.status === "active" &&
    result.rows[0].count <= 1
  ) {
    throw failure("FINAL_ORGANIZATION_ADMIN_REQUIRED", 409);
  }
}
function plus(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}
function failure(code: string, statusCode: number) {
  return Object.assign(new Error(code), { code, statusCode });
}
