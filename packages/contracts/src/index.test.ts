import { describe, expect, it } from "vitest";

import { domainEventSchema, userIdSchema } from "./index.js";

describe("shared contracts", () => {
  it("validates branded UUID identifiers at runtime", () => {
    expect(() => userIdSchema.parse("not-a-uuid")).toThrow();
    expect(
      userIdSchema.parse("01900000-0000-7000-8000-000000000001"),
    ).toBe("01900000-0000-7000-8000-000000000001");
  });

  it("validates the required event envelope", () => {
    expect(
      domainEventSchema.parse({
        id: "01900000-0000-7000-8000-000000000001",
        type: "robot.registered",
        occurredAt: "2026-07-27T12:00:00.000Z",
        aggregateType: "robot",
        aggregateId: "01900000-0000-7000-8000-000000000002",
        payload: {},
        metadata: { schemaVersion: 1 },
      }).type,
    ).toBe("robot.registered");
  });
});
