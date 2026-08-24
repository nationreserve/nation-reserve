import { DevelopmentEmailAdapter, parseAuthEnvironment } from "@nation-reserve/auth";
import { parseIntegrationEnvironment } from "@nation-reserve/robot-integration";
import { heartbeatConfigSchema as parseHeartbeat } from "@nation-reserve/heartbeat-domain";
import { financialConfigSchema } from "@nation-reserve/financial-domain";
import {
  FakePaymentProvider,
  StripePaymentProvider,
  paymentConfigSchema,
} from "@nation-reserve/payments";
import { operationsConfigSchema } from "@nation-reserve/operations";
import { parseApiEnv } from "@nation-reserve/config";
import { createLogger } from "@nation-reserve/logger";

import { createApp } from "./app.js";
import { createObjectStorageDependency } from "./dependencies/object-storage.js";
import { createPostgresDependency } from "./dependencies/postgres.js";
import { createRedisDependency } from "./dependencies/redis.js";
import { PostgresAuthRouteService } from "./postgres-auth-service.js";
import { PostgresIntegrationRouteService } from "./postgres-integration-service.js";
import { PostgresContractRouteService } from "./postgres-contract-service.js";
import { PostgresHeartbeatRouteService } from "./postgres-heartbeat-service.js";
import { PostgresFinancialRouteService } from "./postgres-financial-service.js";
import { PostgresPaymentService } from "./postgres-payment-service.js";
import { PostgresOperationsService } from "./postgres-operations-service.js";
import { PostgresReportingService } from "./postgres-reporting-service.js";
import { PostgresSpecificationService } from "./postgres-specification-service.js";
import { PostgresActivityService } from "./postgres-activity-service.js";
import { PostgresPlatformService } from "./postgres-platform-service.js";
import { PostgresResourceService } from "./postgres-resource-service.js";
import { PostgresAcceptanceService } from "./postgres-acceptance-service.js";
import { PostgresExpansionService } from "./postgres-expansion-service.js";
import { PostgresUserFinancialService } from "./postgres-user-financial-service.js";
import { PostgresManufacturerFinancialService } from "./postgres-manufacturer-financial-service.js";
import { PostgresMarketplaceService } from "./postgres-marketplace-service.js";
import { PostgresPortalProjectionService } from "./postgres-portal-projection-service.js";
import { PostgresGuidedTrainingService } from "./postgres-guided-training-service.js";
import { PostgresPlatformCompletionService } from "./postgres-platform-completion-service.js";

const config = parseApiEnv(process.env);
const authConfig = parseAuthEnvironment(process.env);
const integrationConfig = parseIntegrationEnvironment(process.env);
const heartbeatConfig = parseHeartbeat.parse(process.env);
const financialConfig = financialConfigSchema.parse(process.env);
const paymentConfig = paymentConfigSchema.parse(process.env);
const operationsConfig = operationsConfigSchema.parse({
  ...process.env,
  OPERATIONS_ENVIRONMENT: config.NODE_ENV,
});
const bootstrapLogger = createLogger({
  level: config.LOG_LEVEL,
  nodeEnv: config.NODE_ENV,
  service: "api-bootstrap",
});

const dependencies = {
  postgres: createPostgresDependency(config.DATABASE_URL),
  redis: createRedisDependency(config.REDIS_URL),
  objectStorage: createObjectStorageDependency({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    accessKey: config.S3_ACCESS_KEY,
    secretKey: config.S3_SECRET_KEY,
    bucket: config.S3_BUCKET,
    createBucketOnStart: config.NODE_ENV === "development",
  }),
};

const connectionResults = await Promise.allSettled(
  Object.entries(dependencies).map(async ([name, dependency]) => {
    await dependency.connect();
    bootstrapLogger.info({ dependency: name }, "Dependency connected");
  }),
);

for (const [index, result] of connectionResults.entries()) {
  if (result.status === "rejected") {
    const dependency = Object.keys(dependencies)[index];
    bootstrapLogger.warn(
      { dependency, err: result.reason },
      "Dependency unavailable at startup; readiness will remain degraded",
    );
  }
}

