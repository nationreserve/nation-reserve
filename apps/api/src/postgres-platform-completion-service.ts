type DbRow = Record<string, unknown>;
const rowScalar = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";
import type { Pool, PoolClient } from "pg";
const err = (code: string, statusCode: number) =>
  Object.assign(new Error(code), { code, statusCode });
type Json = Record<string, unknown>;
const safeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/json",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
export class PostgresPlatformCompletionService {
  constructor(
    private readonly pool: Pool,
    private readonly storage: { createDownloadUrl(key: string): Promise<string> },
  ) {}
  private async member(userId: string, organizationId: string) {
    const r = await this.pool.query<DbRow>(
      `SELECT o.organization_type,m.role FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.organization_id=$2 AND m.status='active'`,
      [userId, organizationId],
    );
    if (!r.rowCount) throw err("PERMISSION_DENIED", 403);
    return r.rows[0] as { organization_type: string; role: string };
  }
  private async admin(userId: string) {
    const r = await this.pool.query<DbRow>(
      `SELECT 1 FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.status='active' AND o.organization_type='platform' AND m.role IN('super_admin','platform_admin','admin','support_admin','finance_admin','operations_admin')`,
      [userId],
    );
    if (!r.rowCount) throw err("ADMIN_PERMISSION_REQUIRED", 403);
  }
  async tickets(userId: string, organizationId: string) {
    await this.member(userId, organizationId);
    return {
      items: (
        await this.pool.query<DbRow>(
          `SELECT id,ticket_number "ticketNumber",subject,category,priority,status,related_records "relatedRecords",created_at "createdAt",updated_at "updatedAt" FROM support_tickets WHERE requester_user_id=$1 AND organization_id=$2 ORDER BY updated_at DESC`,
          [userId, organizationId],
        )
      ).rows,
    };
  }
  async createTicket(
    userId: string,
    organizationId: string,
    input: {
      subject: string;
      category: string;
      description: string;
      priority: string;
      relatedRecords: Json;
      diagnosticsSafe: Json;
      objectIds: string[];
    },
  ) {
    await this.member(userId, organizationId);
    return this.tx(async (c) => {
      const ticket = (
        await c.query<DbRow>(
          `INSERT INTO support_tickets(requester_user_id,organization_id,subject,category,description,priority,status,related_records,diagnostics_safe) VALUES($1,$2,$3,$4,$5,$6,'AWAITING_SUPPORT',$7,$8) RETURNING *`,
          [
            userId,
            organizationId,
            input.subject,
            input.category,
            input.description,
            input.priority,
            JSON.stringify(input.relatedRecords),
            JSON.stringify(redact(input.diagnosticsSafe)),
          ],
        )
      ).rows[0];
      if (!ticket) throw new Error("Support ticket insert returned no row");
      const message = (
        await c.query<DbRow>(
          `INSERT INTO support_ticket_messages(ticket_id,author_user_id,body) VALUES($1,$2,$3) RETURNING id`,
          [ticket.id, userId, input.description],
        )
      ).rows[0];
      if (!message) throw new Error("Support message insert returned no row");
      for (const objectId of input.objectIds)
        await this.linkObject(
          c,
          userId,
          organizationId,
          objectId,
          `INSERT INTO support_ticket_attachments(ticket_id,message_id,object_id,uploader_user_id) VALUES($1,$2,$3,$4)`,
          [ticket.id, message.id, objectId, userId],
        );
      await this.audit(
        c,
        userId,
        "SUPPORT_TICKET_CREATED",
        "support_ticket",
        rowScalar(ticket.id),
        { category: input.category, priority: input.priority },
      );
      return ticket;
    });
  }
  async ticket(userId: string, id: string) {
    const admin = await this.isAdmin(userId),
      ticket = (
        await this.pool.query<DbRow>(
          `SELECT t.*,u.display_name requester_name,o.display_name organization_name FROM support_tickets t JOIN users u ON u.id=t.requester_user_id LEFT JOIN organizations o ON o.id=t.organization_id WHERE t.id=$1 AND ($2 OR t.requester_user_id=$3)`,
          [id, admin, userId],
        )
      ).rows[0];
    if (!ticket) throw err("SUPPORT_TICKET_NOT_FOUND", 404);
    const [messages, attachments] = await Promise.all([
      this.pool.query<DbRow>(
        `SELECT m.id,m.body,m.internal_note "internalNote",m.created_at "createdAt",u.display_name author FROM support_ticket_messages m JOIN users u ON u.id=m.author_user_id WHERE m.ticket_id=$1 AND ($2 OR NOT m.internal_note) ORDER BY m.created_at,m.id`,
        [id, admin],
      ),
      this.pool.query<DbRow>(
        `SELECT a.id,a.message_id "messageId",o.filename,o.content_type "contentType",o.size_bytes "sizeBytes",o.status,o.malware_scan_status "scanStatus" FROM support_ticket_attachments a JOIN stored_objects o ON o.id=a.object_id WHERE a.ticket_id=$1 ORDER BY a.created_at`,
        [id],
      ),
    ]);
    return { ...ticket, messages: messages.rows, attachments: attachments.rows };
  }
  async reply(
    userId: string,
    id: string,
    input: { body: string; internalNote: boolean },
  ) {
    const admin = await this.isAdmin(userId),
      ticket = (
        await this.pool.query<DbRow>(
          `SELECT * FROM support_tickets WHERE id=$1 AND ($2 OR requester_user_id=$3)`,
          [id, admin, userId],
        )
      ).rows[0];
    if (!ticket) throw err("SUPPORT_TICKET_NOT_FOUND", 404);
    if (input.internalNote && !admin) throw err("INTERNAL_NOTE_FORBIDDEN", 403);
    return this.tx(async (c) => {
      const row = (
        await c.query<DbRow>(
          `INSERT INTO support_ticket_messages(ticket_id,author_user_id,body,internal_note) VALUES($1,$2,$3,$4) RETURNING *`,
          [id, userId, input.body, input.internalNote],
        )
      ).rows[0];
      if (!input.internalNote) {
        const next = admin ? "AWAITING_USER" : "AWAITING_SUPPORT";
        await c.query<DbRow>(`UPDATE support_tickets SET status=$2 WHERE id=$1`, [
          id,
          next,
        ]);
        if (admin)
          await c.query<DbRow>(
            `INSERT INTO notifications(user_id,organization_id,channel,title,body,href,status) VALUES($1,$2,'in_app','Support replied',$3,$4,'delivered')`,
            [
              ticket.requester_user_id,
              ticket.organization_id,
              `Support replied to ticket #${rowScalar(ticket.ticket_number)}.`,
              `/support/${id}`,
            ],
          );
      }
      await this.audit(
        c,
        userId,
        input.internalNote ? "SUPPORT_INTERNAL_NOTE_ADDED" : "SUPPORT_REPLY_SENT",
        "support_ticket",
        id,
        {},
      );
      return row;
    });
  }
  async updateTicket(
    userId: string,
    id: string,
    input: {
      status?: string | undefined;
      assignedToUserId?: string | undefined;
      priority?: string | undefined;
    },
  ) {
    await this.admin(userId);
    return this.tx(async (c) => {
      const before = (
        await c.query<DbRow>(`SELECT * FROM support_tickets WHERE id=$1 FOR UPDATE`, [
          id,
        ])
      ).rows[0];
      if (!before) throw err("SUPPORT_TICKET_NOT_FOUND", 404);
      const row = (
        await c.query<DbRow>(
          `UPDATE support_tickets SET status=COALESCE($2,status),assigned_to_user_id=COALESCE($3,assigned_to_user_id),priority=COALESCE($4,priority),resolved_at=CASE WHEN $2='RESOLVED' THEN now() ELSE resolved_at END,closed_at=CASE WHEN $2='CLOSED' THEN now() ELSE closed_at END WHERE id=$1 RETURNING *`,
          [
            id,
            input.status ?? null,
            input.assignedToUserId ?? null,
            input.priority ?? null,
          ],
        )
      ).rows[0];
      if (!row) throw new Error("Support ticket update returned no row");
      await this.audit(
        c,
        userId,
        "SUPPORT_TICKET_ADMIN_UPDATED",
        "support_ticket",
        id,
        {
          before: { status: before.status, assignedTo: before.assigned_to_user_id },
          after: { status: row.status, assignedTo: row.assigned_to_user_id },
        },
      );
      return row;
    });
  }
  async adminTickets(userId: string, filters: Json) {
    await this.admin(userId);
    const values: unknown[] = [],
      where: string[] = [];
    for (const [k, col] of [
      ["status", "t.status"],
      ["category", "t.category"],
      ["priority", "t.priority"],
      ["organizationId", "t.organization_id"],
    ] as const) {
      if (typeof filters[k] === "string" && filters[k]) {
        values.push(filters[k]);
        where.push(`${col}=$${values.length}`);
      }
    }
    if (typeof filters.q === "string" && filters.q) {
      values.push(`%${filters.q}%`);
      where.push(
        `(t.subject ILIKE $${values.length} OR u.email_normalized ILIKE $${values.length})`,
      );
    }
    return {
      items: (
        await this.pool.query<DbRow>(
          `SELECT t.id,t.ticket_number "ticketNumber",t.subject,t.category,t.priority,t.status,t.assigned_to_user_id "assignedToUserId",u.display_name requester,u.email,o.display_name organization,t.updated_at "updatedAt" FROM support_tickets t JOIN users u ON u.id=t.requester_user_id LEFT JOIN organizations o ON o.id=t.organization_id ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY CASE t.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END,t.updated_at DESC LIMIT 500`,
          values,
        )
      ).rows,
    };
  }
  async queue(userId: string, organizationId: string) {
    const membership = await this.member(userId, organizationId),
      own = membership.organization_type === "robot_owner" ? userId : null;
    const entries = (
      await this.pool.query<DbRow>(
        `SELECT q.id,q.priority "position",q.status,q.created_at "enteredAt",a.contributed_cents "contributedCents",a.available_cents "availableCents",a.reserved_cents "reservedCents",a.applied_cents "appliedCents",CASE WHEN q.participant_id=$1 THEN true ELSE false END "isMine",CASE WHEN q.participant_id=$1 THEN u.display_name ELSE 'Participant '||lpad(q.priority::text,6,'0') END participant FROM downpayment_queue_entries q JOIN downpayment_accounts a ON a.participant_id=q.participant_id JOIN users u ON u.id=q.participant_id WHERE q.closed_at IS NULL ORDER BY q.priority,q.id LIMIT 1000`,
        [own],
      )
    ).rows;
    let context: unknown = null;
    if (membership.organization_type === "hiring_company")
      context = (
        await this.pool.query<DbRow>(
          `SELECT c.id,c.status,coalesce(sum(f.applied_amount_cents),0) "fundedCents" FROM contracts c JOIN hiring_companies h ON h.id=c.hiring_company_id LEFT JOIN fractional_robot_ownership f ON f.contract_id=c.id WHERE h.organization_id=$1 GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 50`,
          [organizationId],
        )
      ).rows;
    if (membership.organization_type === "manufacturer")
      context = (
        await this.pool.query<DbRow>(
          `SELECT c.id,c.status,count(po.id) "purchaseOrders" FROM manufacturers m JOIN contracts c ON c.manufacturer_id=m.id LEFT JOIN purchase_orders po ON po.contract_id=c.id WHERE m.organization_id=$1 GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 50`,
          [organizationId],
        )
      ).rows;
    return {
      items: entries,
      currentPosition: entries.find((entry) => entry.isMine === true)?.position ?? null,
      role: membership.organization_type,
      authorizedContext: context,
      privacy: "Other participants are anonymized.",
    };
  }
  async adminOverview(userId: string) {
    await this.admin(userId);
    const q = async (sql: string) => (await this.pool.query<DbRow>(sql)).rows[0];
    const [users, contracts, robots, finance, operations] = await Promise.all([
      q(
        `SELECT count(*)::int total,count(*) FILTER(WHERE status='suspended')::int suspended,count(*) FILTER(WHERE email_verified_at IS NULL)::int verification_issues FROM users`,
      ),
      q(
        `SELECT count(*) FILTER(WHERE status='draft')::int draft,count(*) FILTER(WHERE status='active')::int active,count(*) FILTER(WHERE training_gate_status='REQUIRED')::int training_required,count(*) FILTER(WHERE status='completed')::int completed FROM contracts`,
      ),
      q(
        `SELECT count(*)::int registered,count(*) FILTER(WHERE activation_state='active')::int active,count(*) FILTER(WHERE current_status IN('late','offline','maintenance','repair','emergency_stop','decommissioned'))::int attention FROM robots`,
      ),
      q(
        `SELECT (SELECT count(*) FROM payment_attempts WHERE status='failed')::int failed_payments,(SELECT count(*) FROM payout_attempts WHERE status='failed')::int failed_payouts,(SELECT count(*) FROM payment_reconciliation_exceptions WHERE status='open')::int reconciliation_mismatches`,
      ),
      q(
        `SELECT (SELECT count(*) FROM support_tickets WHERE status NOT IN('RESOLVED','CLOSED'))::int open_support,(SELECT count(*) FROM background_job_runs WHERE status IN('failed','dead_letter'))::int failed_jobs,(SELECT count(*) FROM payment_processor_events WHERE processing_status='failed')::int failed_webhooks,(SELECT count(*) FROM notifications WHERE status='failed')::int notification_failures,(SELECT count(*) FROM guided_training_submissions WHERE status='AWAITING_REVIEW')::int training_review`,
      ),
    ]);
    return { users, contracts, robots, finance, operations };
  }
  async diagnostics(userId: string, resource: string) {
    await this.admin(userId);
    const map: Record<string, string> = {
      users: `SELECT u.id,u.display_name,u.email,u.status,u.email_verified_at,count(m.organization_id)::int memberships FROM users u LEFT JOIN organization_memberships m ON m.user_id=u.id GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500`,
      organizations: `SELECT o.id,o.display_name,o.organization_type,o.status,count(m.user_id)::int members FROM organizations o LEFT JOIN organization_memberships m ON m.organization_id=o.id GROUP BY o.id ORDER BY o.created_at DESC LIMIT 500`,
      contracts: `SELECT c.*,h.organization_id company_organization_id,m.organization_id manufacturer_organization_id FROM contracts c JOIN hiring_companies h ON h.id=c.hiring_company_id JOIN manufacturers m ON m.id=c.manufacturer_id ORDER BY c.updated_at DESC LIMIT 500`,
      "purchase-orders": `SELECT po.*,c.training_gate_status FROM purchase_orders po JOIN contracts c ON c.id=po.contract_id ORDER BY po.created_at DESC LIMIT 500`,
      queue: `SELECT q.priority,q.status,q.participant_id,a.contributed_cents,a.available_cents,a.reserved_cents,a.applied_cents,a.refunded_cents FROM downpayment_queue_entries q JOIN downpayment_accounts a ON a.participant_id=q.participant_id WHERE q.closed_at IS NULL ORDER BY q.priority`,
      fleet: `SELECT r.id,r.manufacturer_serial_number,r.activation_state,r.current_status,r.last_heartbeat_at,r.manufacturer_id,r.current_company_id FROM robots r ORDER BY r.last_heartbeat_at NULLS FIRST LIMIT 1000`,
      heartbeat: `SELECT r.manufacturer_serial_number,r.current_status,r.last_heartbeat_at,h.sequence_number,h.validation_status,h.rejection_reason,h.received_at FROM robots r LEFT JOIN LATERAL(SELECT * FROM robot_heartbeat_messages x WHERE x.robot_id=r.id ORDER BY x.received_at DESC LIMIT 1)h ON true ORDER BY r.last_heartbeat_at NULLS FIRST LIMIT 1000`,
      finance: `SELECT id,attempt_number,status,amount_minor_units,processor_payment_intent_id,failure_code,created_at FROM payment_attempts ORDER BY created_at DESC LIMIT 500`,
      webhooks: `SELECT id,provider_event_id,event_type,processing_status,retry_count,last_error,received_at,processed_at FROM payment_processor_events ORDER BY received_at DESC LIMIT 500`,
      notifications: `SELECT id,notification_type,user_id,channel,status,delivery_attempts,last_error,created_at FROM notifications ORDER BY created_at DESC LIMIT 500`,
      storage: `SELECT bucket,classification,status,malware_scan_status,count(*)::int files,coalesce(sum(size_bytes),0)::bigint bytes FROM stored_objects GROUP BY bucket,classification,status,malware_scan_status`,
      training: `SELECT r.id,r.company_organization_id,r.manufacturer_id,r.robot_model_id,r.required_tier,r.status,count(s.id)::int submissions FROM guided_training_requirements r LEFT JOIN guided_training_submissions s ON s.requirement_id=r.id GROUP BY r.id ORDER BY r.updated_at DESC`,
      messaging: `SELECT c.id,c.conversation_type,c.subject,c.updated_at,count(DISTINCT p.user_id)::int participants,count(DISTINCT a.id)::int attachments FROM conversations c LEFT JOIN conversation_participants p ON p.conversation_id=c.id AND p.left_at IS NULL LEFT JOIN message_attachments a ON a.conversation_id=c.id GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 500`,
      audit: `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1000`,
      health: `SELECT current_database() database,current_setting('server_version') database_version,(SELECT count(*) FROM background_job_runs WHERE status IN('failed','dead_letter'))::int failed_jobs,(SELECT count(*) FROM payment_processor_events WHERE processing_status='failed')::int failed_webhooks,(SELECT count(*) FROM notifications WHERE status='failed')::int failed_notifications,(SELECT count(*) FROM robot_heartbeat_messages WHERE validation_status<>'accepted' AND received_at>now()-interval '1 day')::int heartbeat_anomalies`,
    };
    const sql = map[resource];
    if (!sql) throw err("DIAGNOSTIC_RESOURCE_UNKNOWN", 404);
    return { items: (await this.pool.query<DbRow>(sql)).rows };
  }
  async file(userId: string, context: string, contextId: string, attachmentId: string) {
    let row;
    if (context === "support") {
      const admin = await this.isAdmin(userId);
      row = (
        await this.pool.query<DbRow>(
          `SELECT o.* FROM support_ticket_attachments a JOIN support_tickets t ON t.id=a.ticket_id JOIN stored_objects o ON o.id=a.object_id WHERE a.id=$1 AND a.ticket_id=$2 AND ($3 OR t.requester_user_id=$4)`,
          [attachmentId, contextId, admin, userId],
        )
      ).rows[0];
    } else {
      row = (
        await this.pool.query<DbRow>(
          `SELECT o.* FROM message_attachments a JOIN conversation_participants p ON p.conversation_id=a.conversation_id AND p.user_id=$3 AND p.left_at IS NULL JOIN stored_objects o ON o.id=a.object_id WHERE a.id=$1 AND a.conversation_id=$2`,
          [attachmentId, contextId, userId],
        )
      ).rows[0];
    }
    if (!row || row.status !== "available" || row.malware_scan_status !== "clean")
      throw err("SECURE_FILE_NOT_AVAILABLE", 404);
    await this.pool.query<DbRow>(
      `INSERT INTO secure_file_access_log(object_id,accessor_user_id,access_context,context_id) VALUES($1,$2,$3,$4)`,
      [row.id, userId, context === "support" ? "SUPPORT" : "MESSAGE", contextId],
    );
    return {
      filename: row.filename,
      url: await this.storage.createDownloadUrl(rowScalar(row.object_key)),
      expiresInSeconds: 300,
    };
  }
  async linkMessageAttachments(
    c: PoolClient,
    userId: string,
    conversationId: string,
    messageId: string,
    objectIds: string[],
  ) {
    const org = (
      await c.query<DbRow>(
        `SELECT organization_id FROM stored_objects WHERE id=ANY($1::uuid[]) LIMIT 1`,
        [objectIds],
      )
    ).rows[0]?.organization_id;
    for (const id of objectIds)
      await this.linkObject(
        c,
        userId,
        rowScalar(org),
        id,
        `INSERT INTO message_attachments(conversation_id,message_id,object_id,uploader_user_id) VALUES($1,$2,$3,$4)`,
        [conversationId, messageId, id, userId],
      );
  }
  private async linkObject(
    c: PoolClient,
    userId: string,
    organizationId: string,
    objectId: string,
    sql: string,
    args: unknown[],
  ) {
    const o = (
      await c.query<DbRow>(
        `SELECT * FROM stored_objects WHERE id=$1 AND owner_user_id=$2 AND organization_id=$3`,
        [objectId, userId, organizationId],
      )
    ).rows[0];
    if (
      !o ||
      Number(o.size_bytes) > 25_000_000 ||
      !safeTypes.has(rowScalar(o.content_type)) ||
      ["infected", "failed"].includes(rowScalar(o.malware_scan_status))
    )
      throw err("ATTACHMENT_NOT_ALLOWED", 409);
    await c.query<DbRow>(sql, args);
  }
  private async isAdmin(userId: string) {
    const r = await this.pool.query<DbRow>(
      `SELECT 1 FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.status='active' AND o.organization_type='platform' AND m.role IN('super_admin','platform_admin','admin','support_admin','finance_admin','operations_admin')`,
      [userId],
    );
    return !!r.rowCount;
  }
  private async audit(
    c: PoolClient,
    userId: string,
    action: string,
    type: string,
    id: string,
    metadata: Json,
  ) {
    await c.query<DbRow>(
      `INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,$4,$5)`,
      [userId, action, type, id, JSON.stringify(metadata)],
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
function redact(input: Json) {
  const blocked =
      /password|secret|token|cvv|card|bank|stripe.*key|service.*role|credential/i,
    out: Json = {};
  for (const [k, v] of Object.entries(input))
    out[k] = blocked.test(k)
      ? "[REDACTED]"
      : typeof v === "string"
        ? v.replace(/\b\d{12,19}\b/g, "[REDACTED]")
        : v;
  return out;
}
