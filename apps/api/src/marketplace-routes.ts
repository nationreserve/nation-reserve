 
import type{AppFastifyInstance,AppFastifyRequest}from"./fastify-types.js";

import { z } from "zod";
import type { PostgresMarketplaceService } from "./postgres-marketplace-service.js";

const uuid = z.string().uuid();
const orgParams = z.object({ organizationId: uuid });
const conversationParams = orgParams.extend({ conversationId: uuid });
const directoryQuery = z.object({
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
const context = z.object({
  type: z.enum([
    "contract",
    "purchase_order",
    "robot_model",
    "training_project",
    "inquiry",
  ]),
  id: uuid,
});
const createConversation = z.object({
  manufacturerId: uuid,
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(10_000),
  contexts: z.array(context).max(5).default([]),
});
const sendMessage = z.object({ message: z.string().trim().min(1).max(10_000) });

export function registerMarketplaceRoutes(
  app: AppFastifyInstance,
  options: {
    service: PostgresMarketplaceService;
    authenticate(request: AppFastifyRequest): Promise<{ userId: string }>;
  },
) {
  const user = async (request: AppFastifyRequest) =>
    (await options.authenticate(request)).userId;
  app.get("/api/v1/marketplace/manufacturers", async (request) =>
    options.service.manufacturers(
      await user(request),
      directoryQuery.parse(request.query),
    ),
  );
  app.get("/api/v1/marketplace/manufacturers/:manufacturerId", async (request) =>
    options.service.manufacturer(
      await user(request),
      z.object({ manufacturerId: uuid }).parse(request.params).manufacturerId,
    ),
  );
  app.get("/api/v1/organizations/:organizationId/conversations", async (request) => {
    const p = orgParams.parse(request.params);
    return options.service.conversations(await user(request), p.organizationId);
  });
  app.post("/api/v1/organizations/:organizationId/conversations", async (request) => {
    const p = orgParams.parse(request.params);
    return options.service.createConversation(
      await user(request),
      p.organizationId,
      createConversation.parse(request.body),
      z.string().min(8).max(200).parse(request.headers["idempotency-key"]),
    );
  });
  app.get(
    "/api/v1/organizations/:organizationId/conversations/:conversationId",
    async (request) => {
      const p = conversationParams.parse(request.params);
      return options.service.conversation(
        await user(request),
        p.organizationId,
        p.conversationId,
      );
    },
  );
  app.post(
    "/api/v1/organizations/:organizationId/conversations/:conversationId/messages",
    async (request) => {
      const p = conversationParams.parse(request.params);
      return options.service.send(
        await user(request),
        p.organizationId,
        p.conversationId,
        sendMessage.parse(request.body),
        z.string().min(8).max(200).parse(request.headers["idempotency-key"]),
      );
    },
  );
  app.post(
    "/api/v1/organizations/:organizationId/conversations/:conversationId/read",
    async (request) => {
      const p = conversationParams.parse(request.params);
      return options.service.markRead(
        await user(request),
        p.organizationId,
        p.conversationId,
      );
    },
  );
}
