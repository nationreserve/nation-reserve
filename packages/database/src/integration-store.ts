/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import type {
  ActivationRecord,
  IntegrationRepositories,
  IntegrationUnitOfWork,
  ManufacturerRecord,
  ModelRevisionRecord,
  RobotRecord,
} from "@nation-reserve/robot-integration";
import type { Pool, PoolClient } from "pg";

export class PostgresIntegrationUnitOfWork implements IntegrationUnitOfWork {
  constructor(private readonly pool: Pool) {}
  async transaction<T>(operation: (repositories: IntegrationRepositories) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(new PostgresIntegrationRepositories(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

class PostgresIntegrationRepositories implements IntegrationRepositories {
  constructor(private readonly client: PoolClient) {}
  async manufacturerForUpdate(id: string): Promise<ManufacturerRecord | undefined> {
    const row = (await this.client.query(`SELECT id,sandbox_approved_at,production_approved_at,
      production_access_status FROM manufacturers WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    return row ? { id: row.id, sandboxApproved: Boolean(row.sandbox_approved_at),
      productionApproved: Boolean(row.production_approved_at),
      productionEnabled: row.production_access_status === "enabled" } : undefined;
  }
  async modelRevision(id: string): Promise<ModelRevisionRecord | undefined> {
    const row = (await this.client.query(`SELECT r.id,r.robot_model_id,r.status,
      r.supported_api_versions,r.operational_state_mapping,m.manufacturer_id
      FROM robot_model_revisions r JOIN robot_models m ON m.id=r.robot_model_id WHERE r.id=$1`, [id])).rows[0];
    return row ? { id: row.id, modelId: row.robot_model_id, manufacturerId: row.manufacturer_id,
      status: row.status, supportedApiVersions: row.supported_api_versions as string[],
      stateMapping: row.operational_state_mapping as Record<string, string> } : undefined;
  }
  async robotForUpdate(id: string): Promise<RobotRecord | undefined> {
    const row = (await this.client.query("SELECT * FROM robots WHERE id=$1 FOR UPDATE", [id])).rows[0];
    return row ? mapRobot(row) : undefined;
  }
  async ownerOrganizationForUpdate(id: string) {
    const row = (await this.client.query(`SELECT organization_type,status FROM organizations
      WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    return row ? { type: row.organization_type as string, active: row.status === "active" } : undefined;
  }
  async registrationByIdempotency(manufacturerId: string, environment: string, key: string) {
    const row = (await this.client.query(`SELECT request_fingerprint,id,robot_id,status
      FROM robot_registration_requests WHERE manufacturer_id=$1 AND environment=$2 AND idempotency_key=$3`,
    [manufacturerId, environment, key])).rows[0];
    return row ? { fingerprint: row.request_fingerprint as string,
      value: { requestId: row.id, robotId: row.robot_id, status: row.status } } : undefined;
  }
  async insertCredential(input: object) {
    const value = input as Record<string, unknown>;
    const row = (await this.client.query(`INSERT INTO manufacturer_api_credentials
      (manufacturer_id,environment,credential_name,credential_prefix,secret_hash,scopes,
       allowed_api_versions,created_by_user_id,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [value.manufacturerId, value.environment, value.name, value.prefix, value.secretHash,
      JSON.stringify(value.scopes), JSON.stringify(["v1"]), value.actorId, value.expiresAt])).rows[0];
    return { id: row.id as string };
  }
  async insertRegistration(input: object) {
    const value = input as Record<string, unknown>;
    const request = (await this.client.query(`INSERT INTO robot_registration_requests
      (manufacturer_id,robot_model_id,robot_model_revision_id,environment,
       manufacturer_serial_number,normalized_serial_number,hardware_revision,firmware_version,
       hardware_identity_type,hardware_identity_value_hash,region_code,status,
       submitted_by_credential_id,idempotency_key,request_fingerprint)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'validating',$12,$13,$14) RETURNING id`,
    [value.manufacturerId, value.modelId, value.modelRevisionId, value.environment,
      value.serialNumber, value.normalizedSerialNumber, value.hardwareRevision, value.firmwareVersion,
      value.hardwareIdentityValue ? "manufacturer_device_id" : null, value.hardwareIdentityHash,
      value.regionCode, value.credentialId, value.idempotencyKey, value.requestFingerprint])).rows[0];
    const robot = (await this.client.query(`INSERT INTO robots
      (manufacturer_id,robot_model_id,robot_model_revision_id,manufacturer_serial_number,
       normalized_serial_number,hardware_revision,firmware_version,region_code,environment,
       registration_state,ownership_state,activation_state,heartbeat_state,operational_state,
       maintenance_state,compliance_state,financial_eligibility_state,final_lifecycle_state,state_version,
       hardware_identity_status)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'registered','unassigned','not_eligible',
       'never_connected','unavailable','no_maintenance','eligible','not_payable','active',1,$10)
      RETURNING *`, [value.manufacturerId, value.modelId, value.modelRevisionId, value.serialNumber,
      value.normalizedSerialNumber, value.hardwareRevision, value.firmwareVersion, value.regionCode,
      value.environment, value.hardwareIdentityHash ? "confirmed" : "not_registered"])).rows[0];
    if (value.hardwareIdentityHash) {
      await this.client.query(`INSERT INTO robot_hardware_identities
        (robot_id,environment,identity_type,identity_hash,status) VALUES($1,$2,$3,$4,'active')`,
      [robot.id, value.environment, "manufacturer_device_id", value.hardwareIdentityHash]);
    }
    await this.client.query(`UPDATE robot_registration_requests SET status='accepted',
      robot_id=$2,reviewed_at=now() WHERE id=$1`, [request.id, robot.id]);
    return { requestId: request.id as string, robot: mapRobot(robot) };
  }
  async activeOwnedRobotCount(ownerId: string) {
    const row = (await this.client.query(`SELECT count(*)::int AS count FROM robot_ownership_records o
      JOIN robots r ON r.id=o.robot_id WHERE o.owner_organization_id=$1
      AND o.ownership_status='verified' AND o.ownership_end_at IS NULL
      AND r.final_lifecycle_state NOT IN ('retired','decommissioned','destroyed')`, [ownerId])).rows[0];
    return row.count as number;
  }
  async consumeTransferCode(hash: string, ownerId: string) {
    const row = (await this.client.query(`UPDATE robot_transfer_codes SET status='consumed',
      consumed_at=now(),consumed_by_organization_id=$2 WHERE code_hash=$1 AND status='active'
      AND expires_at>now() RETURNING id,robot_id`, [hash, ownerId])).rows[0];
    return row ? { id: row.id as string, robotId: row.robot_id as string } : undefined;
  }
  async insertVerifiedClaim(input: object) {
    const value = input as Record<string, unknown>;
    const claim = (await this.client.query(`INSERT INTO robot_ownership_claims
      (robot_id,owner_organization_id,transfer_code_id,status,submitted_by_user_id,reviewed_at)
      VALUES($1,$2,$3,'verified',$4,now()) RETURNING id`,
    [value.robotId, value.ownerId, value.transferCodeId, value.actorId])).rows[0];
    const ownership = (await this.client.query(`INSERT INTO robot_ownership_records
      (robot_id,owner_organization_id,ownership_status,ownership_start_at,acquisition_method,
       source_reference,verification_method,approved_by_user_id,verified_at)
      VALUES($1,$2,'verified',now(),'transfer_code',$3,'manufacturer_transfer_code',$4,now())
      RETURNING id`, [value.robotId, value.ownerId, claim.id, value.actorId])).rows[0];
    return { claimId: claim.id as string, ownershipId: ownership.id as string };
  }
  async updateRobot(id: string, expectedVersion: number, state: Partial<RobotRecord>) {
    const row = (await this.client.query(`UPDATE robots SET
      ownership_state=COALESCE($3,ownership_state),activation_state=COALESCE($4,activation_state),
      heartbeat_state=COALESCE($5,heartbeat_state),operational_state=COALESCE($6,operational_state),
      financial_eligibility_state=COALESCE($7,financial_eligibility_state),
      final_lifecycle_state=COALESCE($8,final_lifecycle_state),state_version=state_version+1,
      activated_at=CASE WHEN $4='activated' THEN now() ELSE activated_at END
      WHERE id=$1 AND state_version=$2 RETURNING *`, [id, expectedVersion, state.ownershipState,
      state.activationState, state.heartbeatState, state.operationalState,
      state.financialEligibilityState, state.finalLifecycleState])).rows[0];
    if (!row) throw new Error("OPTIMISTIC_LOCK_CONFLICT");
    return mapRobot(row);
  }
  async insertActivation(input: object, checks: readonly string[]): Promise<ActivationRecord> {
    const value = input as Record<string, unknown>;
    const row = (await this.client.query(`INSERT INTO robot_activation_sessions
      (robot_id,environment,status,request_id,started_by_credential_id,expires_at,expected_robot_state_version)
      VALUES($1,$2,'in_progress',$3,$4,$5,$6) RETURNING *`, [value.robotId, value.environment,
      value.requestId, value.credentialId, value.expiresAt, value.expectedRobotStateVersion])).rows[0];
    for (const check of checks) await this.client.query(`INSERT INTO robot_activation_checks
      (activation_session_id,check_type,status) VALUES($1,$2,'pending')`, [row.id, check]);
    return (await this.activationForUpdate(row.id as string))!;
  }
  async activationForUpdate(id: string): Promise<ActivationRecord | undefined> {
    const row = (await this.client.query(`SELECT a.*,r.*,a.id AS activation_id,a.status AS activation_status,
      a.environment AS activation_environment,a.expires_at AS activation_expires_at,
      mr.operational_state_mapping FROM robot_activation_sessions a JOIN robots r ON r.id=a.robot_id
      JOIN robot_model_revisions mr ON mr.id=r.robot_model_revision_id WHERE a.id=$1 FOR UPDATE OF a`,
    [id])).rows[0];
    if (!row) return undefined;
    const checks = await this.client.query(`SELECT check_type,status FROM robot_activation_checks
      WHERE activation_session_id=$1`, [id]);
    return { id: row.activation_id, status: row.activation_status,
      environment: row.activation_environment, expiresAt: row.activation_expires_at,
      robot: mapRobot(row), checks: Object.fromEntries(checks.rows.map((item) => [item.check_type, item.status])),
      stateMapping: row.operational_state_mapping };
  }
  async insertActivationMessage(input: object) {
    const value = input as Record<string, unknown>;
    await this.client.query(`INSERT INTO activation_test_messages
      (activation_session_id,request_id,nonce,manufacturer_state,mapped_platform_state,
       message_timestamp,result,rejection_reason)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [value.activationId, value.requestId, value.nonce,
      value.manufacturerState, value.mappedPlatformState, value.timestamp, value.result,
      value.result === "rejected" ? "unmapped_state" : null]);
    if (value.result === "accepted") await this.client.query(`UPDATE robot_activation_checks
      SET status='passed',checked_at=now() WHERE activation_session_id=$1
      AND check_type IN ('integration_connectivity','operational_mapping')`, [value.activationId]);
  }
  async markActivationComplete(id: string) {
    await this.client.query(`UPDATE robot_activation_sessions SET status='passed',completed_at=now()
      WHERE id=$1 AND status='in_progress'`, [id]);
  }
  async audit(action: string, entityType: string, entityId: string, metadata: object = {}) {
    await this.client.query(`INSERT INTO audit_logs(actor_type,action,entity_type,entity_id,metadata)
      VALUES('manufacturer_integration',$1,$2,$3,$4)`, [action, entityType, entityId, metadata]);
  }
  async outbox(type: string, aggregateType: string, aggregateId: string, payload: object) {
    await this.client.query(`INSERT INTO outbox_events
      (id,event_type,aggregate_type,aggregate_id,occurred_at,payload,metadata)
      VALUES(gen_random_uuid(),$1,$2,$3,now(),$4,'{"schemaVersion":1}')`,
    [type, aggregateType, aggregateId, payload]);
  }
}

function mapRobot(row: Record<string, unknown>): RobotRecord {
  return {
    id: String(row.id), manufacturerId: String(row.manufacturer_id),
    modelId: String(row.robot_model_id), modelRevisionId: String(row.robot_model_revision_id),
    environment: row.environment as "sandbox" | "production",
    registrationState: String(row.registration_state), ownershipState: String(row.ownership_state),
    activationState: String(row.activation_state), heartbeatState: String(row.heartbeat_state),
    operationalState: String(row.operational_state),
    financialEligibilityState: String(row.financial_eligibility_state),
    finalLifecycleState: String(row.final_lifecycle_state), stateVersion: Number(row.state_version),
  };
}

