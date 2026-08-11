import { z } from "zod";
const seconds = z.coerce.number().int().positive();
export const integrationConfigSchema = z.object({
  apiKeyPepper: z.string().min(32),
  credentialDefaultTtlSeconds: seconds.default(31_536_000),
  credentialRotationOverlapSeconds: seconds.default(86_400),
  sandboxRateLimit: z.coerce.number().int().positive().default(300),
  productionRateLimit: z.coerce.number().int().positive().default(1_000),
  registrationIdempotencyTtlSeconds: seconds.default(86_400),
  transferCodeTtlSeconds: seconds.default(604_800),
  ownershipClaimTtlSeconds: seconds.default(604_800),
  activationSessionTtlSeconds: seconds.default(3_600),
  activationMaxClockSkewSeconds: seconds.default(300),
  activationNonceTtlSeconds: seconds.default(3_600),
  integrationLogRetentionDays: z.coerce.number().int().positive().default(90),
  activationTestRetentionDays: z.coerce.number().int().positive().default(365),
});
export type IntegrationConfig = z.infer<typeof integrationConfigSchema>;
export function parseIntegrationEnvironment(env: Record<string, string | undefined>) {
  const production = env.NODE_ENV === "production";
  const pepper = env.MANUFACTURER_API_KEY_PEPPER ??
    (production ? undefined : "development-manufacturer-pepper-change-me");
  const parsed = integrationConfigSchema.parse({
    apiKeyPepper: pepper,
    credentialDefaultTtlSeconds: env.MANUFACTURER_CREDENTIAL_DEFAULT_TTL,
    credentialRotationOverlapSeconds: env.MANUFACTURER_CREDENTIAL_ROTATION_OVERLAP,
    sandboxRateLimit: env.MANUFACTURER_SANDBOX_RATE_LIMIT,
    productionRateLimit: env.MANUFACTURER_PRODUCTION_RATE_LIMIT,
    registrationIdempotencyTtlSeconds: env.ROBOT_REGISTRATION_IDEMPOTENCY_TTL,
    transferCodeTtlSeconds: env.ROBOT_TRANSFER_CODE_TTL,
    ownershipClaimTtlSeconds: env.ROBOT_OWNERSHIP_CLAIM_TTL,
    activationSessionTtlSeconds: env.ACTIVATION_SESSION_TTL,
    activationMaxClockSkewSeconds: env.ACTIVATION_MAX_CLOCK_SKEW_SECONDS,
    activationNonceTtlSeconds: env.ACTIVATION_NONCE_TTL,
    integrationLogRetentionDays: env.INTEGRATION_LOG_RETENTION_DAYS,
    activationTestRetentionDays: env.ACTIVATION_TEST_RETENTION_DAYS,
  });
  if (production && parsed.apiKeyPepper.includes("development")) throw new Error("Production manufacturer pepper required.");
  return parsed;
}

