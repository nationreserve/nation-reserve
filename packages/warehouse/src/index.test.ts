import { describe, expect, it } from "vitest";
import { refreshStatement, reportingViews } from "./index.js";
describe("warehouse projections", () => {
  it("uses only registered materialized-view identifiers", () => {
    expect(reportingViews).toContain("financial_daily_summary");
    expect(refreshStatement("heartbeat_daily_summary")).toBe("REFRESH MATERIALIZED VIEW CONCURRENTLY heartbeat_daily_summary");
    expect(refreshStatement("owner_daily_summary", false)).toBe("REFRESH MATERIALIZED VIEW owner_daily_summary");
  });
});
