import { z } from "zod";
const envBoolean = z.union([
  z.boolean(),
  z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1"),
]);
export const paymentConfigSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PAYMENT_PROVIDER: z.enum(["stripe", "fake"]).default("fake"),
    PAYMENT_EXECUTION_ENABLED: envBoolean.default(false),
    PAYMENT_PROVIDER_ENVIRONMENT: z.enum(["test", "live"]).default("test"),
    PAYMENT_PROVIDER_API_KEY: z.string().optional(),
    PAYMENT_PROVIDER_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    PAYMENT_PROVIDER_WEBHOOK_SECRET: z
      .string()
      .min(16)
      .default("fake-webhook-secret-change-me"),
    PAYMENT_PROVIDER_CONNECT_WEBHOOK_SECRET: z.string().min(16).optional(),
    STRIPE_CONNECT_CLIENT_ID: z.string().optional(),
    STRIPE_CONNECT_ACCOUNT_TYPE: z.enum(["express", "standard"]).default("express"),
    STRIPE_PLATFORM_COUNTRY: z.string().length(2).default("US"),
    STRIPE_PLATFORM_CURRENCY: z.literal("USD").default("USD"),
    PAYMENT_METHOD_SETUP_RETURN_URL: z
      .string()
      .url()
      .default("http://localhost:5173/settings/billing"),
    IDENTITY_VERIFICATION_RETURN_URL: z
      .string()
      .url()
      .default("http://localhost:5173/account/verification"),
    PAYOUT_ONBOARDING_RETURN_URL: z
      .string()
      .url()
      .default("http://localhost:5173/settings/payouts"),
    PAYOUT_ONBOARDING_REFRESH_URL: z
      .string()
      .url()
      .default("http://localhost:5173/settings/payouts"),
    PAYMENT_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    PAYMENT_RECONCILIATION_INTERVAL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(300),
    PAYMENT_WEBHOOK_RETENTION_DAYS: z.coerce.number().int().positive().default(730),
    PAYMENT_ATTEMPT_RETENTION_DAYS: z.coerce.number().int().positive().default(2555),
    COMPANY_AUTOPAY_ENABLED_DEFAULT: envBoolean.default(false),
    COMPANY_PAYMENT_RETRY_LIMIT: z.coerce.number().int().nonnegative().default(3),
    COMPANY_PAYMENT_RETRY_INTERVAL_HOURS: z.coerce
      .number()
      .int()
      .positive()
      .default(24),
    OWNER_MINIMUM_PAYOUT_MINOR_UNITS: z.coerce.number().int().positive().default(2500),
    OWNER_PAYOUT_FREQUENCY: z
      .enum(["weekly", "semimonthly", "monthly", "manual"])
      .default("weekly"),
    OWNER_PAYOUT_RETRY_LIMIT: z.coerce.number().int().nonnegative().default(3),
  })
  .superRefine((v, c) => {
    if (
      v.PAYMENT_EXECUTION_ENABLED &&
      v.PAYMENT_PROVIDER === "stripe" &&
      !(v.PAYMENT_PROVIDER_API_KEY ?? v.STRIPE_SECRET_KEY)
    )
      c.addIssue({
        code: "custom",
        message: "Enabled Stripe execution requires an API key",
      });
    if (
      v.NODE_ENV === "production" &&
      v.PAYMENT_PROVIDER === "stripe" &&
      !v.PAYMENT_PROVIDER_CONNECT_WEBHOOK_SECRET
    )
      c.addIssue({
        code: "custom",
        message:
          "Production Stripe Connect requires PAYMENT_PROVIDER_CONNECT_WEBHOOK_SECRET",
      });
    if (v.NODE_ENV === "production" && v.PAYMENT_PROVIDER !== "stripe")
      c.addIssue({
        code: "custom",
        message: "Fake payment provider is forbidden in production",
      });
    if (v.NODE_ENV === "production" && v.PAYMENT_PROVIDER_ENVIRONMENT !== "live")
      c.addIssue({
        code: "custom",
        message: "Production requires live provider environment",
      });
    if (
      v.NODE_ENV === "production" &&
      (v.PAYMENT_PROVIDER_API_KEY ?? v.STRIPE_SECRET_KEY)?.startsWith("sk_test_")
    )
      c.addIssue({ code: "custom", message: "Stripe test key rejected in production" });
    if (
      v.NODE_ENV !== "production" &&
      (v.PAYMENT_PROVIDER_API_KEY ?? v.STRIPE_SECRET_KEY)?.startsWith("sk_live_")
    )
      c.addIssue({
        code: "custom",
        message: "Stripe live key rejected outside production",
      });
    for (const url of [
      v.PAYMENT_METHOD_SETUP_RETURN_URL,
      v.IDENTITY_VERIFICATION_RETURN_URL,
      v.PAYOUT_ONBOARDING_RETURN_URL,
      v.PAYOUT_ONBOARDING_REFRESH_URL,
    ])
      if (v.NODE_ENV === "production" && !url.startsWith("https://"))
        c.addIssue({ code: "custom", message: "Production return URLs require HTTPS" });
  });
export type PaymentConfig = z.infer<typeof paymentConfigSchema>;