const authService = new PostgresAuthRouteService(
  dependencies.postgres.pool,
  authConfig,
  new DevelopmentEmailAdapter(config.NODE_ENV),
  config.NODE_ENV === "development",
);
const integrationService = new PostgresIntegrationRouteService(
  dependencies.postgres.pool,
  integrationConfig,
);
const contractService = new PostgresContractRouteService(dependencies.postgres.pool);
const heartbeatService = new PostgresHeartbeatRouteService(
  dependencies.postgres.pool,
  heartbeatConfig,
);
const financialService = new PostgresFinancialRouteService(
  dependencies.postgres.pool,
  financialConfig,
);
const paymentProvider =
  paymentConfig.PAYMENT_PROVIDER === "stripe"
    ? new StripePaymentProvider(
        paymentConfig.PAYMENT_PROVIDER_ENVIRONMENT,
        (paymentConfig.PAYMENT_PROVIDER_API_KEY ?? paymentConfig.STRIPE_SECRET_KEY)!,
        paymentConfig.PAYMENT_PROVIDER_WEBHOOK_SECRET,
        paymentConfig.PAYMENT_PROVIDER_CONNECT_WEBHOOK_SECRET,
        paymentConfig.PAYMENT_REQUEST_TIMEOUT_MS,
      )
    : new FakePaymentProvider("success", paymentConfig.PAYMENT_PROVIDER_WEBHOOK_SECRET);
