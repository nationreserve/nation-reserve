/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

type Context = {
  type: "contract" | "purchase_order" | "robot_model" | "training_project" | "inquiry";
  id: string;
};
type ConversationInput = {
  manufacturerId: string;
  subject: string;
  message: string;
  contexts: Context[];
};

function failure(code: string, statusCode: number) {
  return Object.assign(new Error(code), { code, statusCode });
}

export class PostgresMarketplaceService {
  constructor(private readonly pool: Pool) {}

  async manufacturers(
    userId: string,
    input: { search?: string | undefined; limit: number },
  ) {
    await this.assertCompanyMember(userId);
    const values: unknown[] = [];
    const where = [
      "m.approval_status IN ('sandbox_approved','production_approved')",
      "o.status='active'",
    ];
    if (input.search) {
      values.push(`%${input.search}%`);
      where.push(
        `(o.display_name ILIKE $${values.length} OR a.business_description ILIKE $${values.length} OR EXISTS(SELECT 1 FROM robot_models rm WHERE rm.manufacturer_id=m.id AND rm.model_name ILIKE $${values.length}))`,
      );
    }
    values.push(input.limit);
    const result = await this.pool.query(
      `SELECT m.id,o.display_name "displayName",a.business_description "description",a.website_url "websiteUrl",a.primary_country_code "countryCode",a.robot_categories "robotCategories",m.integration_status "integrationStatus",COUNT(rm.id)::integer "modelCount" FROM manufacturers m JOIN organizations o ON o.id=m.organization_id LEFT JOIN manufacturer_applications a ON a.manufacturer_id=m.id AND a.is_current LEFT JOIN robot_models rm ON rm.manufacturer_id=m.id AND rm.approval_status IN('sandbox_approved','production_approved') WHERE ${where.join(" AND ")} GROUP BY m.id,o.display_name,a.business_description,a.website_url,a.primary_country_code,a.robot_categories,m.integration_status ORDER BY o.display_name LIMIT $${values.length}`,
      values,
    );
    return { items: result.rows };
  }

  async manufacturer(userId: string, manufacturerId: string) {
    await this.assertCompanyMember(userId);
    const result = await this.pool.query(
      `SELECT m.id,o.display_name "displayName",a.business_description "description",a.website_url "websiteUrl",a.primary_country_code "countryCode",a.robot_categories "robotCategories",m.integration_status "integrationStatus",COALESCE(jsonb_agg(jsonb_build_object('id',rm.id,'name',rm.model_name,'code',rm.model_code,'version',rm.model_version,'description',rm.description,'category',rm.robot_category,'capabilities',rm.capabilities,'heartbeatCapabilities',rm.heartbeat_capabilities)) FILTER(WHERE rm.id IS NOT NULL),'[]') "models" FROM manufacturers m JOIN organizations o ON o.id=m.organization_id LEFT JOIN manufacturer_applications a ON a.manufacturer_id=m.id AND a.is_current LEFT JOIN robot_models rm ON rm.manufacturer_id=m.id AND rm.approval_status IN('sandbox_approved','production_approved') WHERE m.id=$1 AND m.approval_status IN('sandbox_approved','production_approved') AND o.status='active' GROUP BY m.id,o.display_name,a.business_description,a.website_url,a.primary_country_code,a.robot_categories,m.integration_status`,
      [manufacturerId],
    );
    if (!result.rowCount) throw failure("MANUFACTURER_NOT_FOUND", 404);
    return result.rows[0];
  }

  async conversations(userId: string, organizationId: string) {
    await this.assertOrganizationMember(userId, organizationId);
    const result = await this.pool.query(
      `SELECT c.id,c.subject,c.conversation_type "type",c.updated_at "updatedAt",lm.body "lastMessage",lm.created_at "lastMessageAt",CASE WHEN cp.last_read_message_id IS NULL THEN COUNT(m.id)::integer ELSE COUNT(m.id) FILTER(WHERE m.created_at>lr.created_at)::integer END "unreadCount" FROM conversations c JOIN conversation_audience_organizations ao ON ao.conversation_id=c.id AND ao.organization_id=$2 JOIN conversation_participants cp ON cp.conversation_id=c.id AND cp.user_id=$1 AND cp.left_at IS NULL LEFT JOIN messages lm ON lm.id=(SELECT id FROM messages WHERE conversation_id=c.id AND deleted_at IS NULL ORDER BY created_at DESC,id DESC LIMIT 1) LEFT JOIN messages lr ON lr.id=cp.last_read_message_id LEFT JOIN messages m ON m.conversation_id=c.id AND m.deleted_at IS NULL GROUP BY c.id,c.subject,c.conversation_type,c.updated_at,lm.body,lm.created_at,cp.last_read_message_id,lr.created_at ORDER BY c.updated_at DESC`,
      [userId, organizationId],
    );
    return { items: result.rows };
  }

