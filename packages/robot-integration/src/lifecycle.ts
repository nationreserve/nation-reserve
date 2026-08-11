export const requiredActivationChecks = [
  "registered","owner_verified","manufacturer_approved","model_approved","firmware_supported",
  "hardware_identity_confirmed","integration_connectivity","operational_mapping",
  "region_permitted","compliance_eligible",
] as const;
export type CheckStatus = "not_started" | "pending" | "passed" | "failed" | "not_required";
export function mapOperationalState(mapping: Record<string, string>, native: string): string {
  const mapped = mapping[native];
  const allowed = new Set(["unavailable","available","reserved","assigned","operating","paused",
    "charging","faulted","emergency_stopped"]);
  return mapped && allowed.has(mapped) ? mapped : "unavailable";
}
export function assertActivationComplete(checks: Record<string, CheckStatus>) {
  for (const check of requiredActivationChecks) {
    if (!["passed","not_required"].includes(checks[check] ?? "not_started")) {
      throw new Error(`ACTIVATION_CHECK_INCOMPLETE:${check}`);
    }
  }
}
export function countsTowardOwnershipLimit(finalState: string): boolean {
  return !["retired","decommissioned","destroyed"].includes(finalState);
}
export function assertOwnershipCapacity(activeCount: number) {
  if (activeCount >= 20) throw new Error("ROBOT_OWNERSHIP_LIMIT_REACHED");
}
export interface RobotState {
  registrationState: string; ownershipState: string; activationState: string;
  heartbeatState: string; operationalState: string; financialEligibilityState: string;
  finalLifecycleState: string; stateVersion: number;
}
export function activatedState(current: RobotState): RobotState {
  if (current.registrationState !== "registered" || current.ownershipState !== "ownership_verified") {
    throw new Error("ROBOT_NOT_ACTIVATION_ELIGIBLE");
  }
  return { ...current, activationState: "activated", heartbeatState: "never_connected",
    operationalState: "available", financialEligibilityState: "not_payable",
    stateVersion: current.stateVersion + 1 };
}
export function reactivationRequired(current: RobotState): RobotState {
  return { ...current, activationState: "reactivation_required", operationalState: "unavailable",
    financialEligibilityState: "not_payable", stateVersion: current.stateVersion + 1 };
}

