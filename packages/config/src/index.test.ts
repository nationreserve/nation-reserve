import { describe, expect, it } from "vitest";

import { EnvironmentValidationError, parseApiEnv } from "./index.js";

describe("parseApiEnv", () => {
  it("rejects missing secrets and service URLs", () => {
    expect(() => parseApiEnv({ NODE_ENV: "test" })).toThrow(EnvironmentValidationError);
  });

  it("requires all three private storage buckets", () => {
    const environment = {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      S3_ENDPOINT: "http://localhost:9000",
      S3_ACCESS_KEY: "key",
      S3_SECRET_KEY: "secret",
      S3_TRAINING_DATA_BUCKET: "training-data-private",
      S3_MANUFACTURER_DOCUMENTS_BUCKET: "manufacturer-documents-private",
      WEB_ORIGIN: "http://localhost:5173",
    };
    expect(() => parseApiEnv(environment)).toThrow(EnvironmentValidationError);
    expect(
      parseApiEnv({
        ...environment,
        S3_CONTRACT_DOCUMENTS_BUCKET: "contract-documents-private",
      }),
    ).toMatchObject({
      S3_TRAINING_DATA_BUCKET: "training-data-private",
      S3_MANUFACTURER_DOCUMENTS_BUCKET: "manufacturer-documents-private",
      S3_CONTRACT_DOCUMENTS_BUCKET: "contract-documents-private",
    });
  });
  it("rejects invalid values", () => {
    expect(() =>
      parseApiEnv({
        NODE_ENV: "test",
        API_PORT: "99999",
        DATABASE_URL: "not-a-url",
        REDIS_URL: "redis://localhost:6379",
        S3_ENDPOINT: "http://localhost:9000",
        S3_ACCESS_KEY: "key",
        S3_SECRET_KEY: "secret",
        S3_TRAINING_DATA_BUCKET: "training-bucket",
        S3_MANUFACTURER_DOCUMENTS_BUCKET: "manufacturer-bucket",
        S3_CONTRACT_DOCUMENTS_BUCKET: "contract-bucket",
        WEB_ORIGIN: "http://localhost:5173",
      }),
    ).toThrow(EnvironmentValidationError);
  });
});
