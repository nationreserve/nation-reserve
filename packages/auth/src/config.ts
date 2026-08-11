import { z } from "zod";

const duration = z.coerce.number().int().positive();
export const authConfigSchema = z.object({
  accessTokenTtlSeconds: duration.default(900),
  refreshTokenTtlSeconds: duration.default(2_592_000),
  emailVerificationTtlSeconds: duration.default(86_400),
  passwordResetTtlSeconds: duration.default(3_600),
  invitationTtlSeconds: duration.default(604_800),
  jwtIssuer: z.string().min(3),
  jwtAudience: z.string().min(3),
  signingKey: z.string().min(32),
  cookieName: z.string().min(1).default("rwp_refresh"),
  cookieSecure: z.boolean().default(true),
  cookieSameSite: z.enum(["strict", "lax", "none"]).default("lax"),
  argon2MemoryCost: z.number().int().min(19_456).default(65_536),
  argon2TimeCost: z.number().int().min(2).default(3),
  argon2Parallelism: z.number().int().min(1).default(1),
  failedLoginThreshold: z.number().int().min(3).default(5),
  lockDurationSeconds: duration.default(900),
});
export type AuthConfig = z.infer<typeof authConfigSchema>;

export function parseAuthEnvironment(env: Record<string, string | undefined>) {
  const production = env.NODE_ENV === "production";
  const signingKey = env.AUTH_SIGNING_KEY ??
    (production ? undefined : "development-only-signing-key-change-me-now");
  const parsed = authConfigSchema.parse({
    accessTokenTtlSeconds: env.AUTH_ACCESS_TOKEN_TTL,
    refreshTokenTtlSeconds: env.AUTH_REFRESH_TOKEN_TTL,
    emailVerificationTtlSeconds: env.AUTH_EMAIL_VERIFICATION_TTL,
    passwordResetTtlSeconds: env.AUTH_PASSWORD_RESET_TTL,
    invitationTtlSeconds: env.AUTH_INVITATION_TTL,
    jwtIssuer: env.AUTH_JWT_ISSUER ?? "nation-reserve",
    jwtAudience: env.AUTH_JWT_AUDIENCE ?? "roboworkpool",
    signingKey,
    cookieName: env.AUTH_COOKIE_NAME,
    cookieSecure: env.AUTH_COOKIE_SECURE ? env.AUTH_COOKIE_SECURE === "true" : production,
    cookieSameSite: env.AUTH_COOKIE_SAME_SITE,
    argon2MemoryCost: env.AUTH_ARGON2_MEMORY_COST ? Number(env.AUTH_ARGON2_MEMORY_COST) : undefined,
    argon2TimeCost: env.AUTH_ARGON2_TIME_COST ? Number(env.AUTH_ARGON2_TIME_COST) : undefined,
    argon2Parallelism: env.AUTH_ARGON2_PARALLELISM ? Number(env.AUTH_ARGON2_PARALLELISM) : undefined,
    failedLoginThreshold: env.AUTH_FAILED_LOGIN_THRESHOLD ? Number(env.AUTH_FAILED_LOGIN_THRESHOLD) : undefined,
    lockDurationSeconds: env.AUTH_LOCK_DURATION ? Number(env.AUTH_LOCK_DURATION) : undefined,
  });
  if (production && (!parsed.cookieSecure || parsed.signingKey.includes("development"))) {
    throw new Error("Production auth requires secure cookies and a production signing key.");
  }
  return parsed;
}

