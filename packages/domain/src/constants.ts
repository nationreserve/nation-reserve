export const userStatuses = [
  "pending",
  "active",
  "restricted",
  "suspended",
  "closed",
] as const;

export const organizationTypes = [
  "robot_owner",
  "hiring_company",
  "manufacturer",
  "platform",
] as const;
export const organizationStatuses = userStatuses;
export const membershipStatuses = [
  "invited",
  "active",
  "suspended",
  "removed",
] as const;

export const rolesByOrganizationType = {
  platform: [
    "support",
    "operations",
    "billing",
    "security",
    "platform_admin",
    "super_admin",
  ],
  robot_owner: ["owner", "manager", "viewer"],
  hiring_company: ["employee", "supervisor", "manager", "administrator"],
  manufacturer: ["viewer", "engineer", "manager", "administrator"],
} as const;

export const manufacturerApprovalStatuses = [
  "draft",
  "submitted",
  "under_review",
  "sandbox_approved",
  "production_approved",
  "rejected",
  "suspended",
] as const;
export const productionAccessStatuses = [
  "disabled",
  "sandbox",
  "production",
  "restricted",
] as const;
export const robotModelApprovalStatuses = [
  "draft",
  "submitted",
  "under_review",
  "sandbox_approved",
  "production_approved",
  "suspended",
  "retired",
  "rejected",
] as const;

export const registrationStates = [
  "draft",
  "registered",
  "registration_rejected",
  "registration_conflict",
  "archived",
] as const;
export const ownershipStates = [
  "unassigned",
  "ownership_pending",
  "ownership_verified",
  "ownership_disputed",
  "transfer_pending",
  "ownership_restricted",
] as const;
export const activationStates = [
  "not_eligible",
  "awaiting_activation",
  "activation_in_progress",
  "activation_failed",
  "activated",
  "reactivation_required",
] as const;
export const heartbeatStates = [
  "never_connected",
  "connecting",
  "online",
  "degraded",
  "offline",
  "invalid",
  "credential_restricted",
] as const;
export const operationalStates = [
  "unavailable",
  "available",
  "reserved",
  "assigned",
  "operating",
  "paused",
  "charging",
  "faulted",
  "emergency_stopped",
] as const;
export const maintenanceStates = [
  "no_maintenance",
  "maintenance_requested",
  "maintenance_scheduled",
  "in_maintenance",
  "awaiting_verification",
  "maintenance_completed",
  "maintenance_disputed",
] as const;
export const complianceStates = [
  "eligible",
  "review_required",
  "restricted",
  "suspended",
  "banned",
] as const;
export const financialEligibilityStates = [
  "not_payable",
  "potentially_payable",
  "payable",
  "payment_review",
  "financial_hold",
] as const;
export const finalLifecycleStates = [
  "active",
  "transferred",
  "replaced",
  "retired",
  "decommissioned",
  "destroyed",
  "lost",
  "stolen",
] as const;
export const permanentlyInactiveLifecycleStates = [
  "retired",
  "decommissioned",
  "destroyed",
] as const;

export const ownershipRecordStatuses = [
  "pending",
  "verified",
  "rejected",
  "disputed",
  "ended",
] as const;
export const hiringCompanyVerificationStatuses = [
  "pending",
  "under_review",
  "verified",
  "rejected",
  "suspended",
] as const;
export const billingStatuses = [
  "not_configured",
  "pending",
  "active",
  "past_due",
  "restricted",
] as const;
export const archiveStatuses = ["active", "inactive", "archived"] as const;

export const contractTypes = [
  "ongoing",
  "fixed_term",
  "temporary",
  "pilot",
] as const;
export const contractStatuses = [
  "draft",
  "pending_manufacturer_approval",
  "pending_company_approval",
  "pending_both_approvals",
  "approved",
  "active",
  "partially_fulfilled",
  "fully_fulfilled",
  "suspended",
  "completed",
  "cancelled",
  "archived",
] as const;
export const contractPriorities = ["normal", "high", "critical"] as const;
export const renewalModes = ["none", "manual", "automatic"] as const;
export const assignmentStatuses = [
  "pending",
  "reserved",
  "ready",
  "active",
  "paused",
  "interrupted",
  "completed",
  "cancelled",
  "replaced",
] as const;
export const assignmentBlockingStatuses = [
  "reserved",
  "ready",
  "active",
  "paused",
  "interrupted",
] as const;
export const assignmentFinancialStatuses = [
  "not_eligible",
  "pending_verification",
  "eligible",
  "under_review",
  "settled",
] as const;
export const financialConfigurationStatuses = [
  "draft",
  "active",
  "expired",
  "superseded",
] as const;
export const outboxStatuses = [
  "pending",
  "processing",
  "published",
  "failed",
  "dead_letter",
] as const;

export const MAX_ACTIVE_ROBOTS_PER_OWNER = 20;
export const INITIAL_BASE_RATE_MINOR_UNITS = 500;
export const INITIAL_OWNER_FEE_BASIS_POINTS = 1_500;
export const INITIAL_COMPANY_FEE_BASIS_POINTS = 1_500;
