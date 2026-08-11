import { describe, expect, it } from "vitest";
import { authorizeOrganization, AuthorizationError, hasPermission, hashOpaqueToken,
  normalizeEmail, parseAuthEnvironment, createOpaqueToken, hashPassword, verifyPassword,
  MemoryRateLimitStore } from "./index.js";

const config = parseAuthEnvironment({ NODE_ENV: "test" });
describe("authentication security primitives", () => {
  it("normalizes email and never stores opaque tokens directly", () => {
    expect(normalizeEmail(" User@Example.COM ")).toBe("user@example.com");
    const token = createOpaqueToken();
    expect(hashOpaqueToken(token)).not.toBe(token);
  });
  it("hashes passwords with Argon2id", async () => {
    const hash = await hashPassword("correct horse battery staple", config);
    expect(hash).not.toContain("correct horse");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "correct horse battery staple")).toBe(true);
  });
  it("keeps organization roles conservative", () => {
    expect(hasPermission("hiring_company", "administrator", "contract.approve")).toBe(true);
    expect(hasPermission("hiring_company", "employee", "organization.members.remove")).toBe(false);
  });
  it("validates resource organization on the backend", () => {
    expect(() => authorizeOrganization({
      userStatus: "active", emailVerified: true, organizationStatus: "active",
      membershipStatus: "active", organizationType: "robot_owner", role: "owner",
      organizationId: "a",
    }, "robot.read", "b")).toThrowError(AuthorizationError);
  });
  it("forbids local rate limiting in production", () => {
    expect(() => new MemoryRateLimitStore("production")).toThrow();
  });
});

