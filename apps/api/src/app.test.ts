import type { ApiConfig } from "@nation-reserve/config";
import type { DependencyHealthState } from "@nation-reserve/types";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "./app.js";

const config: ApiConfig = {
  NODE_ENV: "test",
  API_HOST: "127.0.0.1",
  API_PORT: 3000,
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_ACCESS_KEY: "key",
  S3_SECRET_KEY: "secret",
  S3_TRAINING_DATA_BUCKET: "training-bucket",
  S3_MANUFACTURER_DOCUMENTS_BUCKET: "manufacturer-bucket",
  S3_CONTRACT_DOCUMENTS_BUCKET: "contract-bucket",
  WEB_ORIGIN: "http://localhost:5173",
  LOG_LEVEL: "silent",
};

function dependency(state: DependencyHealthState) {
  return { check: () => Promise.resolve(state) };
}

const apps: Awaited<ReturnType<typeof createApp>>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("health routes", () => {
  it("returns HTTP 200 and the expected health structure", async () => {
    const app = await createApp({
      config,
      dependencies: {
        postgres: dependency("up"),
        redis: dependency("up"),
        objectStorage: dependency("up"),
      },
    });
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "api",
    });
    expect(response.json()).toHaveProperty("timestamp");
  });

  it("returns the readiness dependency states", async () => {
    const app = await createApp({
      config,
      dependencies: {
        postgres: dependency("up"),
        redis: dependency("up"),
        objectStorage: dependency("up"),
      },
    });
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ready",
      dependencies: {
        postgres: "up",
        redis: "up",
        objectStorage: "up",
      },
    });
  });

  it("returns HTTP 503 when a dependency is unavailable", async () => {
    const app = await createApp({
      config,
      dependencies: {
        postgres: dependency("up"),
        redis: dependency("down"),
        objectStorage: dependency("down"),
      },
    });
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/ready" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: "not_ready",
      dependencies: {
        postgres: "up",
        redis: "down",
        objectStorage: "down",
      },
    });
  });
});
