import { describe, expect, it } from "vitest";

import {
  assertOptimisticVersion,
  assertRoleCompatible,
  DomainError,
  isRoleCompatible,
  normalizeRobotSerial,
} from "./index.js";

describe("domain invariants", () => {
  it("normalizes visual serial separators and preserves leading zeroes", () => {
    expect(normalizeRobotSerial(" nr-0001 ab ")).toBe("NR0001AB");
  });

  it("rejects empty or unsupported serial values", () => {
    expect(() => normalizeRobotSerial(" -- ")).toThrow(DomainError);
    expect(() => normalizeRobotSerial("NR/1")).toThrow(DomainError);
  });

  it("validates roles against organization types", () => {
    expect(isRoleCompatible("manufacturer", "engineer")).toBe(true);
    expect(isRoleCompatible("hiring_company", "engineer")).toBe(false);
    expect(() => assertRoleCompatible("robot_owner", "super_admin")).toThrow(
      DomainError,
    );
  });

  it("rejects stale optimistic versions", () => {
    expect(() =>
      assertOptimisticVersion(
        4,
        5,
        "01900000-0000-7000-8000-000000000001" as never,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "OPTIMISTIC_LOCK_CONFLICT" }),
    );
  });
});
