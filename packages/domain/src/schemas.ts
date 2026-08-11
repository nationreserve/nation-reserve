import {
  contractIdSchema,
  contractVersionIdSchema,
  departmentIdSchema,
  facilityIdSchema,
  financialConfigurationIdSchema,
  hiringCompanyIdSchema,
  manufacturerIdSchema,
  organizationIdSchema,
  robotIdSchema,
  robotModelIdSchema,
  userIdSchema,
} from "@nation-reserve/contracts";
import { z } from "zod";

import {
  activationStates,
  archiveStatuses,
  assignmentFinancialStatuses,
  assignmentStatuses,
  billingStatuses,
  complianceStates,
  contractPriorities,
  contractStatuses,
  contractTypes,
  financialConfigurationStatuses,
  financialEligibilityStates,
  finalLifecycleStates,
  heartbeatStates,
  hiringCompanyVerificationStatuses,
  maintenanceStates,
  manufacturerApprovalStatuses,
  membershipStatuses,
  operationalStates,
  organizationStatuses,
  ownershipRecordStatuses,
  ownershipStates,
  productionAccessStatuses,
  registrationStates,
  renewalModes,
  robotModelApprovalStatuses,
  userStatuses,
} from "./constants.js";
import { organizationRoleSchema, organizationTypeSchema } from "./roles.js";

const nonEmpty = z.string().trim().min(1);
const timestamp = z.coerce.date();
const optionalJson = z.record(z.string(), z.unknown()).default({});

export const createUserSchema = z.object({
  email: z.string().trim().email(),
  displayName: nonEmpty.max(200),
  status: z.enum(userStatuses).default("pending"),
});

export const createOrganizationSchema = z.object({
  legalName: nonEmpty.max(250),
  displayName: nonEmpty.max(250),
  organizationType: organizationTypeSchema,
  status: z.enum(organizationStatuses).default("pending"),
});

export const createMembershipSchema = z.object({
  organizationId: organizationIdSchema,
  userId: userIdSchema,
  role: organizationRoleSchema,
  status: z.enum(membershipStatuses).default("active"),
  joinedAt: timestamp.default(() => new Date()),
});

export const createManufacturerSchema = z.object({
  organizationId: organizationIdSchema,
  approvalStatus: z.enum(manufacturerApprovalStatuses).default("draft"),
  productionAccessStatus: z.enum(productionAccessStatuses).default("disabled"),
  externalReference: z.string().trim().max(200).optional(),
});

export const createRobotModelSchema = z.object({
  manufacturerId: manufacturerIdSchema,
  modelName: nonEmpty.max(200),
  modelCode: nonEmpty.max(100),
  modelVersion: nonEmpty.max(100),
  approvalStatus: z.enum(robotModelApprovalStatuses).default("draft"),
  capabilities: optionalJson,
  supportedFirmwareRange: z.string().trim().max(300).optional(),
  supportedApiVersions: z.array(z.string().min(1)).default([]),
  operationalStateMapping: optionalJson,
  regionalRestrictions: optionalJson,
  safetyRestrictions: optionalJson,
});

export const registerRobotSchema = z.object({
  manufacturerId: manufacturerIdSchema,
  robotModelId: robotModelIdSchema,
  manufacturerSerialNumber: nonEmpty.max(200),
  hardwareRevision: z.string().trim().max(100).optional(),
  firmwareVersion: z.string().trim().max(100).optional(),
  regionCode: z.string().trim().toUpperCase().max(20).optional(),
});

export const robotStateSchema = z.object({
  registrationState: z.enum(registrationStates),
  ownershipState: z.enum(ownershipStates),
  activationState: z.enum(activationStates),
  heartbeatState: z.enum(heartbeatStates),
  operationalState: z.enum(operationalStates),
  maintenanceState: z.enum(maintenanceStates),
  complianceState: z.enum(complianceStates),
  financialEligibilityState: z.enum(financialEligibilityStates),
  finalLifecycleState: z.enum(finalLifecycleStates),
  stateVersion: z.number().int().positive(),
});

export const verifyOwnershipSchema = z.object({
  robotId: robotIdSchema,
  ownerOrganizationId: organizationIdSchema,
  ownershipStartAt: timestamp,
  ownershipEndAt: timestamp.optional(),
  acquisitionMethod: nonEmpty.max(100),
  sourceReference: z.string().trim().max(300).optional(),
  verificationMethod: nonEmpty.max(100),
  approvedByUserId: userIdSchema.optional(),
});

export const createHiringCompanySchema = z.object({
  organizationId: organizationIdSchema,
  verificationStatus: z
    .enum(hiringCompanyVerificationStatuses)
    .default("pending"),
  billingStatus: z.enum(billingStatuses).default("not_configured"),
});

export const createFacilitySchema = z.object({
  hiringCompanyId: hiringCompanyIdSchema,
  name: nonEmpty.max(200),
  addressLine1: nonEmpty.max(250),
  addressLine2: z.string().trim().max(250).optional(),
  city: nonEmpty.max(150),
  stateRegion: z.string().trim().max(150).optional(),
  postalCode: z.string().trim().max(30).optional(),
  countryCode: z.string().trim().length(2).toUpperCase(),
  timezone: nonEmpty.max(100),
  status: z.enum(archiveStatuses).default("active"),
});

