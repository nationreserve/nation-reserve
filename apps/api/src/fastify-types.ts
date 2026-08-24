import type { Logger } from "@nation-reserve/logger";
import type {
  FastifyInstance,
  FastifyRequest,
  FastifySchema,
  FastifyTypeProviderDefault,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
} from "fastify";
export type AppFastifyInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  Logger,
  FastifyTypeProviderDefault
>;
export type AppFastifyRequest = FastifyRequest<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  FastifySchema,
  FastifyTypeProviderDefault,
  unknown,
  Logger
>;
