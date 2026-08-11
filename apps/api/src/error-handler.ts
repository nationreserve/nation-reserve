import type {
  FastifyBaseLogger,
  FastifyError,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerBase,
} from "fastify";

interface ErrorWithStatusCode extends FastifyError {
  statusCode?: number;
}

export function registerErrorHandler<
  RawServer extends RawServerBase,
  RawRequest extends RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer>,
  Logger extends FastifyBaseLogger,
>(app: FastifyInstance<RawServer, RawRequest, RawReply, Logger>): void {
  app.setErrorHandler<ErrorWithStatusCode>((error, request, reply) => {
    const validationError = error.name === "ZodError";
    const statusCode = validationError
      ? 400
      : typeof error.statusCode === "number" && error.statusCode >= 400
        ? error.statusCode
        : 500;
    const unexpected = statusCode >= 500;

    if (unexpected) {
      request.log.error({ err: error }, "Unexpected request error");
    } else {
      request.log.info({ err: error }, "Request rejected");
    }

    return reply.status(statusCode).send({
      error: {
        code: validationError
          ? "VALIDATION_ERROR"
          : unexpected
            ? "INTERNAL_SERVER_ERROR"
            : (error.code ?? "REQUEST_ERROR"),
        message: validationError
          ? "The request contains invalid or missing information."
          : unexpected
            ? "An unexpected error occurred."
            : error.message,
        requestId: request.id,
      },
    });
  });
}
