import type { OrganizationType } from "@nation-reserve/domain";

export const permissions = [
  "organization.read", "organization.update", "organization.members.read",
  "organization.members.invite", "organization.members.update", "organization.members.remove",
  "manufacturer.read", "manufacturer.update", "manufacturer.models.read",
  "manufacturer.models.create", "manufacturer.models.update", "robot.read", "robot.create",
  "robot.update", "robot.ownership.read", "hiring_company.read", "hiring_company.update",
  "facility.read", "facility.create", "facility.update", "department.read",
  "department.create", "department.update", "contract.read", "contract.create",
  "contract.update", "contract.approve", "assignment.read", "platform.users.read",
  "platform.organizations.read", "platform.manufacturers.review", "platform.security.read",
  "platform.audit.read", "platform.dashboard.read", "platform.search", "platform.configuration.read",
  "platform.configuration.update", "platform.feature_flags.read", "platform.feature_flags.update",
  "platform.jobs.read", "platform.jobs.retry", "platform.jobs.pause", "platform.jobs.resume",
  "platform.health.read", "platform.incidents.read", "platform.incidents.manage",
  "platform.maintenance.manage", "platform.announcements.manage", "platform.audit.export", "platform.admin",
  "reports.read", "reports.create", "reports.export", "reports.schedule", "analytics.read",
  "analytics.forecast", "dashboard.read",
  "specification.overview.read", "specification.requirements.read", "specification.features.read",
  "specification.journeys.read", "specification.screens.read", "specification.explanations.read",
  "specification.rules.read", "specification.prompts.read", "specification.conflicts.read",
  "specification.conflicts.manage", "specification.deferred.read", "specification.validation.read",
  "specification.validation.run", "specification.sync",
] as const;
export type Permission = typeof permissions[number];

const read = ["organization.read"] satisfies Permission[];
const reportingRead = ["reports.read","analytics.read","dashboard.read"] satisfies Permission[];
const reportingManage = [...reportingRead,"reports.create","reports.export","reports.schedule","analytics.forecast"] satisfies Permission[];
export const rolePermissions: Record<OrganizationType, Record<string, readonly Permission[]>> = {
  robot_owner: {
    owner: [...read, ...reportingManage, "organization.update", "organization.members.read", "organization.members.invite",
      "organization.members.update", "organization.members.remove", "robot.read", "robot.ownership.read", "assignment.read"],
    manager: [...read, ...reportingManage, "organization.members.read", "robot.read", "robot.ownership.read", "assignment.read"],
    viewer: [...read, ...reportingRead, "robot.read", "robot.ownership.read", "assignment.read"],
  },
  hiring_company: {
    administrator: [...read, ...reportingManage, "organization.update", "organization.members.read", "organization.members.invite",
      "organization.members.update", "organization.members.remove", "hiring_company.read", "hiring_company.update",
      "facility.read", "facility.create", "facility.update", "department.read", "department.create",
      "department.update", "contract.read", "contract.create", "contract.update", "contract.approve", "assignment.read"],
    manager: [...read, ...reportingManage, "organization.members.read", "facility.read", "facility.create", "facility.update",
      "department.read", "department.create", "department.update", "contract.read", "contract.create", "contract.update", "assignment.read"],
    supervisor: [...read, ...reportingRead, "contract.read", "assignment.read", "facility.read", "department.read"],
    employee: [...read, ...reportingRead, "contract.read", "assignment.read"],
  },
  manufacturer: {
    administrator: [...read, ...reportingManage, "organization.update", "organization.members.read", "organization.members.invite",
      "organization.members.update", "organization.members.remove", "manufacturer.read", "manufacturer.update",
      "manufacturer.models.read", "manufacturer.models.create", "manufacturer.models.update", "contract.read", "contract.approve"],
    manager: [...read, ...reportingManage, "organization.members.read", "manufacturer.read", "manufacturer.models.read",
      "manufacturer.models.create", "manufacturer.models.update", "contract.read"],
    engineer: [...read, ...reportingRead, "manufacturer.read", "manufacturer.models.read", "manufacturer.models.update"],
    viewer: [...read, ...reportingRead, "manufacturer.read", "manufacturer.models.read"],
  },
  platform: {
    support: [...reportingRead,"specification.overview.read","specification.requirements.read","specification.screens.read","specification.explanations.read","platform.users.read","platform.organizations.read","platform.dashboard.read","platform.search",
      "platform.configuration.read","platform.feature_flags.read","platform.jobs.read","platform.health.read",
      "platform.incidents.read","platform.audit.read"],
    operations: [...reportingManage,"specification.overview.read","specification.requirements.read","specification.features.read","specification.journeys.read","specification.screens.read","specification.explanations.read","specification.rules.read","specification.prompts.read","specification.conflicts.read","specification.deferred.read","specification.validation.read","specification.validation.run","platform.organizations.read","platform.manufacturers.review","platform.dashboard.read","platform.search",
      "platform.configuration.read","platform.feature_flags.read","platform.jobs.read","platform.jobs.retry",
      "platform.jobs.pause","platform.jobs.resume","platform.health.read","platform.incidents.read",
      "platform.incidents.manage","platform.maintenance.manage","platform.audit.read"],
    billing: [...reportingManage,"platform.organizations.read","platform.dashboard.read","platform.search","platform.jobs.read",
      "platform.health.read","platform.incidents.read","platform.audit.read"],
    security: [...reportingRead,"reports.export","platform.security.read","platform.audit.read","platform.audit.export","platform.dashboard.read",
      "platform.search","platform.health.read","platform.incidents.read","platform.incidents.manage"],
    platform_admin: [...permissions],
    super_admin: [...permissions],
  },
};
export function hasPermission(type: OrganizationType, role: string, permission: Permission): boolean {
  return rolePermissions[type][role]?.includes(permission) ?? false;
}

