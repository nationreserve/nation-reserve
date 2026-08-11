import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Prompt 005 migrations", () => {
  it("defines versioned terms, schedules, approval history, and assignment history", async () => {
    const sql = await readFile(resolve("migrations/0004_contract_scheduling_allocation.sql"), "utf8");
    expect(sql).toContain("contract_version_robot_models");
    expect(sql).toContain("contract_approval_events");
    expect(sql).toContain("contract_schedule_rules");
    expect(sql).toContain("contract_schedule_exceptions");
    expect(sql).toContain("assignment_state_history");
    const core = await readFile(resolve("migrations/0001_core_domain.sql"), "utf8");
    expect(core).toContain("replacement_for_assignment_id");
  });

  it("allows approval workflow updates but protects accepted history", async () => {
    const sql = await readFile(resolve("migrations/0005_contract_version_mutability.sql"), "utf8");
    expect(sql).toContain("DROP TRIGGER IF EXISTS contract_versions_append_only");
    expect(sql).toContain("OLD.status IN ('approved', 'superseded')");
    expect(sql).toContain("cannot be deleted");
    expect(sql).toContain("contract_versions_history_guard");
    expect(sql).toContain("'ready','scheduled','active'");
  });
});

