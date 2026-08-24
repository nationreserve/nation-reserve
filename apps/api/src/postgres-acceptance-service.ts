type DbRow = Record<string, unknown>;
const isRow = (value: unknown): value is DbRow =>
  typeof value === "object" && value !== null && !Array.isArray(value);
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { hashOpaqueToken } from "@nation-reserve/auth";

type Permission =
  | "acceptance.overview.read"
  | "acceptance.journeys.read"
  | "acceptance.gaps.read"
  | "acceptance.runs.read"
  | "acceptance.runs.execute"
  | "acceptance.waivers.read"
  | "acceptance.waivers.create"
  | "acceptance.waivers.revoke";

export class PostgresAcceptanceService {
  constructor(private readonly pool: Pool) {}

  private async assert(userId: string, permission: Permission): Promise<void> {
    const result = await this.pool.query<DbRow>(
      `SELECT 1 FROM organization_memberships m
      JOIN organizations o ON o.id=m.organization_id
      JOIN role_permission_grants g ON g.organization_type=o.organization_type AND g.role=m.role
      WHERE m.user_id=$1 AND m.status='active' AND o.organization_type='platform'
        AND g.permission_key=$2 AND g.effect='allow' LIMIT 1`,
      [userId, permission],
    );
    if (!result.rowCount)
      throw Object.assign(new Error("Acceptance permission required"), {
        code: "FORBIDDEN",
        statusCode: 403,
      });
  }

