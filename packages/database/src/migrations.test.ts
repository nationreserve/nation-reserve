import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("core domain migration", () => {
  it("contains durability and concurrency controls", async () => {
    const sql = await readFile(resolve("migrations/0001_core_domain.sql"), "utf8");
    expect(sql).toContain("EXCLUDE USING gist");
    expect(sql).toContain("contract_versions_append_only");
    expect(sql).toContain("audit_logs_append_only");
    expect(sql).toContain("CREATE VIEW contract_fulfillment_status");
    expect(sql).toContain("outbox_events");
  });
});

