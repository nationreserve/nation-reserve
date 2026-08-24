/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import {
  encryptSecret,
  generateSharedSecret,
  HeartbeatService,
  type HeartbeatConfig,
} from "@nation-reserve/heartbeat-domain";
import { PostgresHeartbeatUnitOfWork } from "@nation-reserve/database";
import type { Pool } from "pg";
import type { HeartbeatRouteService } from "./heartbeat-routes.js";

const denied = () =>
  Object.assign(new Error("FORBIDDEN"), { statusCode: 403, code: "FORBIDDEN" });
export class PostgresHeartbeatRouteService implements HeartbeatRouteService {
  private readonly heartbeat: HeartbeatService;
  constructor(
    private readonly pool: Pool,
    private readonly config: HeartbeatConfig,
  ) {
    this.heartbeat = new HeartbeatService(
      new PostgresHeartbeatUnitOfWork(pool),
      config,
    );
  }
  ingest(body: any, headers: any) {
    return this.heartbeat.ingest(body, headers);
  }
  async robotStatus(prefix: string) {
    const { rows } = await this.pool.query(
      `SELECT s.heartbeat_state,s.last_valid_received_at,
      s.last_mapped_operational_state,s.next_expected_at,s.offline_after_at
      FROM robot_production_credentials c JOIN robot_heartbeat_status s ON s.robot_id=c.robot_id
      WHERE c.credential_prefix=$1 AND c.status='active'`,
      [prefix],
    );
    if (!rows[0]) throw denied();
    return rows[0] as object;
  }
  private async manufacturer(userId: string, organizationId: string) {
    const { rows } = await this.pool.query(
      `SELECT m.id FROM manufacturers m JOIN organization_memberships om
      ON om.organization_id=m.organization_id AND om.user_id=$1 AND om.status='active'
      WHERE m.organization_id=$2 AND m.approval_status='production_approved' AND m.production_access_status='production'`,
      [userId, organizationId],
    );
    if (!rows[0]) throw denied();
    return String(rows[0].id);
  }
  async provisionCredential(
    userId: string,
    organizationId: string,
    robotId: string,
    input: any,
  ) {
    const manufacturerId = await this.manufacturer(userId, organizationId);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const robot = (
        await client.query(
          `SELECT r.id,h.id hardware_identity_id FROM robots r
        JOIN robot_models rm ON rm.id=r.robot_model_id AND rm.approval_status='production_approved'
        JOIN robot_hardware_identities h ON h.robot_id=r.id AND h.environment='production' AND h.status='active'
        WHERE r.id=$1 AND r.manufacturer_id=$2 AND r.registration_state='registered'
          AND r.activation_state='activated' FOR UPDATE`,
          [robotId, manufacturerId],
        )
      ).rows[0];
      if (!robot)
        throw Object.assign(new Error("ROBOT_NOT_ELIGIBLE"), { statusCode: 409 });
      const prefix = `rwp_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
      const secret =
        input.credentialType === "hmac_secret" ? generateSharedSecret() : undefined;
      const encrypted = secret
        ? encryptSecret(secret, this.config.ROBOT_HEARTBEAT_HMAC_ENCRYPTION_KEY)
        : null;
      const result = await client.query(
        `INSERT INTO robot_production_credentials(robot_id,manufacturer_id,
        hardware_identity_id,credential_type,credential_prefix,encrypted_secret,public_key,
        certificate_fingerprint,status,valid_from,created_by_user_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'active',now(),$9) RETURNING id,credential_prefix "credentialPrefix",
        credential_type "credentialType",status,valid_from "validFrom"`,
        [
          robotId,
          manufacturerId,
          robot.hardware_identity_id,
          input.credentialType,
          prefix,
          encrypted,
          input.publicKey ?? null,
          input.certificateFingerprint ?? null,
          userId,
        ],
      );
      await client.query(
        `INSERT INTO audit_logs(actor_type,actor_id,action,entity_type,entity_id,metadata,
        resource_type,resource_id,source) VALUES('user',$1,'heartbeat_credential.created','robot',$2,'{}',
        'robot',$2,'api')`,
        [userId, robotId],
      );
      await client.query("COMMIT");
      return { ...result.rows[0], secret };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async listCredentials(userId: string, organizationId: string, robotId: string) {
    const manufacturerId = await this.manufacturer(userId, organizationId);
    const { rows } = await this.pool.query(
      `SELECT id,credential_prefix "credentialPrefix",
      credential_type "credentialType",status,valid_from "validFrom",expires_at "expiresAt",
      last_used_at "lastUsedAt",rotated_at "rotatedAt",revoked_at "revokedAt"
      FROM robot_production_credentials WHERE robot_id=$1 AND manufacturer_id=$2 ORDER BY created_at DESC`,
      [robotId, manufacturerId],
    );
    return rows as object[];
  }
  async rotateCredential(
    userId: string,
    organizationId: string,
    robotId: string,
    credentialId: string,
    input: any,
  ) {
    const manufacturerId = await this.manufacturer(userId, organizationId);
    const result = await this.pool.query(
      `UPDATE robot_production_credentials SET status='rotating',
      rotated_at=now(),updated_at=now() WHERE id=$1 AND robot_id=$2 AND manufacturer_id=$3 AND status='active'`,
      [credentialId, robotId, manufacturerId],
    );
    if (!result.rowCount) throw denied();
    return this.provisionCredential(userId, organizationId, robotId, input);
  }
  async revokeCredential(
    userId: string,
    organizationId: string,
    robotId: string,
    credentialId: string,
  ) {
    const manufacturerId = await this.manufacturer(userId, organizationId);
    const result = await this.pool.query(
      `UPDATE robot_production_credentials SET status='revoked',
      revoked_at=now(),revocation_reason='manufacturer_revoked',updated_at=now()
      WHERE id=$1 AND robot_id=$2 AND manufacturer_id=$3 AND status IN ('active','rotating')`,
      [credentialId, robotId, manufacturerId],
    );
    if (!result.rowCount) throw denied();
  }
  private async member(userId: string, organizationId: string) {
    const r = await this.pool.query(
      `SELECT role FROM organization_memberships WHERE user_id=$1
      AND organization_id=$2 AND status='active'`,
      [userId, organizationId],
    );
    if (!r.rows[0]) throw denied();
  }
  async operational(
    userId: string,
    organizationId: string,
    scope: string,
    id?: string,
  ) {
    await this.member(userId, organizationId);
    if (scope.includes("time"))
      return {
        label: "Verified operating time",
        items: (
          await this.pool.query(
            `SELECT * FROM verified_operating_intervals WHERE ($1::uuid IS NULL OR assignment_id=$1)
       ORDER BY interval_start_at DESC LIMIT 100`,
            [id ?? null],
          )
        ).rows,
      };
    if (scope.includes("downtime"))
      return {
        items: (
          await this.pool.query(
            `SELECT * FROM robot_downtime_intervals WHERE ($1::uuid IS NULL OR robot_id=$1)
       ORDER BY downtime_start_at DESC LIMIT 100`,
            [id ?? null],
          )
        ).rows,
      };
    if (scope.includes("incidents"))
      return {
        items: (
          await this.pool.query(
            `SELECT id,robot_id,assignment_id,incident_type,severity,status,detected_at,summary
       FROM robot_operational_incidents WHERE ($1::uuid IS NULL OR robot_id=$1 OR assignment_id=$1)
       ORDER BY detected_at DESC LIMIT 100`,
            [id ?? null],
          )
        ).rows,
      };
    return {
      items: (
        await this.pool.query(
          `SELECT r.id,r.manufacturer_serial_number,s.*
      FROM robots r LEFT JOIN robot_heartbeat_status s ON s.robot_id=r.id
      WHERE ($1::uuid IS NULL OR r.id=$1) ORDER BY s.updated_at DESC NULLS LAST LIMIT 100`,
          [id ?? null],
        )
      ).rows,
    };
  }
  async reportInactive(
    userId: string,
    organizationId: string,
    assignmentId: string,
    input: any,
  ) {
    await this.member(userId, organizationId);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const assignment = (
        await client.query(
          `SELECT a.*,r.manufacturer_serial_number
      FROM robot_assignments a JOIN hiring_companies h ON h.id=a.hiring_company_id
      JOIN robots r ON r.id=a.robot_id WHERE a.id=$1 AND h.organization_id=$2 AND a.robot_id=$3 FOR UPDATE`,
          [assignmentId, organizationId, input.robotId],
        )
      ).rows[0];
      if (!assignment) throw denied();
      const incident = (
        await client.query(
          `INSERT INTO robot_operational_incidents(robot_id,assignment_id,
        contract_id,hiring_company_id,manufacturer_id,owner_organization_id,facility_id,department_id,
        incident_type,source,severity,status,detected_at,reported_at,reported_by_user_id,
        reported_by_organization_id,summary,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,
        'company_reported_inactive','hiring_company','medium','under_review',$9,now(),$10,$11,$12,$13)
        RETURNING id,status`,
          [
            assignment.robot_id,
            assignment.id,
            assignment.contract_id,
            assignment.hiring_company_id,
            assignment.manufacturer_id,
            assignment.robot_owner_organization_id,
            assignment.facility_id,
            assignment.department_id,
            input.observedAt,
            userId,
            organizationId,
            `Hiring Company reported robot ${assignment.manufacturer_serial_number} inactive`,
            { reason: input.reason, notes: input.notes },
          ],
        )
      ).rows[0];
      await client.query(
        `UPDATE verified_operating_intervals SET status='held',review_status='pending',
        hold_reason='company_inactivity_report',updated_at=now() WHERE assignment_id=$1
        AND status IN ('open','closed') AND finalized_at IS NULL`,
        [assignmentId],
      );
      await client.query("COMMIT");
      return {
        ...incident,
        manufacturerSerialNumber: assignment.manufacturer_serial_number,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async platform(userId: string, resource: string, id?: string) {
    const allowed = await this.pool.query(
      `SELECT 1 FROM platform_role_assignments WHERE user_id=$1
      AND status='active'`,
      [userId],
    );
    if (!allowed.rows[0]) throw denied();
    const table = resource.startsWith("operating-intervals")
      ? "verified_operating_intervals"
      : resource === "downtime"
        ? "robot_downtime_intervals"
        : resource === "fraud-signals"
          ? "heartbeat_fraud_signals"
          : resource.startsWith("operational-incidents")
            ? "robot_operational_incidents"
            : "robot_heartbeat_messages";
    const { rows } = await this.pool.query(
      `SELECT * FROM ${table} WHERE ($1::uuid IS NULL OR id=$1)
      ORDER BY created_at DESC LIMIT 200`,
      [id ?? null],
    );
    return { items: rows };
  }
  async incidentAction(userId: string, incidentId: string, action: string, input: any) {
    await this.platform(userId, "operational-incidents", incidentId);
    const status =
      action === "acknowledge"
        ? "acknowledged"
        : action === "resolve"
          ? "resolved"
          : action === "dismiss"
            ? "dismissed"
            : "under_review";
    await this.pool.query(
      `UPDATE robot_operational_incidents SET status=$2,
      resolved_at=CASE WHEN $2 IN ('resolved','dismissed') THEN now() ELSE resolved_at END,
      resolution=COALESCE($3,resolution),state_version=state_version+1,updated_at=now()
      WHERE id=$1`,
      [incidentId, status, input.resolution ?? null],
    );
    return { id: incidentId, status };
  }
}
