import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerIntegrationRoutes, type IntegrationRouteService } from "./integration-routes.js";

const service = new Proxy({}, {
  get: () => vi.fn(async () => ({})),
}) as IntegrationRouteService;
const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

describe("manufacturer integration authentication", () => {
  it("rejects a missing manufacturer API key", async () => {
    const app = Fastify(); apps.push(app);
    await registerIntegrationRoutes(app, {
      service,
      authenticateHuman: async () => ({ userId: crypto.randomUUID() }),
    });
    const response = await app.inject({
      method: "POST", url: "/manufacturer-api/v1/robots/registrations", payload: {},
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().message).toBe("MANUFACTURER_AUTHENTICATION_REQUIRED");
  });

  it("rejects malformed credentials before database authentication", async () => {
    const app = Fastify(); apps.push(app);
    await registerIntegrationRoutes(app, {
      service,
      authenticateHuman: async () => ({ userId: crypto.randomUUID() }),
    });
    const response = await app.inject({
      method: "POST", url: "/manufacturer-api/v1/robots/registrations",
      headers: { "x-api-key": "not-a-real-key" }, payload: {},
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().message).toBe("MANUFACTURER_AUTHENTICATION_FAILED");
  });
});


