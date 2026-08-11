import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@nation-reserve/contracts";
import type { OutboxWorker } from "@nation-reserve/domain";
import type { Pool } from "pg";

export type EventPublisher = (event: DomainEvent<Record<string, unknown>>) => Promise<void>;

export class PostgresOutboxWorker implements OutboxWorker {
  readonly #workerId = randomUUID();

  constructor(
    private readonly pool: Pool,
    private readonly publish: EventPublisher,
  ) {}

  async runBatch(limit: number): Promise<number> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
      throw new RangeError("Outbox batch limit must be between 1 and 1000.");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{
        id: string; event_type: string; aggregate_type: string; aggregate_id: string;
        occurred_at: Date; payload: Record<string, unknown>; metadata: Record<string, unknown>;
      }>(`
        SELECT id, event_type, aggregate_type, aggregate_id, occurred_at, payload, metadata
        FROM outbox_events
        WHERE processed_at IS NULL AND available_at <= now()
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT $1
      `, [limit]);
      for (const row of result.rows) {
        await client.query(
          "UPDATE outbox_events SET locked_at = now(), locked_by = $2, attempts = attempts + 1 WHERE id = $1",
          [row.id, this.#workerId],
        );
        try {
          await this.publish({
            id: row.id,
            type: row.event_type,
            aggregateType: row.aggregate_type,
            aggregateId: row.aggregate_id,
            occurredAt: row.occurred_at.toISOString(),
            payload: row.payload,
            metadata: { schemaVersion: typeof row.metadata.schemaVersion === "number" ? row.metadata.schemaVersion : 1, ...row.metadata },
          });
          await client.query(
            "UPDATE outbox_events SET processed_at = now(), locked_at = NULL, locked_by = NULL WHERE id = $1",
            [row.id],
          );
        } catch (error) {
          await client.query(`
            UPDATE outbox_events SET
              last_error = $2, locked_at = NULL, locked_by = NULL,
              available_at = now() + make_interval(secs => LEAST(3600, power(2, attempts)::int))
            WHERE id = $1
          `, [row.id, error instanceof Error ? error.message : String(error)]);
        }
      }
      await client.query("COMMIT");
      return result.rowCount ?? 0;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}