export const createDepartmentSchema = z.object({
  facilityId: facilityIdSchema,
  name: nonEmpty.max(200),
  description: z.string().trim().max(2_000).optional(),
  status: z.enum(archiveStatuses).default("active"),
});

export const createContractSchema = z
  .object({
    manufacturerId: manufacturerIdSchema,
    hiringCompanyId: hiringCompanyIdSchema,
    facilityId: facilityIdSchema,
    departmentId: departmentIdSchema.optional(),
    contractType: z.enum(contractTypes),
    requestedRobotCount: z.number().int().positive(),
    priority: z.enum(contractPriorities).default("normal"),
    startAt: timestamp,
    endAt: timestamp.optional(),
    renewalMode: z.enum(renewalModes).default("none"),
    createdByUserId: userIdSchema,
    draft: z.boolean().default(false),
    operatingWindows: optionalJson,
    requiredCapabilities: optionalJson,
    locationRequirements: optionalJson,
    specialTerms: optionalJson,
    changeReason: z.string().trim().max(2_000).optional(),
  })
  .refine((value) => !value.endAt || value.endAt > value.startAt, {
    message: "Contract end must be after its start.",
    path: ["endAt"],
  });

export const createContractVersionSchema = z.object({
  contractId: contractIdSchema,
  versionNumber: z.number().int().positive(),
  requestedRobotCount: z.number().int().positive(),
  operatingWindows: optionalJson,
  requiredCapabilities: optionalJson,
  locationRequirements: optionalJson,
  specialTerms: optionalJson,
  effectiveAt: timestamp,
  createdByUserId: userIdSchema,
  changeReason: z.string().trim().max(2_000).optional(),
});

export const createAssignmentSchema = z
  .object({
    contractId: contractIdSchema,
    contractVersionId: contractVersionIdSchema,
    robotId: robotIdSchema,
    status: z.enum(assignmentStatuses).default("pending"),
    scheduledStartAt: timestamp,
    scheduledEndAt: timestamp,
    replacementForAssignmentId: z.string().uuid().optional(),
  })
  .refine((value) => value.scheduledEndAt > value.scheduledStartAt, {
    message: "Assignment end must be after its start.",
    path: ["scheduledEndAt"],
  });

export const createFinancialConfigurationSchema = z
  .object({
    version: z.number().int().positive(),
    currency: z.string().trim().length(3).toUpperCase(),
    baseRateMinorUnitsPerHour: z.number().int().positive(),
    ownerPlatformFeeBasisPoints: z.number().int().min(0).max(10_000),
    companyPlatformFeeBasisPoints: z.number().int().min(0).max(10_000),
    effectiveAt: timestamp,
    expiresAt: timestamp.optional(),
    status: z.enum(financialConfigurationStatuses).default("draft"),
    approvedByUserId: userIdSchema.optional(),
  })
  .refine((value) => !value.expiresAt || value.expiresAt > value.effectiveAt, {
    message: "Financial configuration expiry must follow its effective time.",
    path: ["expiresAt"],
  });

export const persistedRobotSchema = robotStateSchema.extend({
  id: robotIdSchema,
  manufacturerId: manufacturerIdSchema,
  robotModelId: robotModelIdSchema,
  manufacturerSerialNumber: nonEmpty,
  normalizedSerialNumber: nonEmpty,
  activatedAt: timestamp.nullable(),
  retiredAt: timestamp.nullable(),
});

export const persistedContractSchema = z.object({
  id: contractIdSchema,
  manufacturerId: manufacturerIdSchema,
  hiringCompanyId: hiringCompanyIdSchema,
  facilityId: facilityIdSchema,
  departmentId: departmentIdSchema.nullable(),
  status: z.enum(contractStatuses),
  currentVersionNumber: z.number().int().positive(),
  rateConfigurationVersionId: financialConfigurationIdSchema,
});

export const persistedOwnershipSchema = z.object({
  id: z.string().uuid(),
  robotId: robotIdSchema,
  ownerOrganizationId: organizationIdSchema,
  ownershipStatus: z.enum(ownershipRecordStatuses),
  ownershipStartAt: timestamp,
  ownershipEndAt: timestamp.nullable(),
});

export const persistedAssignmentSchema = z.object({
  id: z.string().uuid(),
  contractId: contractIdSchema,
  robotId: robotIdSchema,
  status: z.enum(assignmentStatuses),
  financialStatus: z.enum(assignmentFinancialStatuses),
  scheduledStartAt: timestamp,
  scheduledEndAt: timestamp,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;
export type CreateManufacturerInput = z.infer<typeof createManufacturerSchema>;
export type CreateRobotModelInput = z.infer<typeof createRobotModelSchema>;
export type RegisterRobotInput = z.infer<typeof registerRobotSchema>;
export type VerifyOwnershipInput = z.infer<typeof verifyOwnershipSchema>;
export type CreateHiringCompanyInput = z.infer<
  typeof createHiringCompanySchema
>;
export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type CreateContractVersionInput = z.infer<
  typeof createContractVersionSchema
>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type CreateFinancialConfigurationInput = z.infer<
  typeof createFinancialConfigurationSchema
>;
export type PersistedRobot = z.infer<typeof persistedRobotSchema>;
export type PersistedContract = z.infer<typeof persistedContractSchema>;
export type PersistedOwnership = z.infer<typeof persistedOwnershipSchema>;
export type PersistedAssignment = z.infer<typeof persistedAssignmentSchema>;
