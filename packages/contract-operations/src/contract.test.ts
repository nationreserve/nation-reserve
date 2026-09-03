import { describe, expect, it } from "vitest";
import { createContractCommandSchema } from "./schemas.js";
describe("Prompt 005 contract rules", () => {
  it("requires at least one requested model", () => {
    const result = createContractCommandSchema.safeParse({
      manufacturerId: crypto.randomUUID(),
      hiringCompanyId: crypto.randomUUID(),
      facilityId: crypto.randomUUID(),
      contractType: "fixed_term",
      startAt: new Date(),
      estimatedContractValueCents: 100000,
      models: [],
    });
    expect(result.success).toBe(false);
  });
  it("accepts recurring schedules without creating payable time", () => {
    const result = createContractCommandSchema.safeParse({
      manufacturerId: crypto.randomUUID(),
      hiringCompanyId: crypto.randomUUID(),
      facilityId: crypto.randomUUID(),
      contractType: "fixed_term",
      startAt: new Date(),
      estimatedContractValueCents: 100000,
      models: [{ modelId: crypto.randomUUID(), quantity: 2 }],
      scheduleRules: [
        {
          timezone: "America/New_York",
          dayOfWeek: 1,
          localStartTime: "09:00",
          localEndTime: "17:00",
          recurrenceStart: new Date(),
        },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("payableTime");
  });
});
