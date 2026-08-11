import type { OrganizationType } from "@nation-reserve/domain";
import { hasPermission, type Permission } from "./permissions.js";

export const assuranceLevels = { authenticated: 1, verifiedEmail: 2, mfa: 3 } as const;
export interface StepUpRequirement {
  action: string; requiredAssuranceLevel: number; validForSeconds: number;
}
export interface AuthorizationContext {
  userStatus: string; emailVerified: boolean; organizationStatus: string;
  membershipStatus: string; organizationType: OrganizationType; role: string;
  organizationId: string;
}
export class AuthorizationError extends Error {
  constructor(public readonly code: string) { super(code); }
}
export function authorizeOrganization(
  context: AuthorizationContext, required: Permission, resourceOrganizationId?: string,
): void {
  if (context.userStatus !== "active") throw new AuthorizationError("ACCOUNT_RESTRICTED");
  if (!context.emailVerified) throw new AuthorizationError("EMAIL_NOT_VERIFIED");
  if (context.organizationStatus !== "active") throw new AuthorizationError("ORGANIZATION_ACCESS_DENIED");
  if (context.membershipStatus !== "active") throw new AuthorizationError("MEMBERSHIP_INACTIVE");
  if (resourceOrganizationId && resourceOrganizationId !== context.organizationId) {
    throw new AuthorizationError("RESOURCE_ORGANIZATION_MISMATCH");
  }
  if (!hasPermission(context.organizationType, context.role, required)) {
    throw new AuthorizationError("PERMISSION_DENIED");
  }
}

