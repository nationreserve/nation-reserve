import { z } from "zod";

import { organizationIdSchema, userIdSchema, uuidSchema } from "./identifiers.js";

export const domainEventMetadataSchema = z.object({
  correlationId: uuidSchema.optional(),
  causationId: uuidSchema.optional(),
  actorUserId: userIdSchema.optional(),
  actorOrganizationId: organizationIdSchema.optional(),
  schemaVersion: z.number().int().positive(),
});

export const domainEventSchema = z.object({
  id: uuidSchema,
  type: z.string().min(1).max(160),
  occurredAt: z.string().datetime({ offset: true }),
  aggregateType: z.string().min(1).max(100),
  aggregateId: uuidSchema,
  payload: z.record(z.string(), z.unknown()),
  metadata: domainEventMetadataSchema,
});

export type DomainEvent<TPayload extends Record<string, unknown>> = Omit<
  z.infer<typeof domainEventSchema>,
  "payload"
> & {
  payload: TPayload;
};

export function validateDomainEvent<TPayload extends Record<string, unknown>>(
  event: DomainEvent<TPayload>,
): DomainEvent<TPayload> {
  return domainEventSchema.parse(event) as DomainEvent<TPayload>;
}
