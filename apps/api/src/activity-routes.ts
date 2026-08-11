/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { PostgresActivityService } from "./postgres-activity-service.js";

const params = z.object({ organizationId: z.string().uuid() });
const query = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  category: z.enum(["organization","robot","ownership","manufacturer","hiring_company","robot_owner","training","training_equipment","training_session","training_package","work_order","opportunity","messaging","contract","assignment","scheduling","heartbeat","verified_operating_time","financial","invoice","payment","statement","payout","support","dispute","incident","notification","administration","deployment","release","migration","acceptance","operations","security","permissions","company","owner","system"]).optional(),
  severity: z.enum(["info","warning","critical"]).optional(),
  entityType: z.string().trim().min(1).max(80).optional(), entityId: z.string().uuid().optional(),
  from: z.coerce.date().optional(), to: z.coerce.date().optional(), cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50), sort: z.enum(["asc","desc"]).default("desc"),
}).refine(value => !value.from || !value.to || value.from <= value.to, { message: "from must not be after to" });

export async function registerActivityRoutes(app: FastifyInstance<any,any,any,any>, options: {
  service: PostgresActivityService;
  authenticate(request: FastifyRequest): Promise<{ userId: string }>;
}) {
  app.get("/api/v1/organizations/:organizationId/activity", async request => {
    const actor = await options.authenticate(request);
    return options.service.listForOrganization(actor.userId, params.parse(request.params).organizationId, query.parse(request.query));
  });
  app.get("/api/v1/activity", async request => {
    const actor = await options.authenticate(request);
    return options.service.listForPlatform(actor.userId, query.parse(request.query));
  });
}


