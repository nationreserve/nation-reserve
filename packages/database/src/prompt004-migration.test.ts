import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Prompt 004 migration", () => {
  it("contains environment, identity, ownership, and replay protections", async () => {
    const sql = await readFile(resolve("migrations/0003_manufacturer_robot_activation.sql"), "utf8");
    expect(sql).toContain("manufacturer_api_credentials");
    expect(sql).toContain("robot_registration_requests");
    expect(sql).toContain("robot_transfer_codes");
    expect(sql).toContain("robot_ownership_claims_current_unique");
    expect(sql).toContain("robot_activation_sessions_active_unique");
    expect(sql).toContain("nonce text NOT NULL UNIQUE");
    expect(sql).toContain("approved_robot_model_revisions_append_only");
  });
});

