/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { randomUUID } from "node:crypto";
import type { AuthenticationStore, AuthenticationTransaction, AuthSession } from "@nation-reserve/auth";
import type { Pool, PoolClient } from "pg";

export class PostgresAuthenticationStore implements AuthenticationStore {
  constructor(private readonly pool: Pool) {}
  async transaction<T>(work: (tx: AuthenticationTransaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(new PostgresAuthenticationTransaction(client));
      await client.query("COMMIT"); return result;
    } catch (error) {
      await client.query("ROLLBACK"); throw error;
    } finally { client.release(); }
  }
  async findLoginByEmail(emailNormalized: string) {
    const result = await this.pool.query(`
      SELECT u.id, u.email, u.email_normalized, u.display_name, u.status,
             u.email_verified_at, c.password_hash, c.failed_login_count, c.locked_until
      FROM users u JOIN user_credentials c ON c.user_id = u.id
      WHERE u.email_normalized = $1
    `, [emailNormalized]);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      user: { id: String(row.id), email: String(row.email),
        emailNormalized: String(row.email_normalized), displayName: String(row.display_name),
        status: String(row.status), emailVerifiedAt: row.email_verified_at as Date | null },
      credential: { passwordHash: String(row.password_hash),
        failedLoginCount: Number(row.failed_login_count), lockedUntil: row.locked_until as Date | null },
    };
  }
  async recordFailedLogin(userId: string, lockUntil: Date | null) {
    await this.pool.query(`UPDATE user_credentials SET failed_login_count=failed_login_count+1,
      last_failed_login_at=now(), locked_until=COALESCE($2,locked_until) WHERE user_id=$1`,
    [userId, lockUntil]);
  }
  async createSession(input: { userId: string; familyId: string; refreshTokenHash: string;
    expiresAt: Date; ip?: string; userAgent?: string }): Promise<AuthSession> {
    const result = await this.pool.query(`INSERT INTO auth_sessions
      (user_id,session_family_id,refresh_token_hash,expires_at,created_ip,last_seen_ip,user_agent)
      VALUES($1,$2,$3,$4,$5,$5,$6)
      RETURNING id,user_id,session_family_id,refresh_token_version,status,expires_at`,
    [input.userId, input.familyId, input.refreshTokenHash, input.expiresAt, input.ip, input.userAgent]);
    return mapSession(result.rows[0]);
  }
  async completeLogin(userId: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN" );
      await client.query("UPDATE user_credentials SET failed_login_count=0,last_failed_login_at=NULL,locked_until=NULL WHERE user_id=$1", [userId]);
      await client.query("UPDATE users SET last_login_at=now() WHERE id=$1", [userId]);
      await client.query("COMMIT" );
    } catch (error) { await client.query("ROLLBACK" ); throw error; } finally { client.release(); }
  }
  async rotateSession(input: { sessionId: string; presentedHash: string; replacementHash: string;
    lastSeenIp?: string }): Promise<AuthSession | "reuse" | "expired" | "revoked"> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query("SELECT * FROM auth_sessions WHERE id=$1 FOR UPDATE", [input.sessionId]);
      const row = found.rows[0] as Record<string, unknown> | undefined;
      if (!row || row.status !== "active") { await client.query("ROLLBACK"); return "revoked"; }
      if ((row.expires_at as Date) <= new Date()) {
        await client.query("UPDATE auth_sessions SET status='expired' WHERE id=$1", [input.sessionId]);
        await client.query("COMMIT"); return "expired";
      }
      if (row.refresh_token_hash !== input.presentedHash) {
        const reused = row.previous_refresh_token_hash === input.presentedHash;
        await client.query("ROLLBACK"); return reused ? "reuse" : "revoked";
      }
      const updated = await client.query(`UPDATE auth_sessions SET
        previous_refresh_token_hash=refresh_token_hash,refresh_token_hash=$2,
        refresh_token_version=refresh_token_version+1,last_seen_at=now(),last_seen_ip=COALESCE($3,last_seen_ip)
        WHERE id=$1 RETURNING id,user_id,session_family_id,refresh_token_version,status,expires_at`,
      [input.sessionId, input.replacementHash, input.lastSeenIp]);
      await client.query("COMMIT"); return mapSession(updated.rows[0]);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async revokeFamily(sessionId: string, reason: string) {
    await this.pool.query(`UPDATE auth_sessions SET status='compromised',revoked_at=now(),
      revocation_reason=$2 WHERE session_family_id=(SELECT session_family_id FROM auth_sessions WHERE id=$1)
      AND status='active'`, [sessionId, reason]);
  }
}
class PostgresAuthenticationTransaction implements AuthenticationTransaction {
  constructor(private readonly client: PoolClient) {}
  async createRegistration(input: Parameters<AuthenticationTransaction["createRegistration"]>[0]) {
    const user = await this.client.query<{ id: string }>(`INSERT INTO users
      (email,email_normalized,display_name,status) VALUES($1,$2,$3,$4) RETURNING id`,
    [input.user.email, input.user.emailNormalized, input.user.displayName, input.user.status]);
    const userId = user.rows[0]!.id;
    const org = await this.client.query<{ id: string }>(`INSERT INTO organizations
      (legal_name,display_name,organization_type,status) VALUES($1,$2,$3,'pending') RETURNING id`,
    [input.organizationLegalName, input.organizationDisplayName, input.type]);
    const organizationId = org.rows[0]!.id;
    await this.client.query(`INSERT INTO organization_memberships
      (organization_id,user_id,role,status) VALUES($1,$2,$3,'active')`,
    [organizationId, userId, input.foundingRole]);
    if (input.type === "hiring_company") await this.client.query(`INSERT INTO hiring_companies
      (organization_id,verification_status,billing_status) VALUES($1,'pending','not_configured')`, [organizationId]);
    if (input.type === "manufacturer") await this.client.query(`INSERT INTO manufacturers
      (organization_id,approval_status,production_access_status) VALUES($1,'draft','disabled')`, [organizationId]);
    await this.client.query(`INSERT INTO user_credentials(user_id,password_hash,password_algorithm)
      VALUES($1,$2,'argon2id')`, [userId, input.passwordHash]);
    await this.client.query(`INSERT INTO email_verification_tokens
      (user_id,token_hash,email_normalized,expires_at) VALUES($1,$2,$3,$4)`,
    [userId, input.verificationTokenHash, input.user.emailNormalized, input.verificationExpiresAt]);
    return { userId, organizationId };
  }
  async audit(action: string, entityType: string, entityId: string, metadata: object = {}) {
    await this.client.query(`INSERT INTO audit_logs(actor_type,action,entity_type,entity_id,metadata)
      VALUES('user',$1,$2,$3,$4)`, [action, entityType, entityId, metadata]);
  }
  async outbox(type: string, aggregateType: string, aggregateId: string, payload: object) {
    await this.client.query(`INSERT INTO outbox_events
      (id,event_type,aggregate_type,aggregate_id,occurred_at,payload,metadata)
      VALUES($1,$2,$3,$4,now(),$5,'{"schemaVersion":1}')`,
    [randomUUID(), type, aggregateType, aggregateId, payload]);
  }
}
function mapSession(row: Record<string, unknown>): AuthSession {
  return { id: String(row.id), userId: String(row.user_id), familyId: String(row.session_family_id),
    tokenVersion: Number(row.refresh_token_version), status: String(row.status),
    expiresAt: row.expires_at as Date };
}



