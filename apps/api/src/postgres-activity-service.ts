import type { Pool } from "pg";

export interface ActivityQuery {
  search?: string | undefined;
  category?: string | undefined;
  severity?: string | undefined;
  entityType?: string | undefined;
  entityId?: string | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
  cursor?: string | undefined;
  limit: number;
  sort: "asc" | "desc";
}

interface ActivityRow {
  id: string; occurred_at: Date; event_type: string; category: string; source: string; aggregate_type: string; aggregate_id: string;
  summary: string; details: string | null; actor_name: string | null; organization_name: string | null;
  status: string | null; previous_status: string | null; severity: string; actor_role: string | null; metadata: Record<string,unknown>; source_system: string | null; correlation_id: string | null; related_objects: unknown[]; attachments: unknown[];
}

function forbidden(message = "Activity access is not permitted."): Error {
  return Object.assign(new Error(message), { code: "FORBIDDEN", statusCode: 403 });
}

export class PostgresActivityService {
  constructor(private readonly pool: Pool) {}

  async listForOrganization(userId: string, organizationId: string, query: ActivityQuery) {
    const access = await this.pool.query(
      `SELECT 1 FROM organization_memberships
       WHERE organization_id=$1 AND user_id=$2 AND status='active'`,
      [organizationId, userId],
    );
    if (!access.rowCount) throw forbidden();
    return this.list(userId, organizationId, query, false);
  }

  async listForPlatform(userId: string, query: ActivityQuery) {
    const access = await this.pool.query(
      `SELECT 1 FROM platform_role_assignments WHERE user_id=$1 AND status='active'`, [userId],
    );
    if (!access.rowCount) throw forbidden("Platform activity requires an active platform role.");
    return this.list(userId, undefined, query, true);
  }

  private async list(_userId: string, organizationId: string | undefined, query: ActivityQuery, platform: boolean) {
    const values: unknown[] = [];
    const where: string[] = [];
    const bind = (value: unknown) => { values.push(value); return `$${values.length}`; };
    if (organizationId) where.push(`a.organization_id=${bind(organizationId)}`);
    if (platform) where.push(`a.organization_id=(SELECT aa.organization_id FROM activity_timeline_audiences aa WHERE aa.entry_id=e.id ORDER BY aa.organization_id::text LIMIT 1)`);
    if (query.search) where.push(`e.searchable @@ websearch_to_tsquery('simple', ${bind(query.search)})`);
    if (query.category) where.push(`e.category=${bind(query.category)}`);
    if (query.severity) where.push(`e.severity=${bind(query.severity)}`);
    if (query.entityType) where.push(`e.aggregate_type=${bind(query.entityType)}`);
    if (query.entityId) where.push(`e.aggregate_id=${bind(query.entityId)}`);
    if (query.from) where.push(`e.occurred_at>=${bind(query.from)}`);
    if (query.to) where.push(`e.occurred_at<=${bind(query.to)}`);
    if (query.cursor) where.push(`e.occurred_at ${query.sort === "desc" ? "<" : ">"} ${bind(new Date(query.cursor))}`);
    const limit = bind(query.limit + 1);
    const result = await this.pool.query<ActivityRow>(`
      SELECT e.id,e.occurred_at,e.event_type,e.category,e.source,e.aggregate_type,e.aggregate_id,e.summary,e.details,e.status,e.severity,
             e.related_objects,e.attachments,e.previous_status,e.actor_role,e.metadata,e.source_system,e.correlation_id,u.display_name actor_name,o.display_name organization_name
      FROM activity_timeline_entries e
      JOIN activity_timeline_audiences a ON a.entry_id=e.id
      JOIN organizations o ON o.id=a.organization_id
      LEFT JOIN users u ON u.id=e.actor_user_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY e.occurred_at ${query.sort.toUpperCase()}, e.id ${query.sort.toUpperCase()}
      LIMIT ${limit}`, values);
    const hasMore = result.rows.length > query.limit;
    const rows = result.rows.slice(0, query.limit);
    return {
      items: rows.map(row => ({
        id: row.id, occurredAt: row.occurred_at.toISOString(), eventType: row.event_type,
        category: row.category, source: row.source, summary: row.summary,
        ...(row.details ? { details: row.details } : {}), ...(row.actor_name ? { actorName: row.actor_name } : {}),
        organizationName: row.organization_name ?? (platform ? "Restricted" : undefined),
        ...(row.status ? { status: row.status, currentStatus: row.status } : {}), ...(row.previous_status ? { previousStatus: row.previous_status } : {}), ...(row.actor_role ? { actorRole: row.actor_role } : {}), severity: row.severity,
        metadata: row.metadata, ...(row.source_system ? { sourceSystem: row.source_system } : {}), ...(row.correlation_id ? { correlationId: row.correlation_id } : {}), targetEntity: { type: row.aggregate_type, id: row.aggregate_id }, relatedObjects: row.related_objects, attachments: row.attachments,
      })),
      page: { limit: query.limit, hasMore, nextCursor: hasMore ? rows.at(-1)?.occurred_at.toISOString() : undefined },
    };
  }
}








