import { describe, expect, it } from "vitest";
import { activatedState, assertOwnershipCapacity, issueCredential, mapOperationalState,
  parseCredential, reactivationRequired } from "./index.js";
describe("manufacturer and robot security rules", () => {
  it("issues environment-specific credentials and parses only valid formats", () => {
    const credential = issueCredential("sandbox", "pepper-that-is-long-enough-for-tests");
    expect(credential.raw).toMatch(/^rwp_sbx_/);
    expect(credential.secretHash).not.toContain(credential.raw);
    expect(parseCredential(credential.raw).environment).toBe("sandbox");
    expect(() => parseCredential("bad")).toThrow();
  });
  it("never maps an unknown native state to operating", () => {
    expect(mapOperationalState({ WORKING: "operating" }, "UNKNOWN")).toBe("unavailable");
  });
  it("enforces the direct ownership cap", () => {
    expect(() => assertOwnershipCapacity(19)).not.toThrow();
    expect(() => assertOwnershipCapacity(20)).toThrow("ROBOT_OWNERSHIP_LIMIT_REACHED");
  });
  it("activates as available but nonpayable", () => {
    const next = activatedState({ registrationState: "registered", ownershipState: "ownership_verified",
      activationState: "activation_in_progress", heartbeatState: "never_connected",
      operationalState: "unavailable", financialEligibilityState: "not_payable",
      finalLifecycleState: "active", stateVersion: 2 });
    expect(next).toMatchObject({ activationState: "activated", operationalState: "available",
      financialEligibilityState: "not_payable", stateVersion: 3 });
    expect(reactivationRequired(next).financialEligibilityState).toBe("not_payable");
  });
});

