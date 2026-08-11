import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";

const dependency = {
  connect: vi.fn(),
  close: vi.fn(),
  check: vi.fn(async () => "up" as const),
};
const config = {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  API_HOST: "127.0.0.1",
  API_PORT: 3001,
  WEB_ORIGIN: "http://localhost:5173",
} as never;

describe("manufacturer marketplace routes", () => {
  it("requires authentication and delegates safe directory search", async () => {
    const service = { manufacturers: vi.fn(async () => ({ items: [] })) };
    const app = await createApp({
      config,
      dependencies: {
        postgres: dependency,
        redis: dependency,
        objectStorage: dependency,
      } as never,
      marketplace: {
        service: service as never,
        authenticate: async (request) => {
          if (request.headers.authorization !== "Bearer valid")
            throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), {
              statusCode: 401,
            });
          return { userId: "00000000-0000-4000-8000-000000000001" };
        },
      },
    });
    expect(
      (await app.inject({ method: "GET", url: "/api/v1/marketplace/manufacturers" }))
        .statusCode,
    ).toBe(401);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/marketplace/manufacturers?search=robot&limit=10",
      headers: { authorization: "Bearer valid" },
    });
    expect(response.statusCode).toBe(200);
    expect(service.manufacturers).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      { search: "robot", limit: 10 },
    );
    await app.close();
  });

  it("requires idempotency for conversation creation and message sending", async () => {
    const service = {
      createConversation: vi.fn(async () => ({ id: "conversation" })),
      send: vi.fn(async () => ({ id: "message" })),
    };
    const app = await createApp({
      config,
      dependencies: {
        postgres: dependency,
        redis: dependency,
        objectStorage: dependency,
      } as never,
      marketplace: {
        service: service as never,
        authenticate: async () => ({ userId: "00000000-0000-4000-8000-000000000001" }),
      },
    });
    const body = {
      manufacturerId: "00000000-0000-4000-8000-000000000002",
      subject: "Deployment inquiry",
      message: "Can this model support our workflow?",
      contexts: [],
    };
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/organizations/00000000-0000-4000-8000-000000000003/conversations",
          payload: body,
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/organizations/00000000-0000-4000-8000-000000000003/conversations",
          payload: body,
          headers: { "idempotency-key": "conversation-key" },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/organizations/00000000-0000-4000-8000-000000000003/conversations/00000000-0000-4000-8000-000000000004/messages",
          payload: { message: "Reply" },
          headers: { "idempotency-key": "message-key" },
        })
      ).statusCode,
    ).toBe(200);
    await app.close();
  });
});
