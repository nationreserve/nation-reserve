/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-base-to-string, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import type {
  ContractRecord,
  ContractRepositories,
  ContractUnitOfWork,
  VersionRecord,
} from "@nation-reserve/contract-operations";
import type { Pool, PoolClient } from "pg";

export class PostgresContractUnitOfWork implements ContractUnitOfWork {
  constructor(private readonly pool: Pool) {}
  async transaction<T>(work: (repo: ContractRepositories) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const value = await work(new PostgresContractRepositories(client));
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
class PostgresContractRepositories implements ContractRepositories {
  constructor(private readonly client: PoolClient) {}
  async hiringCompanyForUpdate(id: string) {
    const row = (
      await this.client.query(
        `SELECT h.id,h.organization_id,o.status FROM hiring_companies h
      JOIN organizations o ON o.id=h.organization_id WHERE h.id=$1 FOR UPDATE OF h`,
        [id],
      )
    ).rows[0];
    return row
      ? { id: row.id, organizationId: row.organization_id, status: row.status }
      : undefined;
  }
  async manufacturer(id: string) {
    const row = (
      await this.client.query(
        `SELECT id,organization_id,approval_status,
      production_access_status FROM manufacturers WHERE id=$1`,
        [id],
      )
    ).rows[0];
    return row
      ? {
          id: row.id,
          organizationId: row.organization_id,
          approved:
            row.approval_status === "production_approved" &&
            row.production_access_status === "production",
        }
      : undefined;
  }
  async facility(id: string) {
    const row = (
      await this.client.query(
        "SELECT id,hiring_company_id FROM facilities WHERE id=$1",
        [id],
      )
    ).rows[0];
    return row ? { id: row.id, hiringCompanyId: row.hiring_company_id } : undefined;
  }
  async department(id: string) {
    const row = (
      await this.client.query("SELECT id,facility_id FROM departments WHERE id=$1", [
        id,
      ])
    ).rows[0];
    return row ? { id: row.id, facilityId: row.facility_id } : undefined;
  }
  async activeFinancialConfiguration() {
    const row = (
      await this.client.query(`SELECT id FROM financial_configuration_versions
      WHERE status='active' AND effective_at<=now() AND (expires_at IS NULL OR expires_at>now())
      ORDER BY version DESC LIMIT 1`)
    ).rows[0];
    return row ? { id: row.id } : undefined;
  }
  async createContract(input: object) {
    const v = input as Record<string, unknown>;
    const row = (
      await this.client.query(
        `INSERT INTO contracts
      (manufacturer_id,hiring_company_id,facility_id,department_id,contract_type,status,
       requested_robot_count,priority,start_at,end_at,renewal_mode,rate_configuration_version_id,
       created_by_user_id,estimated_contract_value_cents)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [
          v.manufacturerId,
          v.hiringCompanyId,
          v.facilityId,
          v.departmentId,
          v.contractType,
          v.status,
          v.requestedRobotCount,
          v.priority,
          v.startAt,
          v.endAt,
          v.renewalMode,
          v.rateConfigurationVersionId,
          v.createdByUserId,
          v.estimatedContractValueCents,
        ],
      )
    ).rows[0];
    return mapContract(row);
  }
  async contractForUpdate(id: string) {
    const row = (
      await this.client.query("SELECT * FROM contracts WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    return row ? mapContract(row) : undefined;
  }
  async versionForUpdate(id: string) {
    const row = (
      await this.client.query(
        "SELECT * FROM contract_versions WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    return row ? mapVersion(row) : undefined;
  }
  async createVersion(input: object) {
    const v = input as Record<string, unknown>;
    const row = (
      await this.client.query(
        `INSERT INTO contract_versions
      (contract_id,version_number,requested_robot_count,operating_windows,required_capabilities,
       location_requirements,special_terms,effective_at,created_by_user_id,change_reason,status,
       start_at,end_at,estimated_contract_value_cents)
      VALUES($1,$2,$3,$4,$5,$6,$7,now(),$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          v.contractId,
          v.versionNumber,
          v.requestedRobotCount,
          JSON.stringify(v.operatingWindows ?? {}),
          JSON.stringify(v.requiredCapabilities ?? {}),
          JSON.stringify(v.locationRequirements ?? {}),
          JSON.stringify(v.specialTerms ?? {}),
          v.createdByUserId,
          v.changeReason,
          v.status,
          v.startAt,
          v.endAt,
          v.estimatedContractValueCents,
        ],
      )
    ).rows[0];
    await this.client.query(
      `UPDATE contracts SET current_version_number=$2,requested_robot_count=$3,
      assigned_robot_count=LEAST(assigned_robot_count,$3),estimated_contract_value_cents=$4,approved_by_manufacturer_at=NULL,
      approved_by_company_at=NULL,status='draft' WHERE id=$1`,
      [
        v.contractId,
        v.versionNumber,
        v.requestedRobotCount,
        v.estimatedContractValueCents,
      ],
    );
    return mapVersion(row);
  }
  async addVersionModels(
    versionId: string,
    models: Array<{ modelId: string; modelRevisionId?: string; quantity: number }>,
  ) {
    for (const model of models)
      await this.client.query(
        `INSERT INTO contract_version_robot_models
      (contract_version_id,robot_model_id,robot_model_revision_id,requested_quantity)
      VALUES($1,$2,$3,$4)`,
        [versionId, model.modelId, model.modelRevisionId, model.quantity],
      );
  }
  async addSchedules(
    versionId: string,
    rules: Array<Record<string, unknown>>,
    exceptions: Array<Record<string, unknown>>,
  ) {
    for (const r of rules)
      await this.client.query(
        `INSERT INTO contract_schedule_rules
      (contract_version_id,timezone,day_of_week,local_start_time,local_end_time,
       recurrence_start,recurrence_end) VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [
          versionId,
          r.timezone,
          r.dayOfWeek,
          r.localStartTime,
          r.localEndTime,
          r.recurrenceStart,
          r.recurrenceEnd,
        ],
      );
    for (const e of exceptions)
      await this.client.query(
        `INSERT INTO contract_schedule_exceptions
      (contract_version_id,exception_date,exception_type,local_start_time,local_end_time,reason)
      VALUES($1,$2,$3,$4,$5,$6)`,
        [versionId, e.date, e.type, e.localStartTime, e.localEndTime, e.reason],
      );
  }
  async recordDecision(input: object) {
    const v = input as Record<string, unknown>;
    await this.client.query(
      `INSERT INTO contract_approval_events
      (contract_id,contract_version_id,party,decision,decided_by_user_id,reason)
      VALUES($1,$2,$3,$4,$5,$6)`,
      [v.contractId, v.versionId, v.party, v.decision, v.actorId, v.reason],
    );
  }
  async updateApproval(input: object) {
    const v = input as Record<string, unknown>;
    const party = String(v.party);
    const decision = String(v.decision);
    if (decision === "approved") {
      const column = party === "manufacturer" ? "manufacturer" : "company";
      await this.client.query(
        `UPDATE contract_versions SET ${column}_approved_at=now(),
        ${column}_approved_by_user_id=$2,status=CASE
        WHEN $3='manufacturer' AND company_approved_at IS NULL THEN 'pending_company_approval'
        WHEN $3='hiring_company' AND manufacturer_approved_at IS NULL THEN 'pending_manufacturer_approval'
        ELSE 'approved' END WHERE id=$1`,
        [v.versionId, v.actorId, party],
      );
    } else {
      await this.client.query(
        `UPDATE contract_versions SET status=$2,rejected_at=CASE WHEN $2='rejected'
        THEN now() ELSE rejected_at END,rejected_by_user_id=CASE WHEN $2='rejected' THEN $3
        ELSE rejected_by_user_id END,rejection_reason=$4 WHERE id=$1`,
        [
          v.versionId,
          decision === "rejected" ? "rejected" : "draft",
          v.actorId,
          v.reason,
        ],
      );
    }
    const version = (await this.versionForUpdate(String(v.versionId)))!;
    await this.client.query(
      `UPDATE contracts SET approved_by_manufacturer_at=$2,
      approved_by_company_at=$3,status=CASE WHEN $4='approved' THEN 'approved'
      WHEN $4='pending_company_approval' THEN 'pending_company_approval'
      WHEN $4='pending_manufacturer_approval' THEN 'pending_manufacturer_approval'
      WHEN $4='rejected' THEN 'cancelled' ELSE 'draft' END WHERE id=$1`,
      [
        version.contractId,
        version.manufacturerApprovedAt,
        version.companyApprovedAt,
        version.status,
      ],
    );
    return { contract: (await this.contractForUpdate(version.contractId))!, version };
  }
  async robotForAllocation(id: string) {
    const row = (
      await this.client.query(
        `SELECT r.*,o.owner_organization_id FROM robots r
      LEFT JOIN robot_ownership_records o ON o.robot_id=r.id AND o.ownership_status='verified'
      AND o.ownership_end_at IS NULL WHERE r.id=$1 FOR UPDATE OF r`,
        [id],
      )
    ).rows[0];
    return row
      ? {
          id: row.id,
          manufacturerId: row.manufacturer_id,
          modelId: row.robot_model_id,
          ownerOrganizationId: row.owner_organization_id ?? null,
          registrationState: row.registration_state,
          ownershipState: row.ownership_state,
          activationState: row.activation_state,
          operationalState: row.operational_state,
          complianceState: row.compliance_state,
          finalLifecycleState: row.final_lifecycle_state,
          maintenanceState: row.maintenance_state,
        }
      : undefined;
  }
  async modelAllowed(versionId: string, modelId: string) {
    return Boolean(
      (
        await this.client.query(
          `SELECT 1 FROM contract_version_robot_models
      WHERE contract_version_id=$1 AND robot_model_id=$2`,
          [versionId, modelId],
        )
      ).rowCount,
    );
  }
  async assignmentConflict(robotId: string, start: Date, end: Date) {
    return Boolean(
      (
        await this.client.query(
          `SELECT 1 FROM robot_assignments WHERE robot_id=$1
      AND status IN ('reserved','ready','scheduled','active','paused','interrupted')
      AND tstzrange(scheduled_start_at,scheduled_end_at,'[)')&&tstzrange($2,$3,'[)') LIMIT 1`,
          [robotId, start, end],
        )
      ).rowCount,
    );
  }
  async createAssignment(input: object) {
    const v = input as Record<string, unknown>;
    const row = (
      await this.client.query(
        `INSERT INTO robot_assignments
      (contract_id,contract_version_id,robot_id,robot_owner_organization_id,manufacturer_id,
       hiring_company_id,facility_id,department_id,status,financial_status,
       scheduled_start_at,scheduled_end_at,replacement_for_assignment_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [
          v.contractId,
          v.contractVersionId,
          v.robotId,
          v.robotOwnerOrganizationId,
          v.manufacturerId,
          v.hiringCompanyId,
          v.facilityId,
          v.departmentId,
          v.status,
          v.financialStatus,
          v.scheduledStartAt,
          v.scheduledEndAt,
          v.replacementForAssignmentId,
        ],
      )
    ).rows[0];
    await this.client.query(
      `INSERT INTO assignment_state_history
      (assignment_id,new_status,actor_type,reason) VALUES($1,$2,'user','allocation')`,
      [row.id, v.status],
    );
    return { id: row.id };
  }
  async assignmentForUpdate(id: string) {
    return (
      await this.client.query(
        "SELECT * FROM robot_assignments WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
  }
  async updateAssignment(id: string, input: object) {
    const v = input as Record<string, unknown>;
    const prior = (
      await this.client.query("SELECT status FROM robot_assignments WHERE id=$1", [id])
    ).rows[0];
    await this.client.query(
      `UPDATE robot_assignments SET status=COALESCE($2,status),
      replacement_for_assignment_id=COALESCE($3,replacement_for_assignment_id),
      cancellation_party=COALESCE($4,cancellation_party),cancellation_reason=COALESCE($5,cancellation_reason),
      cancelled_at=CASE WHEN $2='cancelled' THEN now() ELSE cancelled_at END WHERE id=$1`,
      [id, v.status, v.replacementForAssignmentId, v.party, v.reason],
    );
    if (v.status)
      await this.client.query(
        `INSERT INTO assignment_state_history
      (assignment_id,previous_status,new_status,actor_type,reason) VALUES($1,$2,$3,'user',$4)`,
        [id, prior?.status, v.status, v.reason],
      );
  }
  async refreshFulfillment(contractId: string) {
    const row = (
      await this.client.query(
        `SELECT c.requested_robot_count,
      count(a.id) FILTER(WHERE a.status IN ('ready','scheduled','active'))::int AS assigned
      FROM contracts c LEFT JOIN robot_assignments a ON a.contract_id=c.id WHERE c.id=$1 GROUP BY c.id`,
        [contractId],
      )
    ).rows[0];
    const assigned = Number(row.assigned);
    const requested = Number(row.requested_robot_count);
    const status =
      assigned === 0
        ? "approved"
        : assigned < requested
          ? "partially_fulfilled"
          : "fully_fulfilled";
    await this.client.query(
      "UPDATE contracts SET assigned_robot_count=$2,status=$3 WHERE id=$1",
      [contractId, assigned, status],
    );
    return { assigned, requested, status };
  }
  async audit(action: string, type: string, id: string, metadata: object = {}) {
    await this.client.query(
      `INSERT INTO audit_logs(actor_type,action,entity_type,entity_id,metadata)
      VALUES('user',$1,$2,$3,$4)`,
      [action, type, id, metadata],
    );
  }
  async outbox(type: string, aggregateType: string, id: string, payload: object) {
    await this.client.query(
      `INSERT INTO outbox_events
      (id,event_type,aggregate_type,aggregate_id,payload,metadata,occurred_at)
      VALUES(gen_random_uuid(),$1,$2,$3,$4,'{"schemaVersion":1}',now())`,
      [type, aggregateType, id, payload],
    );
  }
}
function mapContract(row: Record<string, unknown>): ContractRecord {
  return {
    id: String(row.id),
    manufacturerId: String(row.manufacturer_id),
    hiringCompanyId: String(row.hiring_company_id),
    facilityId: String(row.facility_id),
    departmentId: row.department_id ? String(row.department_id) : null,
    status: String(row.status),
    currentVersionNumber: Number(row.current_version_number),
    requestedRobotCount: Number(row.requested_robot_count),
    assignedRobotCount: Number(row.assigned_robot_count),
  };
}
function mapVersion(row: Record<string, unknown>): VersionRecord {
  return {
    id: String(row.id),
    contractId: String(row.contract_id),
    versionNumber: Number(row.version_number),
    status: String(row.status),
    manufacturerApprovedAt: row.manufacturer_approved_at as Date | null,
    companyApprovedAt: row.company_approved_at as Date | null,
  };
}
