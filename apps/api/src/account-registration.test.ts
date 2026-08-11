import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";

const dependency = { check: vi.fn(async () => "up" as const) };
const config = {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  API_HOST: "127.0.0.1",
  API_PORT: 3001,
  WEB_ORIGIN: "http://localhost:5173",
} as never;

describe("account-only registration", () => {
  it("creates one account without inventing an organization", async () => {
    const registerAccount = vi.fn(async () => ({
      userId: "00000000-0000-4000-8000-000000000001",
    }));
    const app = await createApp({
      config,
      dependencies: {
        postgres: dependency,
        redis: dependency,
        objectStorage: dependency,
      } as never,
      auth: {
        service: { registerAccount } as never,
        webOrigin: "http://localhost:5173",
        cookieName: "session",
        cookieSecure: false,
        refreshTtlSeconds: 3600,
      },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "person@example.test",
        displayName: "Test Person",
        password: "correct horse battery staple",
        passwordConfirmation: "correct horse battery staple",
        acceptTerms: true,
        acceptPrivacy: true,
      },
    });
    expect(response.statusCode).toBe(201);
    expect(registerAccount).toHaveBeenCalledWith({
      email: "person@example.test",
      displayName: "Test Person",
      password: "correct horse battery staple",
    });
    await app.close();
  });

  it("rejects mismatched passwords without calling persistence", async () => {
    const registerAccount = vi.fn();
    const app = await createApp({
      config,
      dependencies: {
        postgres: dependency,
        redis: dependency,
        objectStorage: dependency,
      } as never,
      auth: {
        service: { registerAccount } as never,
        webOrigin: "http://localhost:5173",
        cookieName: "session",
        cookieSecure: false,
        refreshTtlSeconds: 3600,
      },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "person@example.test",
        displayName: "Test Person",
        password: "correct horse battery staple",
        passwordConfirmation: "different secure password",
        acceptTerms: true,
        acceptPrivacy: true,
      },
    });
    expect(response.statusCode).toBe(400);
    expect(registerAccount).not.toHaveBeenCalled();
    await app.close();
  });
});
