import { z } from "zod";

const environmentBoolean=z.preprocess(value=>typeof value==="string"?(value==="true"?true:value==="false"?false:value):value,z.boolean());

const apiEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEPLOY_ENVIRONMENT: z.enum(["local","development","test","preview","staging","production"]).default("local"),
  PAYMENT_PROVIDER: z.enum(["fake","stripe"]).default("fake"),
  PAYMENT_PROVIDER_ENVIRONMENT: z.enum(["test","live"]).default("test"),
  PAYMENT_EXECUTION_ENABLED: environmentBoolean.default(false),
  COOKIE_SECURE: environmentBoolean.default(false),
  TIMELINE_PROJECTION_ENABLED: environmentBoolean.default(true),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(5000).max(300000).default(30000),
  API_HOST: z.string().min(1).default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  REDIS_URL: z.string().url().startsWith("redis://"),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_ACCESS_KEY: z.string().min(1, "S3_ACCESS_KEY is required"),
  S3_SECRET_KEY: z.string().min(1, "S3_SECRET_KEY is required"),
  S3_BUCKET: z.string().min(3),
  WEB_ORIGIN: z.string().url(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
}).superRefine((value,ctx)=>{
  if(value.NODE_ENV!=="production")return;
  const issue=(path:string,message:string)=>ctx.addIssue({code:"custom",path:[path],message});
  if(!value.COOKIE_SECURE)issue("COOKIE_SECURE","Secure cookies are mandatory in optimized cloud runtimes.");
  if(!value.TIMELINE_PROJECTION_ENABLED)issue("TIMELINE_PROJECTION_ENABLED","Mandatory Appendix O projection cannot be disabled.");
  if(!value.WEB_ORIGIN.startsWith("https://"))issue("WEB_ORIGIN","Cloud runtime origin must use HTTPS.");
  if(!value.S3_ENDPOINT.startsWith("https://"))issue("S3_ENDPOINT","Cloud runtime storage endpoint must use HTTPS.");
  if(value.DEPLOY_ENVIRONMENT!=="production")return;
  if(value.PAYMENT_PROVIDER!=="stripe")issue("PAYMENT_PROVIDER","Fake payment provider is forbidden in production.");
  if(value.PAYMENT_PROVIDER_ENVIRONMENT!=="live")issue("PAYMENT_PROVIDER_ENVIRONMENT","Production requires the explicitly approved live provider environment.");
  if(!value.PAYMENT_EXECUTION_ENABLED)issue("PAYMENT_EXECUTION_ENABLED","Production payment execution must be explicitly enabled after approval.");
});

export type ApiConfig = z.infer<typeof apiEnvironmentSchema>;

export class EnvironmentValidationError extends Error {
  public constructor(public readonly issues: string[]) {
    super(`Invalid environment configuration:\n${issues.join("\n")}`);
    this.name = "EnvironmentValidationError";
  }
}

export function parseApiEnv(
  environment: Record<string, string | undefined>,
): ApiConfig {
  const result = apiEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `- ${issue.path.join(".") || "environment"}: ${issue.message}`,
    );
    throw new EnvironmentValidationError(issues);
  }

  return result.data;
}






