import { z } from "zod";

import { organizationIdSchema, userIdSchema, uuidSchema } from "./identifiers.js";

export const auditRecordInputSchema = z.object({
  actorUserId: userIdSchema.optional(),
  actorOrganizationId: organizationIdSchema.optional(),
  action: z.string().min(1).max(160),
  resourceType: z.string().min(1).max(100),
  resourceId: uuidSchema,
  previousState: z.record(z.string(), z.unknown()).nullable().optional(),
  newState: z.record(z.string(), z.unknown()).nullable().optional(),
  reason: z.string().max(2_000).optional(),
  source: z.string().min(1).max(100),
  correlationId: uuidSchema.optional(),
  requestId: z.string().max(128).optional(),
  ipAddress: z.string().max(64).optional(),
  userAgent: z.string().max(512).optional(),
});

export type AuditRecordInput = z.infer<typeof auditRecordInputSchema>;
