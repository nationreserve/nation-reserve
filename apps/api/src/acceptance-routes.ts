/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { PostgresAcceptanceService } from "./postgres-acceptance-service.js";

const uuid = z.string().uuid();
export interface AcceptanceRouteOptions { service: PostgresAcceptanceService; authenticate(request: FastifyRequest): Promise<{ userId: string; sessionId: string }> }
export async function registerAcceptanceRoutes(app: FastifyInstance<any, any, any, any>, options: AcceptanceRouteOptions) {
  const principal = async (request: FastifyRequest) => options.authenticate(request);
  const actor = async (request: FastifyRequest) => (await principal(request)).userId;
  const stepUp = (request: FastifyRequest) => typeof request.headers["x-admin-step-up"] === "string" ? request.headers["x-admin-step-up"] : undefined;
  app.get("/api/v1/platform/acceptance/overview", async (r) => options.service.overview(await actor(r)));
  app.get("/api/v1/platform/acceptance/journeys", async (r) => options.service.journeys(await actor(r)));
  app.get("/api/v1/platform/acceptance/journeys/:journeyId", async (r) => options.service.journeys(await actor(r), z.object({ journeyId: z.string().min(1).max(100) }).parse(r.params).journeyId));
  app.get("/api/v1/platform/acceptance/gaps", async (r) => options.service.gaps(await actor(r)));
  app.get("/api/v1/platform/acceptance/gaps/:gapId", async (r) => options.service.gaps(await actor(r), z.object({ gapId: z.string().min(1).max(100) }).parse(r.params).gapId));
  app.get("/api/v1/platform/acceptance/waivers", async (r) => options.service.waivers(await actor(r)));
  app.get("/api/v1/platform/acceptance/runs", async (r) => options.service.runs(await actor(r)));
  app.get("/api/v1/platform/acceptance/runs/:runId", async (r) => options.service.runs(await actor(r), z.object({ runId: uuid }).parse(r.params).runId));
  app.post("/api/v1/platform/acceptance/runs", async (r) => options.service.startRun(await actor(r), z.object({ environment: z.enum(["local","development","test","staging","production"]).default("production") }).parse(r.body ?? {}).environment));
  app.post("/api/v1/platform/acceptance/waivers", async (r) => { const p=await principal(r); return options.service.createWaiver(p.userId,p.sessionId,stepUp(r),z.object({ gapId: z.string().min(1), reason: z.string().min(20), temporaryBehavior: z.string().min(20), risk: z.string().min(20), expiresAt: z.string().datetime(), followUpIssue: z.string().min(1), affectedOrganizations: z.array(uuid).default([]) }).parse(r.body)); });
  app.post("/api/v1/platform/acceptance/waivers/:waiverId/revoke", async (r) => { const p=await principal(r); return options.service.revokeWaiver(p.userId,p.sessionId,stepUp(r),z.object({ waiverId: uuid }).parse(r.params).waiverId); });
}