const paymentService = new PostgresPaymentService(
  dependencies.postgres.pool,
  paymentProvider,
  paymentConfig,
);
const operationsService = new PostgresOperationsService(
  dependencies.postgres.pool,
  operationsConfig,
);
const reportingService = new PostgresReportingService(dependencies.postgres.pool);
const specificationService = new PostgresSpecificationService(
  dependencies.postgres.pool,
  process.env.SPECIFICATION_SYNC_ENABLED === "true",
);
const activityService = new PostgresActivityService(dependencies.postgres.pool);
const platformService = new PostgresPlatformService(dependencies.postgres.pool, {
  bucket: config.S3_BUCKET,
  createUploadUrl: (key, contentType, checksum) =>
    dependencies.objectStorage.createUploadUrl(key, contentType, checksum),
});
const resourceService = new PostgresResourceService(
  dependencies.postgres.pool,
  platformService,
);
const acceptanceService = new PostgresAcceptanceService(dependencies.postgres.pool);
const expansionService = new PostgresExpansionService(dependencies.postgres.pool);
const manufacturerFinancialService = new PostgresManufacturerFinancialService(
  dependencies.postgres.pool,
  paymentProvider,
  {
    executionEnabled: paymentConfig.PAYMENT_EXECUTION_ENABLED,
    country: paymentConfig.STRIPE_PLATFORM_COUNTRY,
    returnUrl: paymentConfig.PAYOUT_ONBOARDING_RETURN_URL,
    refreshUrl: paymentConfig.PAYOUT_ONBOARDING_REFRESH_URL,
  },
);
const marketplaceService = new PostgresMarketplaceService(dependencies.postgres.pool);
const portalProjectionService = new PostgresPortalProjectionService(dependencies.postgres.pool);
const guidedTrainingService = new PostgresGuidedTrainingService(dependencies.postgres.pool, dependencies.objectStorage);
const platformCompletionService = new PostgresPlatformCompletionService(dependencies.postgres.pool, dependencies.objectStorage);
const userFinancialService = new PostgresUserFinancialService(
  dependencies.postgres.pool,
  paymentProvider,
  {
    executionEnabled: paymentConfig.PAYMENT_EXECUTION_ENABLED,
    returnUrl: paymentConfig.PAYMENT_METHOD_SETUP_RETURN_URL,
    connectReturnUrl: paymentConfig.PAYOUT_ONBOARDING_RETURN_URL,
    connectRefreshUrl: paymentConfig.PAYOUT_ONBOARDING_REFRESH_URL,
    country: paymentConfig.STRIPE_PLATFORM_COUNTRY,
  },
);
const app = await createApp({
  config,
  dependencies,
  auth: {
    service: authService,
    webOrigin: config.WEB_ORIGIN,
    cookieName: authConfig.cookieName,
    cookieSecure: authConfig.cookieSecure,
    refreshTtlSeconds: authConfig.refreshTokenTtlSeconds,
  },
  resources: {
    service: resourceService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), {
          code: "AUTHENTICATION_REQUIRED",
          statusCode: 401,
        });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  marketplace: {
    service: marketplaceService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), {
          code: "AUTHENTICATION_REQUIRED",
          statusCode: 401,
        });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  platformCompletion: {
    service: platformCompletionService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer ")) throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), { code: "AUTHENTICATION_REQUIRED", statusCode: 401 });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  guidedTraining: {
    service: guidedTrainingService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer ")) throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), { code: "AUTHENTICATION_REQUIRED", statusCode: 401 });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  portalProjections: {
    service: portalProjectionService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), {
          code: "AUTHENTICATION_REQUIRED",
          statusCode: 401,
        });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  manufacturerFinancial: {
    service: manufacturerFinancialService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), {
          code: "AUTHENTICATION_REQUIRED",
          statusCode: 401,
        });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  userFinancial: {
    service: userFinancialService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), {
          code: "AUTHENTICATION_REQUIRED",
          statusCode: 401,
        });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  expansion: {
    service: expansionService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), {
          code: "AUTHENTICATION_REQUIRED",
          statusCode: 401,
        });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  acceptance: {
    service: acceptanceService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), {
          code: "AUTHENTICATION_REQUIRED",
          statusCode: 401,
        });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId, sessionId: principal.sessionId };
    },
  },
  platform: {
    service: platformService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), {
          code: "AUTHENTICATION_REQUIRED",
          statusCode: 401,
        });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  activity: {
    service: activityService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), {
          code: "AUTHENTICATION_REQUIRED",
          statusCode: 401,
        });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  integration: {
    service: integrationService,
    authenticateHuman: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), {
          code: "AUTHENTICATION_REQUIRED",
          statusCode: 401,
        });
      const principal = await authService.authenticate(authorization.slice(7));
      if (!principal.emailVerified)
        throw Object.assign(new Error("EMAIL_NOT_VERIFIED"), {
          code: "EMAIL_NOT_VERIFIED",
          statusCode: 403,
        });
      return { userId: principal.userId };
    },
  },
  specification: {
    service: specificationService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), { statusCode: 401 });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  reporting: {
    service: reportingService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), { statusCode: 401 });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  operations: {
    service: operationsService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), { statusCode: 401 });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId, sessionId: principal.sessionId };
    },
    rateLimit: async (userId) =>
      dependencies.redis.consumeRateLimit(
        `rwp:admin:${userId}:${Math.floor(Date.now() / 60000)}`,
        120,
        120,
      ),
  },
  payments: {
    service: paymentService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), { statusCode: 401 });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  financial: {
    service: financialService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), { statusCode: 401 });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  heartbeat: {
    service: heartbeatService,
    maxBodyBytes: heartbeatConfig.HEARTBEAT_MAX_BODY_BYTES,
    rateLimit: async (credentialPrefix, sourceIp) => {
      const minute = Math.floor(Date.now() / 60000);
      const [robot, ip] = await Promise.all([
        dependencies.redis.consumeRateLimit(
          `rwp:heartbeat:credential:${credentialPrefix}:${minute}`,
          heartbeatConfig.HEARTBEAT_RATE_LIMIT_PER_ROBOT,
          120,
        ),
        dependencies.redis.consumeRateLimit(
          `rwp:heartbeat:ip:${sourceIp}:${minute}`,
          heartbeatConfig.HEARTBEAT_RATE_LIMIT_PER_MANUFACTURER,
          120,
        ),
      ]);
      return robot && ip;
    },
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), { statusCode: 401 });
      const principal = await authService.authenticate(authorization.slice(7));
      return { userId: principal.userId };
    },
  },
  contracts: {
    service: contractService,
    authenticate: async (request) => {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer "))
        throw Object.assign(new Error("AUTHENTICATION_REQUIRED"), {
          code: "AUTHENTICATION_REQUIRED",
          statusCode: 401,
        });
      const principal = await authService.authenticate(authorization.slice(7));
      if (!principal.emailVerified)
        throw Object.assign(new Error("EMAIL_NOT_VERIFIED"), {
          code: "EMAIL_NOT_VERIFIED",
          statusCode: 403,
        });
      return { userId: principal.userId };
    },
  },
});
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  app.log.info({ signal }, "Graceful shutdown started");

  await app.close();
  await Promise.allSettled(
    Object.values(dependencies).map((dependency) => dependency.close()),
  );
  app.log.info("Graceful shutdown complete");
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.API_HOST, port: config.API_PORT });
} catch (error) {
  app.log.fatal({ err: error }, "API failed to start");
  await shutdown("STARTUP_FAILURE");
  process.exitCode = 1;
}
