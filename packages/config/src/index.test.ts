import { describe, expect, it } from "vitest";

import { EnvironmentValidationError, parseApiEnv } from "./index.js";

describe("parseApiEnv", () => {
  it("rejects missing secrets and service URLs", () => {
    expect(() => parseApiEnv({ NODE_ENV: "test" })).toThrow(EnvironmentValidationError);
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
        S3_BUCKET: "bucket",
        WEB_ORIGIN: "http://localhost:5173",
      }),
    ).toThrow(EnvironmentValidationError);
  });
});
