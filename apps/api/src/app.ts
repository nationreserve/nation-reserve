/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import cors from "@fastify/cors";
import type { ApiConfig } from "@nation-reserve/config";
import { createLogger, type Logger } from "@nation-reserve/logger";
import type {
  HealthResponse,
  ReadinessDependencies as ReadinessState,
  ReadinessResponse,
} from "@nation-reserve/types";
import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault,
} from "fastify";

import type { ReadinessDependencies } from "./dependencies/types.js";
import { registerErrorHandler } from "./error-handler.js";
import { registerAuthRoutes, type AuthRouteOptions } from "./auth-routes.js";
import {
  registerIntegrationRoutes,
  type IntegrationRouteOptions,
} from "./integration-routes.js";
import {
  registerContractRoutes,
  type ContractRouteOptions,
} from "./contract-routes.js";
import {
  registerHeartbeatRoutes,
  type HeartbeatRouteOptions,
} from "./heartbeat-routes.js";
import {
  registerFinancialRoutes,
  type FinancialRouteService,
} from "./financial-routes.js";
import { registerPaymentRoutes } from "./payment-routes.js";
import type { PostgresPaymentService } from "./postgres-payment-service.js";
import { registerOperationsRoutes } from "./operations-routes.js";
import type { PostgresOperationsService } from "./postgres-operations-service.js";
import { registerReportingRoutes } from "./reporting-routes.js";
import type { PostgresReportingService } from "./postgres-reporting-service.js";
import { registerSpecificationRoutes } from "./specification-routes.js";
import type { PostgresSpecificationService } from "./postgres-specification-service.js";
import { ApiMetricsRegistry } from "./operations-instrumentation.js";
import { registerActivityRoutes } from "./activity-routes.js";
import { registerPlatformRoutes } from "./platform-routes.js";
import { registerResourceRoutes } from "./resource-routes.js";
import type { PostgresActivityService } from "./postgres-activity-service.js";
import type { PostgresPlatformService } from "./postgres-platform-service.js";
import type { PostgresResourceService } from "./postgres-resource-service.js";
import {
  registerAcceptanceRoutes,
  type AcceptanceRouteOptions,
} from "./acceptance-routes.js";
import { registerExpansionRoutes, type ExpansionService } from "./expansion-routes.js";
import { registerUserFinancialRoutes } from "./user-financial-routes.js";
import type { PostgresUserFinancialService } from "./postgres-user-financial-service.js";
import { registerManufacturerFinancialRoutes } from "./manufacturer-financial-routes.js";
import type { PostgresManufacturerFinancialService } from "./postgres-manufacturer-financial-service.js";
import { registerMarketplaceRoutes } from "./marketplace-routes.js";
import type { PostgresMarketplaceService } from "./postgres-marketplace-service.js";
import { registerPortalProjectionRoutes } from "./portal-projection-routes.js";
import type { PostgresPortalProjectionService } from "./postgres-portal-projection-service.js";
import { registerGuidedTrainingRoutes } from "./guided-training-routes.js";
import type { PostgresGuidedTrainingService } from "./postgres-guided-training-service.js";
import { registerPlatformCompletionRoutes } from "./platform-completion-routes.js";
import type { PostgresPlatformCompletionService } from "./postgres-platform-completion-service.js";

export interface AppOptions {
  config: ApiConfig;
  dependencies: ReadinessDependencies;
  auth?: AuthRouteOptions;
  integration?: IntegrationRouteOptions;
  contracts?: ContractRouteOptions;
  heartbeat?: HeartbeatRouteOptions;
  financial?: {
    service: FinancialRouteService;
    authenticate: HeartbeatRouteOptions["authenticate"];
  };
  payments?: {
    service: PostgresPaymentService;
    authenticate: HeartbeatRouteOptions["authenticate"];
  };
  operations?: {
    service: PostgresOperationsService;
    authenticate(
      request: FastifyRequest,
    ): Promise<{ userId: string; sessionId: string }>;
    rateLimit(userId: string): Promise<boolean>;
  };
  reporting?: {
    service: PostgresReportingService;
    authenticate(request: FastifyRequest): Promise<{ userId: string }>;
  };
  specification?: {
    service: PostgresSpecificationService;
    authenticate(request: FastifyRequest): Promise<{ userId: string }>;
  };
  activity?: {
    service: PostgresActivityService;
    authenticate(request: FastifyRequest): Promise<{ userId: string }>;
  };
  platform?: {
    service: PostgresPlatformService;
    authenticate(request: FastifyRequest): Promise<{ userId: string }>;
  };
  resources?: {
    service: PostgresResourceService;
    authenticate(request: FastifyRequest): Promise<{ userId: string }>;
  };
  acceptance?: AcceptanceRouteOptions;
  expansion?: {
    service: ExpansionService;
    authenticate(request: FastifyRequest): Promise<{ userId: string }>;
  };
  userFinancial?: {
    service: PostgresUserFinancialService;
    authenticate(request: FastifyRequest): Promise<{ userId: string }>;
  };
  manufacturerFinancial?: {
    service: PostgresManufacturerFinancialService;
    authenticate(request: FastifyRequest): Promise<{ userId: string }>;
  };
  marketplace?: {
    service: PostgresMarketplaceService;
    authenticate(request: FastifyRequest): Promise<{ userId: string }>;
  };
  portalProjections?: {
    service: PostgresPortalProjectionService;
    authenticate(request: FastifyRequest): Promise<{ userId: string }>;
  };
  platformCompletion?: {
    service: PostgresPlatformCompletionService;
    authenticate(request: FastifyRequest): Promise<{ userId: string }>;
  };
  guidedTraining?: {
    service: PostgresGuidedTrainingService;
    authenticate(request: FastifyRequest): Promise<{ userId: string }>;
  };
}

type AppInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  Logger
>;

export async function createApp(options: AppOptions): Promise<AppInstance> {
  const apiMetrics = new ApiMetricsRegistry();
  const requestStartedAt = new WeakMap<FastifyRequest, bigint>();
  const logger = createLogger({
    level: options.config.LOG_LEVEL,
    nodeEnv: options.config.NODE_ENV,
    service: "api",
  });
  const app = Fastify({
    loggerInstance: logger,
    genReqId: (request) => {
      const supplied = request.headers["x-request-id"];
      return typeof supplied === "string" && supplied.length <= 128
        ? supplied
        : crypto.randomUUID();
    },
  });

  await app.register(cors, {
    origin: options.config.WEB_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  registerErrorHandler(app);
  app.addHook("onRequest", async (request) => {
    requestStartedAt.set(request, process.hrtime.bigint());
    await Promise.resolve();
  });
  app.addHook("onResponse", async (request, reply) => {
    const started = requestStartedAt.get(request);
    if (started === undefined) return;
    apiMetrics.observe(
      request.method,
      request.routeOptions.url ?? "unmatched",
      reply.statusCode,
      Number(process.hrtime.bigint() - started) / 1_000_000_000,
    );
  });
  if (options.operations)
    app.addHook("onRequest", async (request, reply) => {
      const decision = await options.operations!.service.maintenanceDecision(
        request.url,
        request.method,
      );
      if (decision.blocked)
        return reply
          .status(503)
          .send({
            error: {
              code: "MAINTENANCE_MODE",
              message: decision.message ?? "Operation temporarily unavailable",
              requestId: request.id,
            },
            maintenance: { scope: decision.scope, subsystem: decision.subsystem },
          });
    });

  if (options.auth) {
    registerAuthRoutes(app, options.auth);
  }

  if (options.integration) {
    registerIntegrationRoutes(app, options.integration);
  }

  if (options.financial) {
    registerFinancialRoutes(app, options.financial);
  }

  if (options.operations) {
    registerOperationsRoutes(app, { ...options.operations, apiMetrics });
  }

  if (options.specification) {
    registerSpecificationRoutes(app, options.specification);
  }

  if (options.reporting) {
    registerReportingRoutes(app, options.reporting);
  }

  if (options.activity) {
    registerActivityRoutes(app, options.activity);
  }

  if (options.platform) {
    registerPlatformRoutes(app, options.platform);
  }

  if (options.resources) {
    registerResourceRoutes(app, options.resources);
  }

  if (options.acceptance) {
    registerAcceptanceRoutes(app, options.acceptance);
  }

  if (options.marketplace) {
    registerMarketplaceRoutes(app, options.marketplace);
  }

  if (options.platformCompletion) {
    registerPlatformCompletionRoutes(app, options.platformCompletion);
  }

  if (options.guidedTraining) {
    registerGuidedTrainingRoutes(app, options.guidedTraining);
  }

  if (options.portalProjections) {
    registerPortalProjectionRoutes(app, options.portalProjections);
  }

  if (options.manufacturerFinancial) {
    registerManufacturerFinancialRoutes(app, options.manufacturerFinancial);
  }

  if (options.userFinancial) {
    registerUserFinancialRoutes(app, options.userFinancial);
  }

  if (options.expansion) {
    registerExpansionRoutes(app, options.expansion);
  }

  if (options.payments) {
    registerPaymentRoutes(app, options.payments);
  }

  if (options.heartbeat) {
    registerHeartbeatRoutes(app, options.heartbeat);
  }

  if (options.contracts) {
    registerContractRoutes(app, options.contracts);
  }
  app.get("/live", () => ({
    status: "alive",
    service: "api",
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  }));
  app.get<{ Reply: HealthResponse }>("/health", () => ({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  }));

  app.get<{ Reply: ReadinessResponse }>("/ready", async (_request, reply) => {
    const [postgres, redis, objectStorage] = await Promise.all([
      options.dependencies.postgres.check(),
      options.dependencies.redis.check(),
      options.dependencies.objectStorage.check(),
    ]);
    const dependencies: ReadinessState = { postgres, redis, objectStorage };
    const isReady = Object.values(dependencies).every((state) => state === "up");
    const response: ReadinessResponse = {
      status: isReady ? "ready" : "not_ready",
      dependencies,
      timestamp: new Date().toISOString(),
    };

    return reply.status(isReady ? 200 : 503).send(response);
  });

  return app;
}
