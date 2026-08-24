import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("initial financial configuration migration", () => {
  it("installs and validates the canonical active version 1 rules", async () => {
    const sql = await readFile(
      resolve("migrations/0041_initial_platform_financial_configuration.sql"),
      "utf8",
    );
    expect(sql).toContain("INSERT INTO financial_configuration_versions");
    expect(sql).toContain("base_rate_minor_units_per_hour = 500");
    expect(sql).toContain("owner_platform_fee_basis_points = 1500");
    expect(sql).toContain("company_platform_fee_basis_points = 1500");
    expect(sql).toContain("RAISE EXCEPTION");
  });
});
