type DbRow = Record<string, unknown>;
const rowString = (value: unknown) => (typeof value === "string" ? value : "");
import type { Pool, PoolClient } from "pg";
const fail = (code: string, statusCode: number) =>
  Object.assign(new Error(code), { code, statusCode });
type Json = Record<string, unknown>;
export class PostgresGuidedTrainingService {
  constructor(
    private readonly pool: Pool,
    private readonly storage: { createDownloadUrl(key: string): Promise<string> },
  ) {}
  private async company(userId: string, organizationId: string, client = this.pool) {
    const r = await client.query<DbRow>(
      `SELECT 1 FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.organization_id=$2 AND m.status='active' AND o.organization_type='hiring_company'`,
      [userId, organizationId],
    );
    if (!r.rowCount) throw fail("PERMISSION_DENIED", 403);
  }
  private async manufacturer(
    userId: string,
    organizationId: string,
    client = this.pool,
  ) {
    const r = await client.query<DbRow>(
      `SELECT mf.id FROM organization_memberships m JOIN manufacturers mf ON mf.organization_id=m.organization_id WHERE m.user_id=$1 AND m.organization_id=$2 AND m.status='active'`,
      [userId, organizationId],
    );
    if (!r.rowCount) throw fail("PERMISSION_DENIED", 403);
    return rowString(r.rows[0]?.id);
  }
  async createRequirement(
    userId: string,
    manufacturerOrganizationId: string,
    input: { companyOrganizationId: string; contractId: string; robotModelId: string },
  ) {
    const manufacturerId = await this.manufacturer(userId, manufacturerOrganizationId);
    const valid = await this.pool.query<DbRow>(
      `SELECT 1 FROM contracts c JOIN hiring_companies h ON h.id=c.hiring_company_id WHERE c.id=$1 AND c.manufacturer_id=$2 AND h.organization_id=$3`,
      [input.contractId, manufacturerId, input.companyOrganizationId],
    );
    if (!valid.rowCount) throw fail("CONTRACT_RELATIONSHIP_NOT_FOUND", 404);
    return (
      await this.pool.query<DbRow>(
        `INSERT INTO guided_training_requirements(company_organization_id,manufacturer_id,contract_id,robot_model_id,requested_by_user_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(contract_id,manufacturer_id,robot_model_id) DO UPDATE SET updated_at=now() RETURNING *`,
        [
          input.companyOrganizationId,
          manufacturerId,
          input.contractId,
          input.robotModelId,
          userId,
        ],
      )
    ).rows[0];
  }
  async decide(
    userId: string,
    manufacturerOrganizationId: string,
    id: string,
    input: {
      decision: "NO_NEW_TRAINING_DATA_REQUIRED" | "TRAINING_DATA_REQUIRED";
      specification?: Json | undefined;
      requiredTier?: number | undefined;
    },
  ) {
    const manufacturerId = await this.manufacturer(userId, manufacturerOrganizationId);
    return this.tx(async (c) => {
      const req = (
        await c.query<DbRow>(
          `SELECT * FROM guided_training_requirements WHERE id=$1 AND manufacturer_id=$2 FOR UPDATE`,
          [id, manufacturerId],
        )
      ).rows[0];
      if (!req) throw fail("TRAINING_REQUIREMENT_NOT_FOUND", 404);
      if (
        input.decision === "TRAINING_DATA_REQUIRED" &&
        (!input.specification || !input.requiredTier)
      )
        throw fail("TRAINING_SPECIFICATION_REQUIRED", 400);
      const status =
          input.decision === "TRAINING_DATA_REQUIRED"
            ? "EQUIPMENT_NEEDED"
            : "NOT_REQUIRED",
        gate =
          input.decision === "TRAINING_DATA_REQUIRED" ? "REQUIRED" : "NOT_REQUIRED";
      const row = (
        await c.query<DbRow>(
          `UPDATE guided_training_requirements SET decision=$2,status=$3,specification=$4,required_tier=$5,decided_at=now(),version=version+1,updated_at=now() WHERE id=$1 RETURNING *`,
          [
            id,
            input.decision,
            status,
            JSON.stringify(input.specification ?? {}),
            input.requiredTier ?? null,
          ],
        )
      ).rows[0];
      await c.query<DbRow>(
        `UPDATE contracts SET training_gate_status=$2,updated_at=now() WHERE id=$1`,
        [req.contract_id, gate],
      );
      await c.query<DbRow>(
        `DELETE FROM guided_training_kit_items WHERE requirement_id=$1`,
        [id],
      );
      if (input.decision === "TRAINING_DATA_REQUIRED")
        await this.recommend(c, id, input.requiredTier!, input.specification!);
      await this.notifyOrg(
        c,
        rowString(req.company_organization_id),
        "TRAINING_DATA_REQUIRED",
        input.decision === "TRAINING_DATA_REQUIRED"
          ? "Training data required"
          : "No new training data required",
        input.decision === "TRAINING_DATA_REQUIRED"
          ? "The Manufacturer supplied training requirements and a recommended kit."
          : "The contract may continue without new training equipment.",
        `/company/training-setup/${id}`,
      );
      return row;
    });
  }
  private async recommend(c: PoolClient, id: string, tier: number, spec: Json) {
    const streams = requiredStreams(spec);
    for (const stream of streams) {
      const p = (
        await c.query<DbRow>(
          `SELECT id FROM wearable_catalog_products WHERE is_active=true AND tier<=$1 AND $2=ANY(supported_data_types) AND approval_status NOT IN('REJECTED','DISCONTINUED') ORDER BY tier DESC,is_featured DESC,listed_price_cents NULLS LAST LIMIT 1`,
          [tier, stream],
        )
      ).rows[0];
      if (p)
        await c.query<DbRow>(
          `INSERT INTO guided_training_kit_items(requirement_id,product_id,requirement_status,purpose,compatibility_notes) VALUES($1,$2,'REQUIRED',$3,$4) ON CONFLICT DO NOTHING`,
          [
            id,
            rowString(p.id),
            `Required ${stream.replaceAll("_", " ")} capture`,
            `Selected for Tier ${tier} and ${stream}`,
          ],
        );
    }
    const optional = await c.query<DbRow>(
      `SELECT id FROM wearable_catalog_products WHERE is_active=true AND tier=$1 AND approval_status NOT IN('REJECTED','DISCONTINUED') ORDER BY is_featured DESC LIMIT 2`,
      [tier],
    );
    for (const p of optional.rows)
      await c.query<DbRow>(
        `INSERT INTO guided_training_kit_items(requirement_id,product_id,requirement_status,purpose) VALUES($1,$2,'OPTIONAL','Optional compatible capture coverage') ON CONFLICT DO NOTHING`,
        [id, p.id],
      );
  }
  async list(userId: string, organizationId: string, side: "company" | "manufacturer") {
    let where: string, value: string;
    if (side === "company") {
      await this.company(userId, organizationId);
      where = "r.company_organization_id=$1";
      value = organizationId;
    } else {
      value = await this.manufacturer(userId, organizationId);
      where = "r.manufacturer_id=$1";
    }
    return {
      items: (
        await this.pool.query<DbRow>(
          `SELECT r.id,r.decision,r.status,r.required_tier "requiredTier",r.specification,r.version,r.created_at "createdAt",r.updated_at "updatedAt",co.display_name company,mo.display_name manufacturer,c.id "contractId",rm.model_name "robotModel" FROM guided_training_requirements r JOIN organizations co ON co.id=r.company_organization_id JOIN manufacturers mf ON mf.id=r.manufacturer_id JOIN organizations mo ON mo.id=mf.organization_id JOIN contracts c ON c.id=r.contract_id JOIN robot_models rm ON rm.id=r.robot_model_id WHERE ${where} ORDER BY r.updated_at DESC`,
          [value],
        )
      ).rows,
    };
  }
  async detail(
    userId: string,
    organizationId: string,
    id: string,
    side: "company" | "manufacturer",
  ) {
    const allowed =
      side === "company"
        ? (await this.company(userId, organizationId), `r.company_organization_id=$2`)
        : (await this.manufacturer(userId, organizationId),
          `r.manufacturer_id=(SELECT id FROM manufacturers WHERE organization_id=$2)`);
    const r = (
      await this.pool.query<DbRow>(
        `SELECT r.*,co.display_name company,mo.display_name manufacturer,rm.model_name "robotModel" FROM guided_training_requirements r JOIN organizations co ON co.id=r.company_organization_id JOIN manufacturers mf ON mf.id=r.manufacturer_id JOIN organizations mo ON mo.id=mf.organization_id JOIN robot_models rm ON rm.id=r.robot_model_id WHERE r.id=$1 AND ${allowed}`,
        [id, organizationId],
      )
    ).rows[0];
    if (!r) throw fail("TRAINING_REQUIREMENT_NOT_FOUND", 404);
    const [kit, readiness, selections, submissions] = await Promise.all([
      this.pool.query<DbRow>(
        `SELECT k.requirement_status "requirementStatus",k.purpose,k.compatibility_notes "compatibility",p.id "productId",p.name,p.tier,p.seller,p.listed_price_cents "referencePriceCents",p.price_label "priceLabel",p.required_accessories "requiredAccessories",p.subscription_required "subscriptionRequired",p.subscription_price_cents "subscriptionPriceCents",p.external_purchase_url "purchaseUrl",p.supported_data_types "supportedDataTypes" FROM guided_training_kit_items k JOIN wearable_catalog_products p ON p.id=k.product_id WHERE k.requirement_id=$1 ORDER BY k.requirement_status,p.display_order`,
        [id],
      ),
      this.pool.query<DbRow>(
        `SELECT * FROM guided_training_readiness WHERE requirement_id=$1`,
        [id],
      ),
      this.pool.query<DbRow>(
        `SELECT * FROM guided_training_equipment_selections WHERE requirement_id=$1 ORDER BY created_at`,
        [id],
      ),
      this.pool.query<DbRow>(
        `SELECT s.*,coalesce(json_agg(json_build_object('id',f.id,'objectId',f.object_id,'streamType',f.stream_type,'validationStatus',f.validation_status)) FILTER(WHERE f.id IS NOT NULL),'[]') files FROM guided_training_submissions s LEFT JOIN guided_training_submission_files f ON f.submission_id=s.id WHERE s.requirement_id=$1 GROUP BY s.id ORDER BY s.version`,
        [id],
      ),
    ]);
    const reviews = await this.pool.query<DbRow>(
      `SELECT rv.*,s.version submission_version,s.kind submission_kind FROM guided_training_reviews rv JOIN guided_training_submissions s ON s.id=rv.submission_id WHERE s.requirement_id=$1 ORDER BY rv.created_at`,
      [id],
    );
    return {
      ...r,
      kit: kit.rows,
      readiness: readiness.rows[0] ?? null,
      equipmentSelections: selections.rows,
      submissions: submissions.rows,
      reviews: reviews.rows,
    };
  }
  async selectEquipment(
    userId: string,
    organizationId: string,
    id: string,
    input: { productId?: string | undefined; acquisitionStatus: string; details: Json },
  ) {
    await this.company(userId, organizationId);
    const result = await this.pool.query<DbRow>(
      `INSERT INTO guided_training_equipment_selections(requirement_id,product_id,acquisition_status,details,recorded_by_user_id) SELECT $1,$2,$3,$4,$5 FROM guided_training_requirements WHERE id=$1 AND company_organization_id=$6 RETURNING *`,
      [
        id,
        input.productId ?? null,
        input.acquisitionStatus,
        JSON.stringify(input.details),
        userId,
        organizationId,
      ],
    );
    if (!result.rowCount) throw fail("TRAINING_REQUIREMENT_NOT_FOUND", 404);
    await this.pool.query<DbRow>(
      `UPDATE guided_training_requirements SET status='EQUIPMENT_ACQUIRED',updated_at=now() WHERE id=$1`,
      [id],
    );
    return result.rows[0];
  }
  async readiness(
    userId: string,
    organizationId: string,
    id: string,
    input: {
      checklist: Json;
      calibrationComplete: boolean;
      synchronizationComplete: boolean;
      testRecordingComplete: boolean;
    },
  ) {
    await this.company(userId, organizationId);
    const row = (
      await this.pool.query<DbRow>(
        `INSERT INTO guided_training_readiness(requirement_id,checklist,calibration_complete,synchronization_complete,test_recording_complete,updated_by_user_id) SELECT $1,$2,$3,$4,$5,$6 FROM guided_training_requirements WHERE id=$1 AND company_organization_id=$7 ON CONFLICT(requirement_id) DO UPDATE SET checklist=$2,calibration_complete=$3,synchronization_complete=$4,test_recording_complete=$5,updated_by_user_id=$6,version=guided_training_readiness.version+1,updated_at=now() RETURNING *`,
        [
          id,
          JSON.stringify(input.checklist),
          input.calibrationComplete,
          input.synchronizationComplete,
          input.testRecordingComplete,
          userId,
          organizationId,
        ],
      )
    ).rows[0];
    if (!row) throw fail("TRAINING_REQUIREMENT_NOT_FOUND", 404);
    await this.pool.query<DbRow>(
      `UPDATE guided_training_requirements SET status=$2,updated_at=now() WHERE id=$1`,
      [id, input.testRecordingComplete ? "SAMPLE_REQUIRED" : "SETUP_IN_PROGRESS"],
    );
    return row;
  }
  async createSubmission(
    userId: string,
    organizationId: string,
    id: string,
    input: {
      kind: "SAMPLE" | "FULL" | "REVISION";
      recordingDurationSeconds: number;
      metadata: Json;
      parentSubmissionId?: string | undefined;
    },
  ) {
    await this.company(userId, organizationId);
    const next =
      (
        await this.pool.query<DbRow>(
          `SELECT coalesce(max(version),0)+1 version FROM guided_training_submissions WHERE requirement_id=$1`,
          [id],
        )
      ).rows[0]?.version ?? 1;
    const result = await this.pool.query<DbRow>(
      `INSERT INTO guided_training_submissions(requirement_id,kind,version,status,recording_duration_seconds,metadata,parent_submission_id,submitted_by_user_id) SELECT $1,$2,$3,'DRAFT',$4,$5,$6,$7 FROM guided_training_requirements WHERE id=$1 AND company_organization_id=$8 RETURNING *`,
      [
        id,
        input.kind,
        next,
        input.recordingDurationSeconds,
        JSON.stringify(input.metadata),
        input.parentSubmissionId ?? null,
        userId,
        organizationId,
      ],
    );
    if (!result.rowCount) throw fail("TRAINING_REQUIREMENT_NOT_FOUND", 404);
    return result.rows[0];
  }
  async attachFile(
    userId: string,
    organizationId: string,
    submissionId: string,
    input: { objectId: string; streamType: string; required: boolean; metadata: Json },
  ) {
    await this.company(userId, organizationId);
    const result = await this.pool.query<DbRow>(
      `INSERT INTO guided_training_submission_files(submission_id,object_id,stream_type,required,validation_status,metadata) SELECT s.id,o.id,$3,$4,CASE WHEN o.status='available' AND o.malware_scan_status='clean' THEN 'VALID' WHEN o.status='quarantined' THEN 'QUARANTINED' ELSE 'PENDING' END,$5 FROM guided_training_submissions s JOIN guided_training_requirements r ON r.id=s.requirement_id JOIN stored_objects o ON o.id=$2 AND o.organization_id=$6 WHERE s.id=$1 AND r.company_organization_id=$6 RETURNING *`,
      [
        submissionId,
        input.objectId,
        input.streamType,
        input.required,
        JSON.stringify(input.metadata),
        organizationId,
      ],
    );
    if (!result.rowCount) throw fail("PRIVATE_UPLOAD_NOT_FOUND", 404);
    return result.rows[0];
  }
  async capture(
    userId: string,
    organizationId: string,
    id: string,
    input: {
      action:
        | "START"
        | "PAUSE"
        | "RESUME"
        | "END"
        | "CANCEL"
        | "EQUIPMENT_PROBLEM"
        | "PRIVACY_ISSUE";
      kind?: "SAMPLE" | "FULL" | "REVISION" | undefined;
      sessionId?: string | undefined;
      details: Json;
    },
  ) {
    await this.company(userId, organizationId);
    return this.tx(async (c) => {
      if (input.action === "START") {
        const req = (
          await c.query<DbRow>(
            `SELECT specification FROM guided_training_requirements WHERE id=$1 AND company_organization_id=$2 AND status IN('SAMPLE_REQUIRED','SETUP_APPROVED','CHANGES_REQUESTED','SETUP_CHANGES_REQUESTED')`,
            [id, organizationId],
          )
        ).rows[0];
        if (!req) throw fail("TRAINING_CAPTURE_NOT_ALLOWED", 409);
        const session = (
          await c.query<DbRow>(
            `INSERT INTO guided_training_capture_sessions(requirement_id,kind,instructions_snapshot,started_by_user_id) VALUES($1,$2,$3,$4) RETURNING *`,
            [id, input.kind ?? "FULL", JSON.stringify(req.specification), userId],
          )
        ).rows[0];
        if (!session) throw new Error("Capture session insert returned no row");
        await c.query<DbRow>(
          `INSERT INTO guided_training_capture_events(session_id,event_type,details,actor_user_id) VALUES($1,'STARTED',$2,$3)`,
          [session.id, JSON.stringify(input.details), userId],
        );
        await c.query<DbRow>(
          `UPDATE guided_training_requirements SET status='RECORDING',updated_at=now() WHERE id=$1`,
          [id],
        );
        return session;
      }
      const session = (
        await c.query<DbRow>(
          `SELECT s.* FROM guided_training_capture_sessions s JOIN guided_training_requirements r ON r.id=s.requirement_id WHERE s.id=$1 AND s.requirement_id=$2 AND r.company_organization_id=$3 FOR UPDATE`,
          [input.sessionId, id, organizationId],
        )
      ).rows[0];
      if (!session) throw fail("TRAINING_CAPTURE_NOT_FOUND", 404);
      const transitions: Record<string, { from: string[]; to: string; event: string }> =
        {
          PAUSE: { from: ["STARTED"], to: "PAUSED", event: "PAUSED" },
          RESUME: { from: ["PAUSED"], to: "STARTED", event: "RESUMED" },
          END: { from: ["STARTED", "PAUSED"], to: "ENDED", event: "ENDED" },
          CANCEL: { from: ["STARTED", "PAUSED"], to: "CANCELLED", event: "CANCELLED" },
          EQUIPMENT_PROBLEM: {
            from: ["STARTED", "PAUSED"],
            to: rowString(session.status),
            event: "EQUIPMENT_PROBLEM",
          },
          PRIVACY_ISSUE: {
            from: ["STARTED", "PAUSED"],
            to: rowString(session.status),
            event: "PRIVACY_ISSUE",
          },
        };
      const t = transitions[input.action];
      if (!t || !t.from.includes(rowString(session.status)))
        throw fail("INVALID_CAPTURE_TRANSITION", 409);
      await c.query<DbRow>(
        `UPDATE guided_training_capture_sessions SET status=$2,ended_at=CASE WHEN $2 IN('ENDED','CANCELLED') THEN now() ELSE ended_at END,updated_at=now() WHERE id=$1`,
        [session.id, t.to],
      );
      await c.query<DbRow>(
        `INSERT INTO guided_training_capture_events(session_id,event_type,details,actor_user_id) VALUES($1,$2,$3,$4)`,
        [session.id, t.event, JSON.stringify(input.details), userId],
      );
      return { ...session, status: t.to };
    });
  }
  async submit(userId: string, organizationId: string, submissionId: string) {
    await this.company(userId, organizationId);
    return this.tx(async (c) => {
      const s = (
        await c.query<DbRow>(
          `SELECT s.*,r.company_organization_id,r.manufacturer_id FROM guided_training_submissions s JOIN guided_training_requirements r ON r.id=s.requirement_id WHERE s.id=$1 AND r.company_organization_id=$2 FOR UPDATE`,
          [submissionId, organizationId],
        )
      ).rows[0];
      if (!s) throw fail("TRAINING_SUBMISSION_NOT_FOUND", 404);
      const files = await c.query<DbRow>(
        `SELECT validation_status FROM guided_training_submission_files WHERE submission_id=$1`,
        [submissionId],
      );
      if (!files.rowCount || files.rows.some((x) => x.validation_status !== "VALID"))
        throw fail("TRAINING_FILES_INCOMPLETE", 409);
      await c.query<DbRow>(
        `UPDATE guided_training_submissions SET status='AWAITING_REVIEW',submitted_at=now(),updated_at=now() WHERE id=$1`,
        [submissionId],
      );
      await c.query<DbRow>(
        `UPDATE guided_training_requirements SET status=$2,updated_at=now() WHERE id=$1`,
        [s.requirement_id, s.kind === "SAMPLE" ? "SAMPLE_REVIEW" : "DATA_SUBMITTED"],
      );
      const mo = (
        await c.query<DbRow>(`SELECT organization_id FROM manufacturers WHERE id=$1`, [
          s.manufacturer_id,
        ])
      ).rows[0];
      await this.notifyOrg(
        c,
        rowString(mo?.organization_id),
        s.kind === "SAMPLE" ? "TRAINING_SAMPLE_SUBMITTED" : "TRAINING_DATA_SUBMITTED",
        s.kind === "SAMPLE"
          ? "Test capture ready for review"
          : "Training data ready for review",
        "A private training submission is ready for review.",
        `/manufacturer/training-requests/${rowString(s.requirement_id)}`,
      );
      return { ...s, status: "AWAITING_REVIEW" };
    });
  }
  async download(userId: string, organizationId: string, fileId: string) {
    const row = (
      await this.pool.query<DbRow>(
        `SELECT o.object_key,o.filename,r.company_organization_id,mf.organization_id manufacturer_organization_id FROM guided_training_submission_files f JOIN guided_training_submissions s ON s.id=f.submission_id JOIN guided_training_requirements r ON r.id=s.requirement_id JOIN manufacturers mf ON mf.id=r.manufacturer_id JOIN stored_objects o ON o.id=f.object_id WHERE f.id=$1 AND o.status='available' AND o.malware_scan_status='clean'`,
        [fileId],
      )
    ).rows[0];
    if (!row) throw fail("TRAINING_FILE_NOT_AVAILABLE", 404);
    if (row.company_organization_id === organizationId)
      await this.company(userId, organizationId);
    else if (row.manufacturer_organization_id === organizationId)
      await this.manufacturer(userId, organizationId);
    else throw fail("PERMISSION_DENIED", 403);
    await this.pool.query<DbRow>(
      `INSERT INTO guided_training_file_access_log(file_id,organization_id,user_id) VALUES($1,$2,$3)`,
      [fileId, organizationId, userId],
    );
    return {
      url: await this.storage.createDownloadUrl(rowString(row.object_key)),
      filename: row.filename,
      expiresInSeconds: 300,
    };
  }
  async review(
    userId: string,
    organizationId: string,
    submissionId: string,
    input: {
      decision: "APPROVED" | "CHANGES_REQUESTED" | "PARTIALLY_ACCEPTED" | "REJECTED";
      acceptedStreams: string[];
      redoStreams: string[];
      additionalRecordings: number;
      feedback: Json;
      comments?: string | undefined;
    },
  ) {
    const manufacturerId = await this.manufacturer(userId, organizationId);
    return this.tx(async (c) => {
      const s = (
        await c.query<DbRow>(
          `SELECT s.*,r.company_organization_id,r.manufacturer_id FROM guided_training_submissions s JOIN guided_training_requirements r ON r.id=s.requirement_id WHERE s.id=$1 AND r.manufacturer_id=$2 FOR UPDATE`,
          [submissionId, manufacturerId],
        )
      ).rows[0];
      if (!s) throw fail("TRAINING_SUBMISSION_NOT_FOUND", 404);
      await c.query<DbRow>(
        `INSERT INTO guided_training_reviews(submission_id,reviewer_user_id,decision,accepted_streams,redo_streams,additional_recordings,feedback,comments) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          submissionId,
          userId,
          input.decision,
          input.acceptedStreams,
          input.redoStreams,
          input.additionalRecordings,
          JSON.stringify(input.feedback),
          input.comments ?? null,
        ],
      );
      await c.query<DbRow>(
        `UPDATE guided_training_submissions SET status=$2,updated_at=now() WHERE id=$1`,
        [submissionId, input.decision],
      );
      const status =
        s.kind === "SAMPLE"
          ? input.decision === "APPROVED"
            ? "SETUP_APPROVED"
            : "SETUP_CHANGES_REQUESTED"
          : input.decision === "APPROVED"
            ? "TRAINING_DATA_APPROVED"
            : "CHANGES_REQUESTED";
      await c.query<DbRow>(
        `UPDATE guided_training_requirements SET status=$2,approved_at=CASE WHEN $2='TRAINING_DATA_APPROVED' THEN now() ELSE approved_at END,updated_at=now() WHERE id=$1`,
        [s.requirement_id, status],
      );
      if (status === "SETUP_APPROVED")
        await c.query<DbRow>(
          `UPDATE contracts SET training_gate_status='SETUP_APPROVED',updated_at=now() WHERE id=(SELECT contract_id FROM guided_training_requirements WHERE id=$1)`,
          [s.requirement_id],
        );
      if (status === "TRAINING_DATA_APPROVED")
        await c.query<DbRow>(
          `UPDATE contracts SET training_gate_status='DATA_APPROVED',updated_at=now() WHERE id=(SELECT contract_id FROM guided_training_requirements WHERE id=$1)`,
          [s.requirement_id],
        );
      await this.notifyOrg(
        c,
        rowString(s.company_organization_id),
        input.decision === "APPROVED"
          ? "TRAINING_DATA_APPROVED"
          : "TRAINING_CHANGES_REQUESTED",
        input.decision === "APPROVED"
          ? s.kind === "SAMPLE"
            ? "Training setup approved"
            : "Training requirement complete"
          : "Training changes requested",
        input.comments ?? "Review the structured Manufacturer feedback.",
        `/company/training-setup/${rowString(s.requirement_id)}`,
      );
      return { status, decision: input.decision };
    });
  }
  private async notifyOrg(
    c: PoolClient,
    org: string,
    type: string,
    title: string,
    body: string,
    href: string,
  ) {
    await c.query<DbRow>(
      `INSERT INTO notifications(user_id,organization_id,channel,title,body,href,status,notification_type,idempotency_key) SELECT m.user_id,$1,'in_app',$3,$4,$5,'delivered',$2,$2||':'||$1||':'||gen_random_uuid()::text FROM organization_memberships m WHERE m.organization_id=$1 AND m.status='active'`,
      [org, type, title, body, href],
    );
  }
  private async tx<T>(fn: (c: PoolClient) => Promise<T>) {
    const c = await this.pool.connect();
    try {
      await c.query<DbRow>("BEGIN");
      const x = await fn(c);
      await c.query<DbRow>("COMMIT");
      return x;
    } catch (e) {
      await c.query<DbRow>("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
}
function requiredStreams(spec: Json) {
  const map: Record<string, string> = {
    requiredFirstPersonVideo: "first_person_video",
    requiredThirdPersonVideo: "third_person_video",
    requiredWristArmMovement: "activity",
    requiredHandFingerMotion: "hand_tracking",
    requiredFullBodyMotion: "full_body_motion",
    requiredAudio: "audio",
    requiredImu: "imu",
  };
  const streams = Object.entries(map)
    .filter(([k]) => spec[k] === true)
    .map(([, v]) => v);
  const other = Array.isArray(spec.otherRequiredStreams)
    ? spec.otherRequiredStreams.filter((x): x is string => typeof x === "string")
    : [];
  return [...new Set([...streams, ...other])];
}
