import { describe, expect, it } from "vitest";
import { navigationRegistry } from "./index.js";

const route = (type: string, label: string) =>
  navigationRegistry.find(
    (item) => item.organizationTypes.includes(type as never) && item.label === label,
  )?.route;

describe("canonical portal navigation", () => {
  it("never generates obsolete robot-owner or hiring-company route prefixes", () => {
    expect(
      navigationRegistry.some(
        (item) =>
          item.route.startsWith("/robot-owner/") ||
          item.route.startsWith("/hiring-company/"),
      ),
    ).toBe(false);
  });
  it("links owner and company nested workflows to implemented routes", () => {
    expect(route("robot_owner", "Overview")).toBe("/owner");
    expect(route("robot_owner", "Statements")).toBe("/owner/earnings/statements");
    expect(route("hiring_company", "Manufacturers")).toBe("/company/manufacturers");
    expect(route("hiring_company", "Conversations")).toBe("/company/conversations");
    expect(route("manufacturer", "Conversations")).toBe("/manufacturer/conversations");
  });
});
