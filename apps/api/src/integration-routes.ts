/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-base-to-string */
import { parseCredential, type IntegrationPrincipal } from "@nation-reserve/robot-integration";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

export interface IntegrationRouteService {
  authenticateCredential(raw: string): Promise<IntegrationPrincipal>;
  application(userId: string, organizationId: string): Promise<object>;
  saveApplication(userId: string, organizationId: string, input: object): Promise<object>;
  submitApplication(userId: string, organizationId: string): Promise<void>;
  reviewApplication(userId: string, applicationId: string, action: string, reason?: string): Promise<void>;
  credentials(userId: string, organizationId: string): Promise<object[]>;
  createCredential(userId: string, organizationId: string, input: object): Promise<object>;
  rotateCredential(userId: string, organizationId: string, credentialId: string): Promise<object>;
  revokeCredential(userId: string, organizationId: string, credentialId: string, reason: string): Promise<void>;
  models(userId: string, organizationId: string): Promise<object[]>;
  createModel(userId: string, organizationId: string, input: object): Promise<object>;
  submitModel(userId: string, organizationId: string, modelId: string): Promise<void>;
  reviewModel(userId: string, modelId: string, action: string, reason?: string): Promise<void>;
  registerRobot(principal: IntegrationPrincipal, input: object): Promise<object>;
  registration(principal: IntegrationPrincipal, id: string): Promise<object>;
  integrationRobot(principal: IntegrationPrincipal, id: string): Promise<object>;
  manufacturerRobots(userId: string, organizationId: string): Promise<object[]>;
  robot(userId: string, robotId: string): Promise<object>;
  createTransferCode(userId: string, organizationId: string, robotId: string): Promise<object>;
  claimRobot(userId: string, robotId: string, input: object): Promise<object>;
  startActivation(principal: IntegrationPrincipal, robotId: string): Promise<object>;
  testActivation(principal: IntegrationPrincipal, activationId: string, input: object): Promise<object>;
  completeActivation(principal: IntegrationPrincipal, activationId: string): Promise<object>;
  platformList(userId: string, resource: string): Promise<object[]>;
}
export interface IntegrationRouteOptions {
  service: IntegrationRouteService;
  authenticateHuman(request: FastifyRequest): Promise<{ userId: string }>;
}
function apiKey(request: FastifyRequest) {
  const value = request.headers["x-api-key"];
  if (typeof value !== "string") throw error("MANUFACTURER_AUTHENTICATION_REQUIRED", 401);
  try { parseCredential(value); } catch { throw error("MANUFACTURER_AUTHENTICATION_FAILED", 401); }
  return value;
}
function error(code: string, statusCode: number) {
  return Object.assign(new Error(code), { code, statusCode });
}
export async function registerIntegrationRoutes(
  app: FastifyInstance<any, any, any, any>, options: IntegrationRouteOptions,
) {
  const human = async (request: FastifyRequest) => options.authenticateHuman(request);
  const integration = async (request: FastifyRequest) => options.service.authenticateCredential(apiKey(request));
  const org = "/api/v1/organizations/:organizationId/manufacturer";
  app.get<{ Params: { organizationId: string } }>(`${org}/application`, async (r) =>
    options.service.application((await human(r)).userId, r.params.organizationId));
  app.patch<{ Params: { organizationId: string } }>(`${org}/application`, async (r) =>
    options.service.saveApplication((await human(r)).userId, r.params.organizationId, r.body as object));
  app.post<{ Params: { organizationId: string } }>(`${org}/application/submit`, async (r, reply) => {
    await options.service.submitApplication((await human(r)).userId, r.params.organizationId);
    return reply.status(204).send();
  });
  app.get<{ Params: { organizationId: string } }>(`${org}/credentials`, async (r) =>
    options.service.credentials((await human(r)).userId, r.params.organizationId));
  app.post<{ Params: { organizationId: string } }>(`${org}/credentials`, async (r, reply) =>
    reply.status(201).send(await options.service.createCredential((await human(r)).userId,
      r.params.organizationId, r.body as object)));
  app.post<{ Params: { organizationId: string; credentialId: string } }>(
    `${org}/credentials/:credentialId/rotate`, async (r) =>
      options.service.rotateCredential((await human(r)).userId, r.params.organizationId, r.params.credentialId));
  app.delete<{ Params: { organizationId: string; credentialId: string } }>(
    `${org}/credentials/:credentialId`, async (r, reply) => {
      const body = z.object({ reason: z.string().min(3) }).parse(r.body);
      await options.service.revokeCredential((await human(r)).userId, r.params.organizationId,
        r.params.credentialId, body.reason); return reply.status(204).send();
    });
  app.get<{ Params: { organizationId: string } }>(`${org}/models`, async (r) =>
    options.service.models((await human(r)).userId, r.params.organizationId));
  app.post<{ Params: { organizationId: string } }>(`${org}/models`, async (r, reply) =>
    reply.status(201).send(await options.service.createModel((await human(r)).userId,
      r.params.organizationId, r.body as object)));
  app.post<{ Params: { organizationId: string; modelId: string } }>(
    `${org}/models/:modelId/submit`, async (r, reply) => {
      await options.service.submitModel((await human(r)).userId, r.params.organizationId, r.params.modelId);
      return reply.status(204).send();
    });
  app.get<{ Params: { organizationId: string } }>(`${org}/robots`, async (r) =>
    options.service.manufacturerRobots((await human(r)).userId, r.params.organizationId));
  app.post<{ Params: { organizationId: string; robotId: string } }>(
    `${org}/robots/:robotId/transfer-code`, async (r, reply) =>
      reply.status(201).send(await options.service.createTransferCode((await human(r)).userId,
        r.params.organizationId, r.params.robotId)));

  app.post("/manufacturer-api/v1/robots/registrations", async (r, reply) =>
    reply.status(201).send(await options.service.registerRobot(await integration(r), r.body as object)));
  app.get<{ Params: { registrationRequestId: string } }>(
    "/manufacturer-api/v1/robots/registrations/:registrationRequestId", async (r) =>
      options.service.registration(await integration(r), r.params.registrationRequestId));
  app.get<{ Params: { robotId: string } }>("/manufacturer-api/v1/robots/:robotId", async (r) =>
    options.service.integrationRobot(await integration(r), r.params.robotId));
  app.post<{ Params: { robotId: string } }>("/manufacturer-api/v1/robots/:robotId/activations",
    async (r, reply) => reply.status(201).send(
      await options.service.startActivation(await integration(r), r.params.robotId)));
  app.post<{ Params: { activationId: string } }>(
    "/manufacturer-api/v1/activations/:activationId/test", async (r) =>
      options.service.testActivation(await integration(r), r.params.activationId, r.body as object));
  app.post<{ Params: { activationId: string } }>(
    "/manufacturer-api/v1/activations/:activationId/complete", async (r) =>
      options.service.completeActivation(await integration(r), r.params.activationId));

  app.post<{ Params: { robotId: string } }>("/api/v1/owner/robots/:robotId/claim", async (r, reply) =>
    reply.status(201).send(await options.service.claimRobot((await human(r)).userId,
      r.params.robotId, r.body as object)));
  app.get<{ Params: { robotId: string } }>("/api/v1/robots/:robotId", async (r) =>
    options.service.robot((await human(r)).userId, r.params.robotId));

  for (const resource of ["manufacturers/applications","robot-models","robot-registrations",
    "ownership-claims","activations"]) {
    app.get(`/api/v1/platform/${resource}`, async (r) =>
      options.service.platformList((await human(r)).userId, resource));
  }
  app.post<{ Params: { applicationId: string } }>("/api/v1/platform/manufacturers/applications/:applicationId/review",
    async (r, reply) => {
      const body = z.object({ action: z.string(), reason: z.string().optional() }).parse(r.body);
      await options.service.reviewApplication((await human(r)).userId, r.params.applicationId,
        body.action, body.reason); return reply.status(204).send();
    });
  app.post<{ Params: { modelId: string } }>("/api/v1/platform/robot-models/:modelId/review",
    async (r, reply) => {
      const body = z.object({ action: z.string(), reason: z.string().optional() }).parse(r.body);
      await options.service.reviewModel((await human(r)).userId, r.params.modelId, body.action, body.reason);
      return reply.status(204).send();
    });
}

