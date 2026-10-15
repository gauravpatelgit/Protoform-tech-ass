import winston, { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { env } from "#config/env.js";
import { getCorrelationId } from "#utils/requestContext.js";

const customLevels = {
  levels: {
    critical: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    critical: "red",
    error: "red",
    warn: "yellow",
    info: "green",
    debug: "blue",
  },
};

const logger = createLogger({
  levels: customLevels.levels,
  level: env.LOG_LEVEL ?? "info",
  silent: env.NODE_ENV === "test",
  format: format.combine(
    format.colorize({ all: true }),
    format.timestamp(),
    format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const correlationId = getCorrelationId();
      const prefix = correlationId ? `[${correlationId}] ` : "";
      let log = `${timestamp} ${level}: ${prefix}${message}`;
      if (stack) log += `\n${stack}`;
      const rest: Record<string, unknown> = { ...meta };
      for (const key of Object.keys(rest)) {
        const value = rest[key];
        if (value instanceof Error) {
          rest[key] = { message: value.message, stack: value.stack };
        }
      }
      if (Object.keys(rest).length > 0) log += ` ${JSON.stringify(rest)}`;

      return log;
    }),
  ),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: "logs/application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

winston.addColors(customLevels.colors);

export default logger;
