import { describe, expect, it, vi } from "vitest";
import { PostgresActivityService } from "./postgres-activity-service.js";

describe("PostgresActivityService", () => {
  it("rejects users without an active organization membership", async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }) };
    const service = new PostgresActivityService(pool as never);
    await expect(service.listForOrganization(
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      { limit: 50, sort: "desc" },
    )).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
  });

  it("returns authorized entries with stable cursor pagination", async () => {
    const occurredAt = new Date("2026-08-04T12:00:00.000Z");
    const pool = { query: vi.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ ok: 1 }] })
      .mockResolvedValueOnce({ rowCount: 2, rows: [
        { id: "e1", occurred_at: occurredAt, event_type: "contract.accepted", category: "contract", source: "user_action", summary: "Contract accepted", details: null, actor_name: "A User", organization_name: "Acme", status: "accepted", severity: "info", related_objects: [], attachments: [] },
        { id: "e0", occurred_at: new Date("2026-08-04T11:00:00.000Z"), event_type: "contract.created", category: "contract", source: "user_action", summary: "Contract created", details: null, actor_name: "A User", organization_name: "Acme", status: "created", severity: "info", related_objects: [], attachments: [] },
      ] }) };
    const service = new PostgresActivityService(pool as never);
    const result = await service.listForOrganization("u1", "o1", { category: "contract", limit: 1, sort: "desc" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: "e1", occurredAt: occurredAt.toISOString(), category: "contract" });
    expect(result.page).toEqual({ limit: 1, hasMore: true, nextCursor: occurredAt.toISOString() });
    expect(pool.query).toHaveBeenLastCalledWith(expect.stringContaining("e.category=$2"), ["o1", "contract", 2]);
  });

  it("requires an active platform role for the cross-organization endpoint", async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }) };
    const service = new PostgresActivityService(pool as never);
    await expect(service.listForPlatform("u1", { limit: 50, sort: "desc" }))
      .rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
  });
});
