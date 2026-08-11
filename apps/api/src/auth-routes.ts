/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-base-to-string */
import {
  hiringCompanyRegistrationSchema,
  invitationSchema,
  loginSchema,
  manufacturerRegistrationSchema,
  passwordResetConfirmationSchema,
  robotOwnerRegistrationSchema,
  tokenConfirmationSchema,
  type PublicOrganizationType,
  type RegistrationInput,
} from "@nation-reserve/auth";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

export interface AuthPrincipal {
  userId: string;
  sessionId: string;
  emailVerified: boolean;
}
export interface AuthRouteService {
  register(type: PublicOrganizationType, input: RegistrationInput): Promise<object>;
  registerAccount?(input: {
    email: string;
    displayName: string;
    password: string;
  }): Promise<object>;
  login(input: {
    email: string;
    password: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    session: { id: string };
    emailVerified: boolean;
  }>;
  refresh(
    sessionId: string,
    refreshToken: string,
    ip?: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;
  authenticate(accessToken: string): Promise<AuthPrincipal>;
  requestVerification(email?: string, userId?: string): Promise<void>;
  confirmVerification(token: string): Promise<void>;
  requestPasswordReset(email: string, ip?: string): Promise<void>;
  confirmPasswordReset(token: string, password: string): Promise<void>;
  logout(userId: string, sessionId: string): Promise<void>;
  logoutAll(userId: string): Promise<void>;
  account(userId: string): Promise<object>;
  updateAccount(userId: string, displayName: string): Promise<object>;
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    sessionId: string,
  ): Promise<void>;
  sessions(userId: string, currentSessionId: string): Promise<object[]>;
  revokeSession(userId: string, sessionId: string): Promise<void>;
  organizations(userId: string): Promise<object[]>;
  setDefaultOrganization(userId: string, organizationId: string): Promise<void>;
  organization(userId: string, organizationId: string): Promise<object>;
  updateOrganization(
    userId: string,
    organizationId: string,
    input: object,
  ): Promise<object>;
  members(userId: string, organizationId: string): Promise<object[]>;
  updateMember(
    userId: string,
    organizationId: string,
    membershipId: string,
    input: object,
  ): Promise<void>;
  removeMember(
    userId: string,
    organizationId: string,
    membershipId: string,
  ): Promise<void>;
  createInvitation(
    userId: string,
    organizationId: string,
    email: string,
    role: string,
  ): Promise<object>;
  invitations(userId: string, organizationId: string): Promise<object[]>;
  revokeInvitation(
    userId: string,
    organizationId: string,
    invitationId: string,
  ): Promise<void>;
  acceptInvitation(userId: string, token: string): Promise<void>;
}
export interface AuthRouteOptions {
  service: AuthRouteService;
  webOrigin: string;
  cookieName: string;
  cookieSecure: boolean;
  refreshTtlSeconds: number;
}

function cookie(request: FastifyRequest, name: string): string | undefined {
  const raw = request.headers.cookie;
  return raw
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([key]) => key === name)?.[1];
}
function sessionCookie(
  reply: FastifyReply,
  options: AuthRouteOptions,
  sessionId: string,
  token: string,
) {
  reply.header(
    "set-cookie",
    `${options.cookieName}=${sessionId}.${token}; HttpOnly; Path=/api/v1/auth; SameSite=Lax; Max-Age=${options.refreshTtlSeconds}${options.cookieSecure ? "; Secure" : ""}`,
  );
}
function clearCookie(reply: FastifyReply, options: AuthRouteOptions) {
  reply.header(
    "set-cookie",
    `${options.cookieName}=; HttpOnly; Path=/api/v1/auth; SameSite=Lax; Max-Age=0${options.cookieSecure ? "; Secure" : ""}`,
  );
}
function bearer(request: FastifyRequest): string {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw httpError("AUTHENTICATION_REQUIRED", 401);
  return header.slice(7);
}
function httpError(
  code: string,
  statusCode: number,
): Error & { code: string; statusCode: number } {
  return Object.assign(new Error(code), { code, statusCode });
}

