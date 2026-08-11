import { describe, expect, it } from "vitest";
import { reportDefinitionSchema, reportRunSchema, scheduledReportSchema } from "./index.js";

describe("reporting contracts", () => {
  it("rejects an inverted authoritative report range", () => {
    const result = reportRunSchema.safeParse({ reportKey: "invoice_detail", from: "2026-08-02", to: "2026-08-01" });
    expect(result.success).toBe(false);
  });
  it("normalizes version and timezone defaults", () => {
    expect(reportDefinitionSchema.parse({ reportKey: "owner_statement", name: "Owner statement", category: "owner" }).version).toBe(1);
    expect(scheduledReportSchema.parse({ name: "Weekly owner statement", reportKey: "owner_statement", frequency: "weekly", recipients: ["owner@example.test"], exportType: "pdf" }).timezone).toBe("UTC");
  });
});