  async overview(userId: string) {
    await this.assert(userId, "acceptance.overview.read");
    const result = await this.pool.query<DbRow>(`SELECT
      (SELECT count(*)::int FROM acceptance_gaps WHERE status IN ('open','in_progress') AND classification='launch_blocking') launch_blockers,
      (SELECT count(*)::int FROM acceptance_gaps WHERE status IN ('open','in_progress')) open_gaps,
      (SELECT count(*)::int FROM acceptance_waivers WHERE status='approved' AND expires_at>now()) active_waivers,
      (SELECT row_to_json(r) FROM (SELECT id,status,started_at,completed_at,report FROM acceptance_runs ORDER BY started_at DESC LIMIT 1) r) last_run`);
    return result.rows[0];
  }
  async journeys(userId: string, journeyId?: string) {
    await this.assert(userId, "acceptance.journeys.read");
    const result = await this.pool.query<DbRow>(
      `SELECT report->'journeys' journeys FROM acceptance_runs
      WHERE ($1::text IS NULL OR report->'journeys' ? $1) ORDER BY started_at DESC LIMIT 1`,
      [journeyId ?? null],
    );
    const value = result.rows[0]?.journeys,
      journeys = isRow(value) ? value : {};
    return journeyId ? (journeys[journeyId] ?? null) : journeys;
  }
  async gaps(userId: string, gapId?: string) {
    await this.assert(userId, "acceptance.gaps.read");
    const result = await this.pool.query<DbRow>(
      `SELECT * FROM acceptance_gaps WHERE ($1::text IS NULL OR id=$1) ORDER BY
      CASE classification WHEN 'launch_blocking' THEN 1 WHEN 'pilot_blocking' THEN 2 ELSE 3 END, detected_at`,
      [gapId ?? null],
    );
    return gapId ? (result.rows[0] ?? null) : { items: result.rows };
  }
  async waivers(userId: string) {
    await this.assert(userId, "acceptance.waivers.read");
    return {
      items: (
        await this.pool.query<DbRow>(
          "SELECT * FROM acceptance_waivers ORDER BY created_at DESC",
        )
      ).rows,
    };
  }
  async runs(userId: string, runId?: string) {
    await this.assert(userId, "acceptance.runs.read");
    const result = await this.pool.query<DbRow>(
      `SELECT * FROM acceptance_runs WHERE ($1::uuid IS NULL OR id=$1) ORDER BY started_at DESC LIMIT 100`,
      [runId ?? null],
    );
    return runId ? (result.rows[0] ?? null) : { items: result.rows };
  }
  async startRun(userId: string, environment: string) {
    await this.assert(userId, "acceptance.runs.execute");
    return this.transaction(async (client) => {
      const run = (
        await client.query<DbRow & { id: string }>(
          `INSERT INTO acceptance_runs(status,environment,started_by)
        VALUES('running',$1,$2) RETURNING *`,
          [environment, userId],
        )
      ).rows[0];
      if (!run) throw new Error("Acceptance run insert returned no row");
      await client.query<DbRow>(
        `INSERT INTO background_jobs(job_type,payload,idempotency_key)
        VALUES('acceptance.safe_run',$1,$2)`,
        [JSON.stringify({ runId: run.id, environment }), `acceptance:${run.id}`],
      );
      await this.event(
        client,
        "acceptance.run.started",
        "acceptance_run",
        run.id,
        userId,
        { environment },
      );
      return run;
    });
  }
  async createWaiver(
    userId: string,
    sessionId: string,
    stepUpToken: string | undefined,
    input: {
      gapId: string;
      reason: string;
      temporaryBehavior: string;
      risk: string;
      expiresAt: string;
      followUpIssue: string;
      affectedOrganizations: string[];
    },
  ) {
    await this.assert(userId, "acceptance.waivers.create");
    await this.consumeStepUp(userId, sessionId, stepUpToken);
    return this.transaction(async (client) => {
      const id = randomUUID();
      const waiver = (
        await client.query<DbRow>(
          `INSERT INTO acceptance_waivers(id,gap_id,reason,temporary_behavior,risk,expires_at,follow_up_issue,affected_organizations,requested_by,step_up_verified_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now()) RETURNING *`,
          [
            id,
            input.gapId,
            input.reason,
            input.temporaryBehavior,
            input.risk,
            input.expiresAt,
            input.followUpIssue,
            input.affectedOrganizations,
            userId,
          ],
        )
      ).rows[0];
      await this.event(
        client,
        "acceptance.waiver.requested",
        "acceptance_waiver",
        id,
        userId,
        { gapId: input.gapId, expiresAt: input.expiresAt },
      );
      return waiver;
    });
  }
  async revokeWaiver(
    userId: string,
    sessionId: string,
    stepUpToken: string | undefined,
    waiverId: string,
  ) {
    await this.assert(userId, "acceptance.waivers.revoke");
    await this.consumeStepUp(userId, sessionId, stepUpToken);
    return this.transaction(async (client) => {
      const result = await client.query<DbRow>(
        `UPDATE acceptance_waivers SET status='revoked',revoked_at=now()
        WHERE id=$1 AND status IN ('requested','approved') RETURNING *`,
        [waiverId],
      );
      if (!result.rowCount)
        throw Object.assign(new Error("Active waiver not found"), {
          code: "NOT_FOUND",
          statusCode: 404,
        });
      await this.event(
        client,
        "acceptance.waiver.revoked",
        "acceptance_waiver",
        waiverId,
        userId,
        { gapId: result.rows[0]!.gap_id },
      );
      return result.rows[0];
    });
  }
  private async consumeStepUp(
    userId: string,
    sessionId: string,
    token: string | undefined,
  ) {
    if (!token)
      throw Object.assign(new Error("Step-up authentication required"), {
        code: "STEP_UP_REQUIRED",
        statusCode: 403,
      });
    const result = await this.pool.query<DbRow>(
      `UPDATE administrative_step_up_grants SET used_at=now()
      WHERE user_id=$1 AND session_id=$2 AND token_hash=$3 AND purpose='acceptance_waiver'
        AND expires_at>now() AND used_at IS NULL AND revoked_at IS NULL RETURNING id`,
      [userId, sessionId, hashOpaqueToken(token)],
    );
    if (!result.rowCount)
      throw Object.assign(
        new Error("Step-up grant is invalid, expired, or already used"),
        { code: "STEP_UP_INVALID", statusCode: 403 },
      );
  }
  private event(
    client: PoolClient,
    type: string,
    aggregateType: string,
    aggregateId: string,
    actorUserId: string,
    payload: unknown,
  ) {
    return client.query<DbRow>(
      `INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,metadata)
      VALUES(gen_random_uuid(),$1,$2,$3,$4,$5)`,
      [
        type,
        aggregateType,
        aggregateId,
        JSON.stringify({ ...(payload as object), actorUserId }),
        JSON.stringify({
          timeline: {
            category: "acceptance",
            source: "platform_action",
            summary: type.replaceAll(".", " "),
            audience: "platform",
          },
        }),
      ],
    );
  }
  private async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query<DbRow>("BEGIN");
      const value = await work(client);
      await client.query<DbRow>("COMMIT");
      return value;
    } catch (error) {
      await client.query<DbRow>("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
