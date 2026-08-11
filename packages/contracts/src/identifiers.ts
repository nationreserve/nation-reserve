import { z } from "zod";

declare const brand: unique symbol;
export type Brand<TValue, TName extends string> = TValue & {
  readonly [brand]: TName;
};

export const uuidSchema = z.string().uuid();

export const createIdSchema = <TName extends string>(_name: TName) =>
  uuidSchema.transform((value) => value as Brand<string, TName>);

export const userIdSchema = createIdSchema("UserId");
export const organizationIdSchema = createIdSchema("OrganizationId");
export const membershipIdSchema = createIdSchema("MembershipId");
export const manufacturerIdSchema = createIdSchema("ManufacturerId");
export const robotModelIdSchema = createIdSchema("RobotModelId");
export const robotIdSchema = createIdSchema("RobotId");
export const ownershipRecordIdSchema = createIdSchema("OwnershipRecordId");
export const hiringCompanyIdSchema = createIdSchema("HiringCompanyId");
export const facilityIdSchema = createIdSchema("FacilityId");
export const departmentIdSchema = createIdSchema("DepartmentId");
export const contractIdSchema = createIdSchema("ContractId");
export const contractVersionIdSchema = createIdSchema("ContractVersionId");
export const assignmentIdSchema = createIdSchema("AssignmentId");
export const financialConfigurationIdSchema = createIdSchema(
  "FinancialConfigurationId",
);
export const auditLogIdSchema = createIdSchema("AuditLogId");
export const outboxEventIdSchema = createIdSchema("OutboxEventId");

export type UserId = z.infer<typeof userIdSchema>;
export type OrganizationId = z.infer<typeof organizationIdSchema>;
export type MembershipId = z.infer<typeof membershipIdSchema>;
export type ManufacturerId = z.infer<typeof manufacturerIdSchema>;
export type RobotModelId = z.infer<typeof robotModelIdSchema>;
export type RobotId = z.infer<typeof robotIdSchema>;
export type OwnershipRecordId = z.infer<typeof ownershipRecordIdSchema>;
export type HiringCompanyId = z.infer<typeof hiringCompanyIdSchema>;
export type FacilityId = z.infer<typeof facilityIdSchema>;
export type DepartmentId = z.infer<typeof departmentIdSchema>;
export type ContractId = z.infer<typeof contractIdSchema>;
export type ContractVersionId = z.infer<typeof contractVersionIdSchema>;
export type AssignmentId = z.infer<typeof assignmentIdSchema>;
export type FinancialConfigurationId = z.infer<
  typeof financialConfigurationIdSchema
>;
export type AuditLogId = z.infer<typeof auditLogIdSchema>;
export type OutboxEventId = z.infer<typeof outboxEventIdSchema>;
