import type { ApiConfig } from "@nation-reserve/config";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "./app.js";
import type { PostgresPlatformService } from "./postgres-platform-service.js";

const config: ApiConfig = {
  NODE_ENV: "test",
  DEPLOY_ENVIRONMENT: "test",
  PAYMENT_PROVIDER: "fake",
  PAYMENT_PROVIDER_ENVIRONMENT: "test",
  PAYMENT_EXECUTION_ENABLED: false,
  COOKIE_SECURE: false,
  TIMELINE_PROJECTION_ENABLED: true,
  SHUTDOWN_TIMEOUT_MS: 30_000,
  API_HOST: "127.0.0.1",
  API_PORT: 3000,
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_ACCESS_KEY: "key",
  S3_SECRET_KEY: "secret",
  S3_TRAINING_DATA_BUCKET: "training-data-private",
  S3_MANUFACTURER_DOCUMENTS_BUCKET: "manufacturer-documents-private",
  S3_CONTRACT_DOCUMENTS_BUCKET: "contract-documents-private",
  WEB_ORIGIN: "http://localhost:5173",
  LOG_LEVEL: "silent",
};

const apps: Awaited<ReturnType<typeof createApp>>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("storage upload purpose", () => {
  it.each([
    "training_data",
    "manufacturer_document",
    "contract_document",
    "support_document",
  ] as const)("passes explicit %s purpose to storage service", async (purpose) => {
    const createUpload = vi.fn().mockResolvedValue({ id: "object-id" });
    const app = await createApp({
      config,
      dependencies: {
        postgres: { check: () => Promise.resolve("up") },
        redis: { check: () => Promise.resolve("up") },
        objectStorage: { check: () => Promise.resolve("up") },
      },
      platform: {
        service: { createUpload } as unknown as PostgresPlatformService,
        authenticate: () => Promise.resolve({ userId: crypto.randomUUID() }),
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/storage/uploads",
      headers: { "idempotency-key": "upload-test-key" },
      payload: {
        organizationId: crypto.randomUUID(),
        purpose,
        filename: "document.pdf",
        contentType: "application/pdf",
        sizeBytes: 128,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(createUpload).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ purpose }),
      "upload-test-key",
    );
  });

  it("rejects an upload without an explicit purpose", async () => {
    const createUpload = vi.fn();
    const app = await createApp({
      config,
      dependencies: {
        postgres: { check: () => Promise.resolve("up") },
        redis: { check: () => Promise.resolve("up") },
        objectStorage: { check: () => Promise.resolve("up") },
      },
      platform: {
        service: { createUpload } as unknown as PostgresPlatformService,
        authenticate: () => Promise.resolve({ userId: crypto.randomUUID() }),
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/storage/uploads",
      headers: { "idempotency-key": "upload-test-key" },
      payload: {
        organizationId: crypto.randomUUID(),
        filename: "document.pdf",
        contentType: "application/pdf",
        sizeBytes: 128,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(createUpload).not.toHaveBeenCalled();
  });
});
