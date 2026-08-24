import { createHash, randomUUID } from "node:crypto";
type DbRow = Record<string, unknown>;
const rowString = (value: unknown) => (typeof value === "string" ? value : "");
import type { Pool } from "pg";

const denied = () =>
  Object.assign(new Error("PERMISSION_DENIED"), {
    code: "PERMISSION_DENIED",
    statusCode: 403,
  });
const missing = () =>
  Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND", statusCode: 404 });

export class PostgresPortalProjectionService {
  constructor(private readonly pool: Pool) {}

  private async member(userId: string, organizationId: string) {
    const result = await this.pool.query<DbRow>(
      `SELECT role FROM organization_memberships WHERE user_id=$1 AND organization_id=$2 AND status='active'`,
      [userId, organizationId],
    );
    if (!result.rowCount) throw denied();
    return result.rows[0];
  }

  private async manufacturer(userId: string, organizationId: string) {
    await this.member(userId, organizationId);
    const result = await this.pool.query<DbRow>(
      `SELECT id FROM manufacturers WHERE organization_id=$1`,
      [organizationId],
    );
    if (!result.rowCount) throw denied();
    return rowString(result.rows[0]?.id);
  }

  async createOrganization(
    userId: string,
    input: {
      type: "robot_owner" | "hiring_company" | "robot_manufacturer";
      legalName: string;
      displayName: string;
    },
  ) {
    const client = await this.pool.connect();
    try {
      await client.query<DbRow>("BEGIN");
      const id = randomUUID(),
        type = input.type === "robot_manufacturer" ? "manufacturer" : input.type;
      await client.query<DbRow>(
        `INSERT INTO organizations(id,organization_type,legal_name,display_name,status) VALUES($1,$2,$3,$4,'active')`,
        [id, type, input.legalName, input.displayName],
      );
      await client.query<DbRow>(
        `INSERT INTO organization_memberships(organization_id,user_id,role,status) VALUES($1,$2,'administrator','active')`,
        [id, userId],
      );
      if (type === "hiring_company")
        await client.query<DbRow>(
          `INSERT INTO hiring_companies(organization_id,verification_status) VALUES($1,'pending')`,
          [id],
        );
      if (type === "manufacturer")
        await client.query<DbRow>(
          `INSERT INTO manufacturers(organization_id,approval_status,production_access_status) VALUES($1,'draft','disabled')`,
          [id],
        );
      await client.query<DbRow>(
        `INSERT INTO user_organization_preferences(user_id,default_organization_id) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET default_organization_id=$2,updated_at=now()`,
        [userId, id],
      );
      await client.query<DbRow>(
        `INSERT INTO audit_logs(actor_user_id,actor_organization_id,action,resource_type,resource_id,new_state,source) VALUES($1,$2,'ORGANIZATION_CREATED','organization',$2,$3,'client_api')`,
        [userId, id, JSON.stringify({ type })],
      );
      await client.query<DbRow>("COMMIT");
      return {
        id,
        type,
        legalName: input.legalName,
        displayName: input.displayName,
        status: "active",
      };
    } catch (error) {
      await client.query<DbRow>("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async invitationPreview(userId: string, token: string) {
    const hash = createHash("sha256").update(token).digest("hex"),
      result = await this.pool.query<DbRow>(
        `SELECT i.id,o.display_name "organizationName",o.organization_type "organizationType",i.role,i.status,i.expires_at "expiresAt",u.display_name "invitedBy" FROM organization_invitations i JOIN organizations o ON o.id=i.organization_id JOIN users u ON u.id=i.invited_by_user_id JOIN users recipient ON recipient.id=$2 WHERE i.token_hash=$1 AND recipient.email_normalized=i.email_normalized`,
        [hash, userId],
      );
    if (!result.rowCount) throw missing();
    const row = result.rows[0]!;
    return {
      ...row,
      canAccept:
        row.status === "pending" && new Date(rowString(row.expiresAt)) > new Date(),
    };
  }
  async declineInvitation(userId: string, token: string) {
    const hash = createHash("sha256").update(token).digest("hex"),
      result = await this.pool.query<DbRow>(
        `UPDATE organization_invitations i SET status='declined',declined_at=now(),declined_by_user_id=$2,updated_at=now() FROM users u WHERE i.token_hash=$1 AND u.id=$2 AND i.email_normalized=u.email_normalized AND i.status='pending' AND i.expires_at>now() RETURNING i.id,i.organization_id`,
        [hash, userId],
      );
    if (!result.rowCount) throw missing();
    return { status: "declined" };
  }
  async preferences(userId: string) {
    return (
      (
        await this.pool.query<DbRow>(
          `SELECT preferences,version,updated_at "updatedAt" FROM user_account_preferences WHERE user_id=$1`,
          [userId],
        )
      ).rows[0] ?? { preferences: {}, version: 0 }
    );
  }
  async updatePreferences(userId: string, preferences: Record<string, unknown>) {
    return (
      await this.pool.query<DbRow>(
        `INSERT INTO user_account_preferences(user_id,preferences) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET preferences=$2,version=user_account_preferences.version+1,updated_at=now() RETURNING preferences,version,updated_at "updatedAt"`,
        [userId, JSON.stringify(preferences)],
      )
    ).rows[0];
  }
  async requestDeletion(userId: string, input: { reason?: string | undefined }) {
    const recent = (
      await this.pool.query<DbRow>(
        `SELECT 1 FROM auth_sessions WHERE user_id=$1 AND revoked_at IS NULL AND last_seen_at>now()-interval '15 minutes'`,
        [userId],
      )
    ).rowCount;
    if (!recent)
      throw Object.assign(new Error("RECENT_AUTHENTICATION_REQUIRED"), {
        code: "RECENT_AUTHENTICATION_REQUIRED",
        statusCode: 409,
      });
    const row = (
      await this.pool.query<DbRow>(
        `INSERT INTO account_deletion_requests(user_id,reason,retention_disclosure_version,recovery_expires_at) VALUES($1,$2,'2026-08-10',now()+interval '30 days') RETURNING id,status,requested_at "requestedAt",recovery_expires_at "recoveryExpiresAt"`,
        [userId, input.reason ?? null],
      )
    ).rows[0];
    await this.pool.query<DbRow>(
      `UPDATE auth_sessions SET revoked_at=now(),revocation_reason='account_deletion_requested' WHERE user_id=$1 AND revoked_at IS NULL`,
      [userId],
    );
    return row;
  }
  async cancelDeletion(userId: string, id: string) {
    const result = await this.pool.query<DbRow>(
      `UPDATE account_deletion_requests SET status='cancelled',cancelled_at=now() WHERE id=$1 AND user_id=$2 AND status IN('requested','identity_restricted','retention_review') AND recovery_expires_at>now() RETURNING id,status,cancelled_at "cancelledAt"`,
      [id, userId],
    );
    if (!result.rowCount) throw missing();
    return result.rows[0];
  }

  async ownerDashboard(userId: string, organizationId: string) {
    await this.member(userId, organizationId);
    const [robots, time, notifications, queue] = await Promise.all([
      this.pool.query<DbRow>(
        `SELECT count(*)::int total,count(*) FILTER(WHERE r.activation_state='activated')::int activated,count(*) FILTER(WHERE r.operational_state IN('assigned','operating','paused'))::int assigned,count(*) FILTER(WHERE r.heartbeat_state='online' AND r.operational_state='operating')::int operating FROM robot_ownership_records o JOIN robots r ON r.id=o.robot_id WHERE o.owner_organization_id=$1 AND o.ownership_status='verified' AND o.ownership_end_at IS NULL`,
        [organizationId],
      ),
      this.pool.query<DbRow>(
        `SELECT coalesce(sum(verified_duration_seconds) FILTER(WHERE interval_start_at>=current_date),0)::bigint today_seconds,coalesce(sum(verified_duration_seconds) FILTER(WHERE interval_start_at>=date_trunc('week',now())),0)::bigint week_seconds,coalesce(sum(verified_duration_seconds) FILTER(WHERE interval_start_at>=date_trunc('month',now())),0)::bigint month_seconds,coalesce(sum(verified_duration_seconds),0)::bigint lifetime_seconds FROM verified_operating_intervals WHERE robot_owner_organization_id=$1 AND status IN('closed','finalized')`,
        [organizationId],
      ),
      this.pool.query<DbRow>(
        `SELECT count(*)::int unread FROM notifications WHERE organization_id=$1 AND channel='in_app' AND status NOT IN('read','dismissed')`,
        [organizationId],
      ),
      this.pool.query<DbRow>(
        `SELECT q.priority,q.created_at,q.status,(SELECT count(*)+1 FROM downpayment_queue_entries earlier WHERE earlier.closed_at IS NULL AND (earlier.priority<q.priority OR (earlier.priority=q.priority AND earlier.id<q.id)))::int position FROM downpayment_queue_entries q JOIN organization_memberships m ON m.user_id=q.participant_id AND m.organization_id=$1 AND m.status='active' WHERE q.closed_at IS NULL ORDER BY q.priority,q.id LIMIT 1`,
        [organizationId],
      ),
    ]);
    return {
      robots: robots.rows[0],
      operatingTime: time.rows[0],
      unreadNotifications: notifications.rows[0]?.unread ?? 0,
      queue: queue.rows[0] ?? null,
    };
  }

  async ownerRobots(userId: string, organizationId: string, search?: string) {
    await this.member(userId, organizationId);
    const values: unknown[] = [organizationId];
    const filter = search
      ? (values.push(`%${search}%`),
        ` AND (r.manufacturer_serial_number ILIKE $2 OR rm.name ILIKE $2 OR org.name ILIKE $2)`)
      : "";
    const result = await this.pool.query<DbRow>(
      `SELECT r.id,r.manufacturer_serial_number "serialNumber",rm.model_name model,org.display_name manufacturer,r.registration_state "registrationState",r.ownership_state "ownershipState",r.activation_state "activationState",r.heartbeat_state "heartbeatState",r.operational_state "operationalState",r.maintenance_state "maintenanceState",r.activated_at "activatedAt",hs.last_valid_received_at "lastHeartbeatAt",a.id "assignmentId",a.status "assignmentStatus" FROM robot_ownership_records own JOIN robots r ON r.id=own.robot_id JOIN robot_models rm ON rm.id=r.robot_model_id JOIN manufacturers mf ON mf.id=r.manufacturer_id JOIN organizations org ON org.id=mf.organization_id LEFT JOIN robot_heartbeat_status hs ON hs.robot_id=r.id LEFT JOIN LATERAL(SELECT id,status FROM robot_assignments WHERE robot_id=r.id ORDER BY scheduled_start_at DESC LIMIT 1)a ON true WHERE own.owner_organization_id=$1 AND own.ownership_status='verified' AND own.ownership_end_at IS NULL${filter} ORDER BY r.created_at DESC`,
      values,
    );
    return { items: result.rows };
  }

  async ownerClaims(userId: string, organizationId: string, id?: string) {
    await this.member(userId, organizationId);
    const values: unknown[] = [organizationId];
    const detail = id ? (values.push(id), ` AND c.id=$2`) : "";
    const result = await this.pool.query<DbRow>(
      `SELECT c.id,c.status,c.submitted_at "submittedAt",c.reviewed_at "reviewedAt",c.decision_reason "decisionReason",r.manufacturer_serial_number "serialNumber",rm.name model FROM robot_ownership_claims c JOIN robots r ON r.id=c.robot_id JOIN robot_models rm ON rm.id=r.robot_model_id WHERE c.owner_organization_id=$1${detail} ORDER BY c.submitted_at DESC`,
      values,
    );
    if (id && !result.rowCount) throw missing();
    return id ? result.rows[0] : { items: result.rows };
  }

  async ownerAssignments(userId: string, organizationId: string, id?: string) {
    await this.member(userId, organizationId);
    const values: unknown[] = [organizationId];
    const detail = id ? (values.push(id), ` AND a.id=$2`) : "";
    const result = await this.pool.query<DbRow>(
      `SELECT a.id,a.status,a.scheduled_start_at "scheduledStartAt",a.scheduled_end_at "scheduledEndAt",a.actual_start_at "actualStartAt",a.actual_end_at "actualEndAt",a.financial_status "financialStatus",r.manufacturer_serial_number "serialNumber",f.name facility,d.name department,horg.name company,morg.name manufacturer FROM robot_assignments a JOIN robots r ON r.id=a.robot_id JOIN facilities f ON f.id=a.facility_id LEFT JOIN departments d ON d.id=a.department_id JOIN hiring_companies hc ON hc.id=a.hiring_company_id JOIN organizations horg ON horg.id=hc.organization_id JOIN manufacturers mf ON mf.id=a.manufacturer_id JOIN organizations morg ON morg.id=mf.organization_id WHERE a.robot_owner_organization_id=$1${detail} ORDER BY a.scheduled_start_at DESC`,
      values,
    );
    if (id && !result.rowCount) throw missing();
    return id ? result.rows[0] : { items: result.rows };
  }

  async ownerOperatingTime(userId: string, organizationId: string, id?: string) {
    await this.member(userId, organizationId);
    if (id) {
      const result = await this.pool.query<DbRow>(
        `SELECT v.id,v.interval_start_at "intervalStartAt",v.interval_end_at "intervalEndAt",v.verified_duration_seconds "verifiedDurationSeconds",v.status,v.source_method "sourceMethod",v.review_status "reviewStatus",v.hold_reason "holdReason",r.manufacturer_serial_number "serialNumber" FROM verified_operating_intervals v JOIN robots r ON r.id=v.robot_id WHERE v.id=$1 AND v.robot_owner_organization_id=$2`,
        [id, organizationId],
      );
      if (!result.rowCount) throw missing();
      return result.rows[0];
    }
    const totals = await this.pool.query<DbRow>(
      `SELECT coalesce(sum(verified_duration_seconds) FILTER(WHERE interval_start_at>=current_date),0)::bigint "todaySeconds",coalesce(sum(verified_duration_seconds) FILTER(WHERE interval_start_at>=date_trunc('week',now())),0)::bigint "weekSeconds",coalesce(sum(verified_duration_seconds) FILTER(WHERE interval_start_at>=date_trunc('month',now())),0)::bigint "monthSeconds",coalesce(sum(verified_duration_seconds),0)::bigint "lifetimeSeconds" FROM verified_operating_intervals WHERE robot_owner_organization_id=$1 AND status IN('closed','finalized')`,
      [organizationId],
    );
    const rows = await this.pool.query<DbRow>(
      `SELECT v.id,v.interval_start_at "intervalStartAt",v.interval_end_at "intervalEndAt",v.verified_duration_seconds "verifiedDurationSeconds",v.status,v.review_status "reviewStatus",r.manufacturer_serial_number "serialNumber" FROM verified_operating_intervals v JOIN robots r ON r.id=v.robot_id WHERE v.robot_owner_organization_id=$1 ORDER BY v.interval_start_at DESC LIMIT 100`,
      [organizationId],
    );
    return { totals: totals.rows[0], items: rows.rows };
  }

  async setOwnerAvailability(
    userId: string,
    organizationId: string,
    robotId: string,
    available: boolean,
    expectedVersion: number,
  ) {
    await this.member(userId, organizationId);
    const result = await this.pool.query<DbRow>(
      `UPDATE robots r SET operational_state=$4,state_version=state_version+1,updated_at=now() FROM robot_ownership_records own WHERE r.id=$1 AND own.robot_id=r.id AND own.owner_organization_id=$2 AND own.ownership_status='verified' AND own.ownership_end_at IS NULL AND r.state_version=$3 AND NOT EXISTS(SELECT 1 FROM robot_assignments a WHERE a.robot_id=r.id AND a.status IN('reserved','ready','active','paused','interrupted')) RETURNING r.id,r.operational_state "operationalState",r.state_version "stateVersion"`,
      [
        robotId,
        organizationId,
        expectedVersion,
        available ? "available" : "unavailable",
      ],
    );
    if (!result.rowCount)
      throw Object.assign(new Error("AVAILABILITY_CONFLICT_OR_ACTIVE_ASSIGNMENT"), {
        code: "AVAILABILITY_CONFLICT_OR_ACTIVE_ASSIGNMENT",
        statusCode: 409,
      });
    return result.rows[0];
  }
  async notifications(userId: string, organizationId: string) {
    await this.member(userId, organizationId);
    return {
      items: (
        await this.pool.query<DbRow>(
          `SELECT id,notification_type "type",title,body,href,status,priority,created_at "createdAt",read_at "readAt" FROM notifications WHERE user_id=$1 AND (organization_id=$2 OR organization_id IS NULL) AND channel='in_app' AND status<>'dismissed' ORDER BY created_at DESC LIMIT 100`,
          [userId, organizationId],
        )
      ).rows,
    };
  }

  async manufacturerDashboard(userId: string, organizationId: string) {
    const manufacturerId = await this.manufacturer(userId, organizationId);
    const result = await this.pool.query<DbRow>(
      `SELECT (SELECT count(*) FROM portal_domain_resources WHERE resource_type='work_order' AND status='published')::int "matchingWorkOrders",(SELECT count(*) FROM portal_domain_resources WHERE resource_type='opportunity' AND data->>'manufacturerOrganizationId'=$1 AND status IN('invited','open'))::int invitations,(SELECT count(*) FROM contracts WHERE manufacturer_id=$2 AND status NOT IN('completed','cancelled'))::int contracts,(SELECT count(*) FROM robot_assignments WHERE manufacturer_id=$2 AND status IN('pending','reserved','ready','active','paused','interrupted'))::int allocated,(SELECT count(*) FROM robots WHERE manufacturer_id=$2 AND heartbeat_state='online')::int online,(SELECT count(*) FROM robots WHERE manufacturer_id=$2 AND heartbeat_state IN('offline','invalid'))::int offline`,
      [organizationId, manufacturerId],
    );
    return result.rows[0];
  }

  async discoverWorkOrders(userId: string, organizationId: string, search?: string) {
    await this.manufacturer(userId, organizationId);
    const values: unknown[] = [];
    const filter = search
      ? (values.push(`%${search}%`), ` AND (name ILIKE $1 OR data::text ILIKE $1)`)
      : "";
    const result = await this.pool.query<DbRow>(
      `SELECT id,name,status,data->'publishedSummary' "publishedSummary",data->>'industry' industry,data->>'serviceRegion' "serviceRegion",data->>'requiredCapability' "requiredCapability",updated_at "updatedAt" FROM portal_domain_resources WHERE resource_type='work_order' AND status='published' AND archived_at IS NULL${filter} ORDER BY updated_at DESC LIMIT 100`,
      values,
    );
    return { items: result.rows };
  }

  async manufacturerOpportunities(userId: string, organizationId: string) {
    await this.manufacturer(userId, organizationId);
    return {
      items: (
        await this.pool.query<DbRow>(
          `SELECT id,name,status,data,version,created_at "createdAt",updated_at "updatedAt" FROM portal_domain_resources WHERE resource_type='opportunity' AND data->>'manufacturerOrganizationId'=$1 AND archived_at IS NULL ORDER BY updated_at DESC`,
          [organizationId],
        )
      ).rows,
    };
  }

  async manufacturerFulfillment(userId: string, organizationId: string) {
    const manufacturerId = await this.manufacturer(userId, organizationId);
    const orders = await this.pool.query<DbRow>(
      `SELECT po.id,po.quantity,po.status,po.created_at "createdAt",po.updated_at "updatedAt",c.id "contractId",horg.name company FROM robot_purchase_orders po JOIN contracts c ON c.id=po.contract_id JOIN hiring_companies hc ON hc.id=c.hiring_company_id JOIN organizations horg ON horg.id=hc.organization_id WHERE c.manufacturer_id=$1 ORDER BY po.created_at DESC`,
      [manufacturerId],
    );
    const fleet = await this.pool.query<DbRow>(
      `SELECT r.id,r.manufacturer_serial_number "serialNumber",rm.model_name model,r.activation_state "activationState",r.heartbeat_state "heartbeatState",r.operational_state "operationalState",r.maintenance_state "maintenanceState",a.id "assignmentId",a.status "assignmentStatus" FROM robots r JOIN robot_models rm ON rm.id=r.robot_model_id LEFT JOIN LATERAL(SELECT id,status FROM robot_assignments WHERE robot_id=r.id ORDER BY scheduled_start_at DESC LIMIT 1)a ON true WHERE r.manufacturer_id=$1 ORDER BY r.created_at DESC`,
      [manufacturerId],
    );
    return { purchaseOrders: orders.rows, fleet: fleet.rows };
  }

  async preShipment(userId: string, organizationId: string, robotId: string) {
    const manufacturerId = await this.manufacturer(userId, organizationId);
    const result = await this.pool.query<DbRow>(
      `SELECT r.id,r.manufacturer_serial_number "serialNumber",r.registration_state "registrationState",r.activation_state "activationState",r.heartbeat_state "heartbeatState",r.compliance_state "complianceState",s.id "sessionId",s.status "verificationStatus",s.started_at "startedAt",s.completed_at "completedAt",s.failure_reason "failureReason" FROM robots r LEFT JOIN LATERAL(SELECT * FROM robot_activation_sessions WHERE robot_id=r.id AND environment='production' ORDER BY started_at DESC LIMIT 1)s ON true WHERE r.id=$1 AND r.manufacturer_id=$2`,
      [robotId, manufacturerId],
    );
    if (!result.rowCount) throw missing();
    return result.rows[0];
  }
}
