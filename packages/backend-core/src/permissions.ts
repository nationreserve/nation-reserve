export type PermissionEffect = "allow" | "deny";
export interface AuthorizationContext { userId: string; organizationId?: string; roles: string[]; permissions: string[]; resourceOwnerId?: string; platformOverride?: boolean; }
export interface AuthorizationRequest { permission: string; resourceOwnerId?: string; allowPlatformOverride?: boolean; }
export interface AuthorizationDecision { allowed: boolean; reason: "explicit_permission"|"resource_owner"|"platform_override"|"missing_permission"; }

export class PermissionEngine {
  decide(context: AuthorizationContext, request: AuthorizationRequest): AuthorizationDecision {
    if (request.allowPlatformOverride && context.platformOverride) return { allowed: true, reason: "platform_override" };
    if (request.resourceOwnerId && request.resourceOwnerId === context.userId) return { allowed: true, reason: "resource_owner" };
    if (context.permissions.includes(request.permission) || context.permissions.includes("*")) return { allowed: true, reason: "explicit_permission" };
    return { allowed: false, reason: "missing_permission" };
  }
  assert(context: AuthorizationContext, request: AuthorizationRequest): void {
    const decision=this.decide(context,request);
    if(!decision.allowed) throw Object.assign(new Error(`Missing permission: ${request.permission}`),{code:"FORBIDDEN",statusCode:403,decision});
  }
}
