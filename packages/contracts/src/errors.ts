import { z } from "zod";

export const domainErrorCodes = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_STATE_TRANSITION",
  "ROBOT_SERIAL_CONFLICT",
  "ROBOT_OWNERSHIP_LIMIT_REACHED",
  "ROBOT_OWNERSHIP_OVERLAP",
  "ASSIGNMENT_TIME_CONFLICT",
  "ORGANIZATION_TYPE_MISMATCH",
  "FACILITY_COMPANY_MISMATCH",
  "DEPARTMENT_FACILITY_MISMATCH",
  "CONTRACT_NOT_ASSIGNABLE",
  "FINANCIAL_CONFIGURATION_NOT_FOUND",
  "OPTIMISTIC_LOCK_CONFLICT",
] as const;

export const domainErrorCodeSchema = z.enum(domainErrorCodes);
export type DomainErrorCode = z.infer<typeof domainErrorCodeSchema>;

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: domainErrorCodeSchema.or(z.string().min(1)),
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string().min(1),
  }),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
