import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerContractRoutes, type ContractRouteService } from "./contract-routes.js";

const organizationId = crypto.randomUUID();
const contractId = crypto.randomUUID();
const service = {
  list: vi.fn(async () => []), detail: vi.fn(async () => ({})),
  create: vi.fn(async () => ({})), revise: vi.fn(async () => ({})),
  submit: vi.fn(async () => undefined), decide: vi.fn(async () => ({})),
  allocate: vi.fn(async () => ({})), assignment: vi.fn(async () => ({})),
  replace: vi.fn(async () => ({})), cancelAssignment: vi.fn(async () => undefined),
} satisfies ContractRouteService;
const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

describe("Prompt 005 contract routes", () => {
  it("authenticates organization-scoped contract reads", async () => {
    const app = Fastify(); apps.push(app);
    await registerContractRoutes(app, {
      service,
      authenticate: async () => { throw new Error("AUTHENTICATION_REQUIRED"); },
    });
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/organizations/${organizationId}/company/contracts`,
    });
    expect(response.statusCode).toBe(500);
    expect(response.json().message).toBe("AUTHENTICATION_REQUIRED");
  });

  it("rejects an approval decision without a valid version identifier", async () => {
    const app = Fastify(); apps.push(app);
    await registerContractRoutes(app, {
      service,
      authenticate: async () => ({ userId: crypto.randomUUID() }),
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/organizations/${organizationId}/manufacturer/contracts/${contractId}/decision`,
      payload: { versionId: "invalid", decision: "approved" },
    });
    expect(response.statusCode).toBe(500);
    expect(service.decide).not.toHaveBeenCalled();
  });
});
