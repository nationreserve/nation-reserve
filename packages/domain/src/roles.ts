import { z } from "zod";

import { organizationTypes, rolesByOrganizationType } from "./constants.js";
import { DomainError } from "./errors.js";

export const organizationTypeSchema = z.enum(organizationTypes);
export type OrganizationType = z.infer<typeof organizationTypeSchema>;

const allRoles = Array.from(
  new Set(Object.values(rolesByOrganizationType).flat()),
) as [string, ...string[]];
export const organizationRoleSchema = z.enum(allRoles);
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;

export function isRoleCompatible(
  organizationType: OrganizationType,
  role: string,
): boolean {
  return (rolesByOrganizationType[organizationType] as readonly string[]).includes(
    role,
  );
}

export function assertRoleCompatible(
  organizationType: OrganizationType,
  role: string,
): void {
  if (!isRoleCompatible(organizationType, role)) {
    throw new DomainError(
      "ORGANIZATION_TYPE_MISMATCH",
      `Role '${role}' is not valid for organization type '${organizationType}'.`,
      { organizationType, role },
    );
  }
}
