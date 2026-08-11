import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  status: text("status").notNull().default("pending"),
  ...timestamps,
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  legalName: text("legal_name").notNull(),
  displayName: text("display_name").notNull(),
  organizationType: text("organization_type").notNull(),
  status: text("status").notNull().default("pending"),
  ...timestamps,
});

export const organizationMemberships = pgTable("organization_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
  status: text("status").notNull().default("active"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  ...timestamps,
});

export const manufacturers = pgTable("manufacturers", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().unique().references(() => organizations.id),
  approvalStatus: text("approval_status").notNull().default("draft"),
  productionAccessStatus: text("production_access_status").notNull().default("disabled"),
  externalReference: text("external_reference"),
  ...timestamps,
});

export const robotModels = pgTable("robot_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  manufacturerId: uuid("manufacturer_id").notNull().references(() => manufacturers.id),
  modelName: text("model_name").notNull(),
  modelCode: text("model_code").notNull(),
  modelVersion: text("model_version").notNull(),
  approvalStatus: text("approval_status").notNull().default("draft"),
  capabilities: jsonb("capabilities").notNull().default({}),
  supportedFirmwareRange: text("supported_firmware_range"),
  supportedApiVersions: jsonb("supported_api_versions").notNull().default([]),
  operationalStateMapping: jsonb("operational_state_mapping").notNull().default({}),
  regionalRestrictions: jsonb("regional_restrictions").notNull().default({}),
  safetyRestrictions: jsonb("safety_restrictions").notNull().default({}),
  ...timestamps,
}, (table) => [uniqueIndex("robot_models_identity_unique").on(
  table.manufacturerId, table.modelCode, table.modelVersion,
)]);

export const robots = pgTable("robots", {
  id: uuid("id").primaryKey().defaultRandom(),
  manufacturerId: uuid("manufacturer_id").notNull().references(() => manufacturers.id),
  robotModelId: uuid("robot_model_id").notNull().references(() => robotModels.id),
  manufacturerSerialNumber: text("manufacturer_serial_number").notNull(),
  normalizedSerialNumber: text("normalized_serial_number").notNull(),
  hardwareRevision: text("hardware_revision"),
  firmwareVersion: text("firmware_version"),
  regionCode: text("region_code"),
  registrationState: text("registration_state").notNull().default("registered"),
  ownershipState: text("ownership_state").notNull().default("unassigned"),
  activationState: text("activation_state").notNull().default("inactive"),
  heartbeatState: text("heartbeat_state").notNull().default("unknown"),
  operationalState: text("operational_state").notNull().default("unknown"),
  maintenanceState: text("maintenance_state").notNull().default("not_required"),
  complianceState: text("compliance_state").notNull().default("pending"),
  financialEligibilityState: text("financial_eligibility_state").notNull().default("ineligible"),
  finalLifecycleState: text("final_lifecycle_state").notNull().default("active"),
  stateVersion: integer("state_version").notNull().default(1),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("robots_manufacturer_serial_unique").on(
    table.manufacturerId, table.normalizedSerialNumber,
  ),
  index("robots_model_idx").on(table.robotModelId),
]);

export const robotOwnershipRecords = pgTable("robot_ownership_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  robotId: uuid("robot_id").notNull().references(() => robots.id),
  ownerOrganizationId: uuid("owner_organization_id").notNull().references(() => organizations.id),
  ownershipStatus: text("ownership_status").notNull().default("pending"),
  ownershipStartAt: timestamp("ownership_start_at", { withTimezone: true }).notNull(),
  ownershipEndAt: timestamp("ownership_end_at", { withTimezone: true }),
  acquisitionMethod: text("acquisition_method").notNull(),
  sourceReference: text("source_reference"),
  verificationMethod: text("verification_method").notNull(),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("robot_ownership_owner_idx").on(table.ownerOrganizationId, table.ownershipStartAt),
]);

export const hiringCompanies = pgTable("hiring_companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().unique().references(() => organizations.id),
  verificationStatus: text("verification_status").notNull().default("pending"),
  billingStatus: text("billing_status").notNull().default("not_configured"),
  ...timestamps,
});

