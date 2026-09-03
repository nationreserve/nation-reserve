import { z } from "zod";
const uuid = z.string().uuid();
export const scheduleRuleSchema = z.object({
  timezone: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  localStartTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  localEndTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  recurrenceStart: z.coerce.date(),
  recurrenceEnd: z.coerce.date().optional(),
});
export const scheduleExceptionSchema = z.object({
  date: z.coerce.date(),
  type: z.enum(["holiday", "blackout", "override"]),
  localStartTime: z.string().optional(),
  localEndTime: z.string().optional(),
  reason: z.string().min(1),
});
export const createContractCommandSchema = z.object({
  manufacturerId: uuid,
  hiringCompanyId: uuid,
  facilityId: uuid,
  departmentId: uuid.optional(),
  contractType: z.enum(["ongoing", "fixed_term", "temporary", "pilot"]),
  priority: z.enum(["normal", "high", "critical"]).default("normal"),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  estimatedContractValueCents: z.number().int().positive(),
  renewalMode: z.enum(["none", "manual", "automatic"]).default("none"),
  models: z
    .array(
      z.object({
        modelId: uuid,
        modelRevisionId: uuid.optional(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  operatingWindows: z.record(z.string(), z.unknown()).default({}),
  requiredCapabilities: z.record(z.string(), z.unknown()).default({}),
  locationRequirements: z.record(z.string(), z.unknown()).default({}),
  specialTerms: z.record(z.string(), z.unknown()).default({}),
  scheduleRules: z.array(scheduleRuleSchema).default([]),
  scheduleExceptions: z.array(scheduleExceptionSchema).default([]),
});
export const reviseContractCommandSchema = createContractCommandSchema
  .omit({
    manufacturerId: true,
    hiringCompanyId: true,
    facilityId: true,
    departmentId: true,
  })
  .extend({ changeReason: z.string().min(3) });
export const allocationCommandSchema = z.object({
  contractVersionId: uuid,
  robotIds: z.array(uuid).min(1),
  scheduledStartAt: z.coerce.date(),
  scheduledEndAt: z.coerce.date(),
});
export type CreateContractCommand = z.infer<typeof createContractCommandSchema>;
export type ReviseContractCommand = z.infer<typeof reviseContractCommandSchema>;
export type AllocationCommand = z.infer<typeof allocationCommandSchema>;
