import pino, { type Logger, type LoggerOptions } from "pino";

export type { Logger } from "pino";

export interface LoggerConfig {
  level: NonNullable<LoggerOptions["level"]>;
  nodeEnv: "development" | "test" | "production";
  service: string;
}

export function createLogger(config: LoggerConfig): Logger {
  const options: LoggerOptions = {
    level: config.level,
    base: { service: config.service },
  };

  if (config.nodeEnv === "test") {
    return pino({ ...options, level: "silent" });
  }

  if (config.nodeEnv === "development") {
    return pino(
      options,
      pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: true,
          translateTime: "SYS:standard",
        },
      }),
    );
  }

  return pino(options);
}

export function createChildLogger(
  logger: Logger,
  context: Record<string, unknown>,
): Logger {
  return logger.child(context);
}