export async function registerAuthRoutes(
  app: FastifyInstance<any, any, any, any>,
  options: AuthRouteOptions,
) {
  app.addHook("preHandler", async (request) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const origin = request.headers.origin;
      if (origin && origin !== options.webOrigin)
        throw httpError("CSRF_VALIDATION_FAILED", 403);
    }
  });
  const schemas = {
    "robot-owner": robotOwnerRegistrationSchema,
    "hiring-company": hiringCompanyRegistrationSchema,
    manufacturer: manufacturerRegistrationSchema,
  } as const;
  const types = {
    "robot-owner": "robot_owner",
    "hiring-company": "hiring_company",
    manufacturer: "manufacturer",
  } as const;
  app.post("/api/v1/auth/register", async (request, reply) => {
    if (!options.service.registerAccount)
      throw httpError("ACCOUNT_REGISTRATION_UNAVAILABLE", 503);
    const body = z
      .object({
        email: z.string().trim().email().max(320),
        displayName: z.string().trim().min(1).max(200),
        password: z.string().min(12).max(256),
        passwordConfirmation: z.string().min(12).max(256),
        acceptTerms: z.literal(true),
        acceptPrivacy: z.literal(true),
      })
      .refine((value) => value.password === value.passwordConfirmation, {
        path: ["passwordConfirmation"],
        message: "Passwords must match",
      })
      .parse(request.body);
    return reply
      .status(201)
      .send(
        await options.service.registerAccount({
          email: body.email,
          displayName: body.displayName,
          password: body.password,
        }),
      );
  });
  for (const kind of Object.keys(schemas) as Array<keyof typeof schemas>) {
    app.post(`/api/v1/auth/register/${kind}`, async (request, reply) =>
      reply
        .status(201)
        .send(
          await options.service.register(
            types[kind],
            schemas[kind].parse(request.body),
          ),
        ),
    );
  }
  app.post("/api/v1/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await options.service.login({
      ...body,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });
    sessionCookie(reply, options, result.session.id, result.refreshToken);
    return { accessToken: result.accessToken, emailVerified: result.emailVerified };
  });
  app.post("/api/v1/auth/refresh", async (request, reply) => {
    const value = cookie(request, options.cookieName);
    const separator = value?.indexOf(".") ?? -1;
    if (!value || separator < 1) throw httpError("SESSION_EXPIRED", 401);
    const result = await options.service.refresh(
      value.slice(0, separator),
      value.slice(separator + 1),
      request.ip,
    );
    sessionCookie(reply, options, value.slice(0, separator), result.refreshToken);
    return { accessToken: result.accessToken };
  });
  async function principal(request: FastifyRequest) {
    return options.service.authenticate(bearer(request));
  }
  app.post("/api/v1/auth/logout", async (request, reply) => {
    const p = await principal(request);
    await options.service.logout(p.userId, p.sessionId);
    clearCookie(reply, options);
    return reply.status(204).send();
  });
  app.post("/api/v1/auth/logout-all", async (request, reply) => {
    const p = await principal(request);
    await options.service.logoutAll(p.userId);
    clearCookie(reply, options);
    return reply.status(204).send();
  });
  app.post("/api/v1/auth/email-verification/request", async (request, reply) => {
    const body = z
      .object({ email: z.string().email().optional() })
      .parse(request.body ?? {});
    await options.service.requestVerification(body.email);
    return reply.status(202).send({ accepted: true });
  });
  app.post("/api/v1/auth/email-verification/confirm", async (request) => {
    await options.service.confirmVerification(
      tokenConfirmationSchema.parse(request.body).token,
    );
    return { verified: true };
  });
  app.post("/api/v1/auth/password-reset/request", async (request, reply) => {
    const body = z.object({ email: z.string().email() }).parse(request.body);
    await options.service.requestPasswordReset(body.email, request.ip);
    return reply.status(202).send({ accepted: true });
  });
  app.post("/api/v1/auth/password-reset/confirm", async (request) => {
    const body = passwordResetConfirmationSchema.parse(request.body);
    await options.service.confirmPasswordReset(body.token, body.password);
    return { changed: true };
  });
  app.get("/api/v1/account", async (request) =>
    options.service.account((await principal(request)).userId),
  );
  app.patch("/api/v1/account", async (request) => {
    const p = await principal(request);
    const body = z
      .object({ displayName: z.string().trim().min(1).max(200) })
      .parse(request.body);
    return options.service.updateAccount(p.userId, body.displayName);
  });
  app.post("/api/v1/account/password/change", async (request, reply) => {
    const p = await principal(request);
    const body = z
      .object({ currentPassword: z.string(), newPassword: z.string().min(12).max(256) })
      .parse(request.body);
    await options.service.changePassword(
      p.userId,
      body.currentPassword,
      body.newPassword,
      p.sessionId,
    );
    clearCookie(reply, options);
    return reply.status(204).send();
  });
  app.get("/api/v1/account/sessions", async (request) => {
    const p = await principal(request);
    return options.service.sessions(p.userId, p.sessionId);
  });
  app.delete<{ Params: { sessionId: string } }>(
    "/api/v1/account/sessions/:sessionId",
    async (request, reply) => {
      const p = await principal(request);
      await options.service.revokeSession(p.userId, request.params.sessionId);
      return reply.status(204).send();
    },
  );
  app.get("/api/v1/account/organizations", async (request) =>
    options.service.organizations((await principal(request)).userId),
  );
  app.post("/api/v1/account/default-organization", async (request, reply) => {
    const p = await principal(request);
    const body = z.object({ organizationId: z.string().uuid() }).parse(request.body);
    await options.service.setDefaultOrganization(p.userId, body.organizationId);
    return reply.status(204).send();
  });
  app.post("/api/v1/invitations/accept", async (request, reply) => {
    const p = await principal(request);
    await options.service.acceptInvitation(
      p.userId,
      tokenConfirmationSchema.parse(request.body).token,
    );
    return reply.status(204).send();
  });
  app.get<{ Params: { organizationId: string } }>(
    "/api/v1/organizations/:organizationId",
    async (request) =>
      options.service.organization(
        (await principal(request)).userId,
        request.params.organizationId,
      ),
  );
  app.patch<{ Params: { organizationId: string } }>(
    "/api/v1/organizations/:organizationId",
    async (request) =>
      options.service.updateOrganization(
        (await principal(request)).userId,
        request.params.organizationId,
        request.body as object,
      ),
  );
  app.get<{ Params: { organizationId: string } }>(
    "/api/v1/organizations/:organizationId/members",
    async (request) =>
      options.service.members(
        (await principal(request)).userId,
        request.params.organizationId,
      ),
  );
  app.patch<{ Params: { organizationId: string; membershipId: string } }>(
    "/api/v1/organizations/:organizationId/members/:membershipId",
    async (request, reply) => {
      await options.service.updateMember(
        (await principal(request)).userId,
        request.params.organizationId,
        request.params.membershipId,
        request.body as object,
      );
      return reply.status(204).send();
    },
  );
  app.delete<{ Params: { organizationId: string; membershipId: string } }>(
    "/api/v1/organizations/:organizationId/members/:membershipId",
    async (request, reply) => {
      await options.service.removeMember(
        (await principal(request)).userId,
        request.params.organizationId,
        request.params.membershipId,
      );
      return reply.status(204).send();
    },
  );
  app.post<{ Params: { organizationId: string } }>(
    "/api/v1/organizations/:organizationId/invitations",
    async (request, reply) => {
      const body = invitationSchema.parse(request.body);
      return reply
        .status(201)
        .send(
          await options.service.createInvitation(
            (await principal(request)).userId,
            request.params.organizationId,
            body.email,
            body.role,
          ),
        );
    },
  );
  app.get<{ Params: { organizationId: string } }>(
    "/api/v1/organizations/:organizationId/invitations",
    async (request) =>
      options.service.invitations(
        (await principal(request)).userId,
        request.params.organizationId,
      ),
  );
  app.delete<{ Params: { organizationId: string; invitationId: string } }>(
    "/api/v1/organizations/:organizationId/invitations/:invitationId",
    async (request, reply) => {
      await options.service.revokeInvitation(
        (await principal(request)).userId,
        request.params.organizationId,
        request.params.invitationId,
      );
      return reply.status(204).send();
    },
  );
}
