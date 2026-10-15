import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import logger from "#config/logger.js";
import { requestContext } from "#utils/requestContext.js";

// Only method, path, status and timing are logged: never bodies, cookies or Authorization headers.
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers["x-correlation-id"];
  const correlationId = typeof incoming === "string" && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader("X-Correlation-Id", correlationId);

  requestContext.run({ correlationId }, () => {
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
      if (req.path === "/api/v1/health") return;
      const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
      logger.info(`${req.method} ${req.baseUrl}${req.path} ${res.statusCode} ${ms.toFixed(0)}ms`);
    });
    next();
  });
};

export default requestLogger;