export const facilities = pgTable("facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  hiringCompanyId: uuid("hiring_company_id").notNull().references(() => hiringCompanies.id),
  name: text("name").notNull(),
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2"),
  city: text("city").notNull(),
  stateRegion: text("state_region"),
  postalCode: text("postal_code"),
  countryCode: text("country_code").notNull(),
  timezone: text("timezone").notNull(),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: uuid("facility_id").notNull().references(() => facilities.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

export const financialConfigurationVersions = pgTable("financial_configuration_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: integer("version").notNull().unique(),
  currency: text("currency").notNull(),
  baseRateMinorUnitsPerHour: integer("base_rate_minor_units_per_hour").notNull(),
  ownerPlatformFeeBasisPoints: integer("owner_platform_fee_basis_points").notNull(),
  companyPlatformFeeBasisPoints: integer("company_platform_fee_basis_points").notNull(),
  effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  status: text("status").notNull().default("draft"),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  ...timestamps,
});

export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  manufacturerId: uuid("manufacturer_id").notNull().references(() => manufacturers.id),
  hiringCompanyId: uuid("hiring_company_id").notNull().references(() => hiringCompanies.id),
  facilityId: uuid("facility_id").notNull().references(() => facilities.id),
  departmentId: uuid("department_id").references(() => departments.id),
  contractType: text("contract_type").notNull(),
  requestedRobotCount: integer("requested_robot_count").notNull(),
  priority: text("priority").notNull().default("normal"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  renewalMode: text("renewal_mode").notNull().default("none"),
  status: text("status").notNull().default("draft"),
  currentVersionNumber: integer("current_version_number").notNull().default(1),
  rateConfigurationVersionId: uuid("rate_configuration_version_id").notNull()
    .references(() => financialConfigurationVersions.id),
  hiringCompanyApprovedAt: timestamp("hiring_company_approved_at", { withTimezone: true }),
  manufacturerApprovedAt: timestamp("manufacturer_approved_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id),
  ...timestamps,
});

export const contractVersions = pgTable("contract_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id),
  versionNumber: integer("version_number").notNull(),
  requestedRobotCount: integer("requested_robot_count").notNull(),
  operatingWindows: jsonb("operating_windows").notNull().default({}),
  requiredCapabilities: jsonb("required_capabilities").notNull().default({}),
  locationRequirements: jsonb("location_requirements").notNull().default({}),
  specialTerms: jsonb("special_terms").notNull().default({}),
  effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("contract_versions_number_unique").on(
  table.contractId, table.versionNumber,
)]);

export const robotAssignments = pgTable("robot_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id),
  contractVersionId: uuid("contract_version_id").notNull().references(() => contractVersions.id),
  robotId: uuid("robot_id").notNull().references(() => robots.id),
  robotOwnerOrganizationId: uuid("robot_owner_organization_id").notNull().references(() => organizations.id),
  manufacturerId: uuid("manufacturer_id").notNull().references(() => manufacturers.id),
  hiringCompanyId: uuid("hiring_company_id").notNull().references(() => hiringCompanies.id),
  facilityId: uuid("facility_id").notNull().references(() => facilities.id),
  departmentId: uuid("department_id").references(() => departments.id),
  status: text("status").notNull().default("pending"),
  financialStatus: text("financial_status").notNull().default("not_started"),
  scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }).notNull(),
  scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }).notNull(),
  replacementForAssignmentId: uuid("replacement_for_assignment_id"),
  ...timestamps,
});

export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  actorType: text("actor_type").notNull(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  requestId: uuid("request_id"),
  correlationId: uuid("correlation_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  metadata: jsonb("metadata").notNull().default({}),
});

export const outboxEvents = pgTable("outbox_events", {
  id: uuid("id").primaryKey(),
  eventType: text("event_type").notNull(),
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: uuid("aggregate_id").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  payload: jsonb("payload").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  attempts: integer("attempts").notNull().default(0),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: text("locked_by"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("outbox_events_pending_idx").on(table.availableAt, table.createdAt),
]);

export const contractFulfillmentStatus = pgTable("contract_fulfillment_status", {
  contractId: uuid("contract_id"),
  requestedRobotCount: integer("requested_robot_count"),
  assignedRobotCount: bigint("assigned_robot_count", { mode: "number" }),
  isFulfilled: boolean("is_fulfilled"),
  fulfillmentPercentage: numeric("fulfillment_percentage"),
});