  async createConversation(
    userId: string,
    organizationId: string,
    input: ConversationInput,
    key: string,
  ) {
    await this.assertOrganizationMember(userId, organizationId, "hiring_company");
    return this.tx(async (client) => {
      const prior = await this.idempotent(
        client,
        `conversation.create:${organizationId}`,
        key,
        input,
      );
      if (prior) return prior;
      const manufacturer = (
        await client.query(
          `SELECT m.organization_id FROM manufacturers m JOIN organizations o ON o.id=m.organization_id WHERE m.id=$1 AND m.approval_status IN('sandbox_approved','production_approved') AND o.status='active'`,
          [input.manufacturerId],
        )
      ).rows[0];
      if (!manufacturer) throw failure("MANUFACTURER_NOT_FOUND", 404);
      const id = randomUUID();
      await client.query(
        `INSERT INTO conversations(id,organization_id,conversation_type,subject,created_by_user_id) VALUES($1,$2,'direct',$3,$4)`,
        [id, organizationId, input.subject, userId],
      );
      await client.query(
        `INSERT INTO conversation_audience_organizations(conversation_id,organization_id) VALUES($1,$2),($1,$3)`,
        [id, organizationId, manufacturer.organization_id],
      );
      await client.query(
        `INSERT INTO conversation_participants(conversation_id,user_id,role) SELECT $1,$2,'owner' UNION ALL SELECT $1,om.user_id,'member' FROM organization_memberships om WHERE om.organization_id=$3 AND om.status='active' AND om.role IN('administrator','manager') ON CONFLICT DO NOTHING`,
        [id, userId, manufacturer.organization_id],
      );
      for (const item of input.contexts)
        await client.query(
          `INSERT INTO conversation_business_contexts(conversation_id,context_type,context_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,
          [id, item.type, item.id],
        );
      const message = await this.insertMessage(client, id, userId, input.message);
      await this.notifyRecipients(
        client,
        id,
        userId,
        "New company inquiry",
        input.subject,
      );
      const response = { id, subject: input.subject, message };
      await this.complete(
        client,
        `conversation.create:${organizationId}`,
        key,
        response,
      );
      return response;
    });
  }

  async conversation(userId: string, organizationId: string, conversationId: string) {
    await this.assertConversationAccess(userId, organizationId, conversationId);
    const [conversation, messages, contexts] = await Promise.all([
      this.pool.query(
        `SELECT id,subject,conversation_type "type",created_at "createdAt",updated_at "updatedAt" FROM conversations WHERE id=$1`,
        [conversationId],
      ),
      this.pool.query(
        `SELECT m.id,m.body,m.created_at "createdAt",m.sender_user_id "senderUserId",u.display_name "senderName",m.sender_user_id=$2 "sentByMe" FROM messages m LEFT JOIN users u ON u.id=m.sender_user_id WHERE m.conversation_id=$1 AND m.deleted_at IS NULL ORDER BY m.created_at,m.id`,
        [conversationId, userId],
      ),
      this.pool.query(
        `SELECT context_type "type",context_id "id" FROM conversation_business_contexts WHERE conversation_id=$1 ORDER BY created_at`,
        [conversationId],
      ),
    ]);
    return {
      ...conversation.rows[0],
      messages: messages.rows,
      contexts: contexts.rows,
    };
  }

  async send(
    userId: string,
    organizationId: string,
    conversationId: string,
    input: { message: string },
    key: string,
  ) {
    await this.assertConversationAccess(userId, organizationId, conversationId);
    return this.tx(async (client) => {
      const prior = await this.idempotent(
        client,
        `message.send:${conversationId}`,
        key,
        input,
      );
      if (prior) return prior;
      const message = await this.insertMessage(
        client,
        conversationId,
        userId,
        input.message,
      );
      await client.query(`UPDATE conversations SET updated_at=now() WHERE id=$1`, [
        conversationId,
      ]);
      await this.notifyRecipients(
        client,
        conversationId,
        userId,
        "New RoboWorkPool message",
        input.message.slice(0, 160),
      );
      await this.complete(client, `message.send:${conversationId}`, key, message);
      return message;
    });
  }

  async markRead(userId: string, organizationId: string, conversationId: string) {
    await this.assertConversationAccess(userId, organizationId, conversationId);
    const result = await this.pool.query(
      `UPDATE conversation_participants SET last_read_message_id=(SELECT id FROM messages WHERE conversation_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC,id DESC LIMIT 1) WHERE conversation_id=$1 AND user_id=$2 RETURNING last_read_message_id "lastReadMessageId"`,
      [conversationId, userId],
    );
    await this.pool.query(
      `UPDATE notifications SET status='read',read_at=COALESCE(read_at,now()) WHERE user_id=$1 AND href=$2 AND status<>'read'`,
      [userId, `/conversations/${conversationId}`],
    );
    return result.rows[0] ?? { lastReadMessageId: null };
  }

  private async assertCompanyMember(userId: string) {
    const result = await this.pool.query(
      `SELECT 1 FROM organization_memberships om JOIN organizations o ON o.id=om.organization_id WHERE om.user_id=$1 AND om.status='active' AND o.organization_type='hiring_company' AND o.status='active' LIMIT 1`,
      [userId],
    );
    if (!result.rowCount) throw failure("PERMISSION_DENIED", 403);
  }
  private async assertOrganizationMember(
    userId: string,
    organizationId: string,
    expected?: string,
  ) {
    const result = await this.pool.query(
      `SELECT o.organization_type FROM organization_memberships om JOIN organizations o ON o.id=om.organization_id WHERE om.user_id=$1 AND om.organization_id=$2 AND om.status='active' AND o.status='active'`,
      [userId, organizationId],
    );
    if (!result.rowCount || (expected && result.rows[0].organization_type !== expected))
      throw failure("PERMISSION_DENIED", 403);
  }
  private async assertConversationAccess(
    userId: string,
    organizationId: string,
    conversationId: string,
  ) {
    await this.assertOrganizationMember(userId, organizationId);
    const result = await this.pool.query(
      `SELECT 1 FROM conversation_participants cp JOIN conversation_audience_organizations ao ON ao.conversation_id=cp.conversation_id AND ao.organization_id=$2 WHERE cp.conversation_id=$1 AND cp.user_id=$3 AND cp.left_at IS NULL`,
      [conversationId, organizationId, userId],
    );
    if (!result.rowCount) throw failure("CONVERSATION_NOT_FOUND", 404);
  }
  private async insertMessage(
    client: PoolClient,
    conversationId: string,
    userId: string,
    body: string,
  ) {
    const result = await client.query(
      `INSERT INTO messages(id,conversation_id,sender_user_id,body) VALUES($1,$2,$3,$4) RETURNING id,body,created_at "createdAt",sender_user_id "senderUserId"`,
      [randomUUID(), conversationId, userId, body],
    );
    return result.rows[0];
  }
  private async notifyRecipients(
    client: PoolClient,
    conversationId: string,
    senderId: string,
    title: string,
    body: string,
  ) {
    await client.query(
      `INSERT INTO notifications(user_id,organization_id,channel,title,body,href,status) SELECT cp.user_id,om.organization_id,'in_app',$3,$4,$5,'delivered' FROM conversation_participants cp LEFT JOIN organization_memberships om ON om.user_id=cp.user_id AND om.status='active' JOIN conversation_audience_organizations ao ON ao.conversation_id=cp.conversation_id AND ao.organization_id=om.organization_id WHERE cp.conversation_id=$1 AND cp.user_id<>$2 AND cp.left_at IS NULL`,
      [conversationId, senderId, title, body, `/conversations/${conversationId}`],
    );
  }
  private async idempotent(
    client: PoolClient,
    scope: string,
    key: string,
    input: unknown,
  ) {
    const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const inserted = await client.query(
      `INSERT INTO idempotency_records(scope,idempotency_key,request_hash,expires_at) VALUES($1,$2,$3,now()+interval '24 hours') ON CONFLICT DO NOTHING RETURNING id`,
      [scope, key, hash],
    );
    if (inserted.rowCount) return undefined;
    const old = (
      await client.query(
        `SELECT request_hash,status,response_body FROM idempotency_records WHERE scope=$1 AND idempotency_key=$2 FOR UPDATE`,
        [scope, key],
      )
    ).rows[0];
    if (old?.request_hash !== hash) throw failure("IDEMPOTENCY_CONFLICT", 409);
    if (old.status === "completed") return old.response_body;
    throw failure("IDEMPOTENCY_IN_PROGRESS", 409);
  }
  private complete(client: PoolClient, scope: string, key: string, response: unknown) {
    return client.query(
      `UPDATE idempotency_records SET status='completed',response_status=200,response_body=$3 WHERE scope=$1 AND idempotency_key=$2`,
      [scope, key, JSON.stringify(response)],
    );
  }
  private async tx<T>(work: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
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
}
