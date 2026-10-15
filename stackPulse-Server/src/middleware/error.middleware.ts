import type { NextFunction, Request, Response } from "express";
import { ForeignKeyConstraintError, UniqueConstraintError } from "@sequelize/core";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { env } from "#config/env.js";
import logger from "#config/logger.js";
import { AppError, ConflictError, TooManyRequestsError, UnauthorizedError, ValidationError } from "#utils/app.errors.js";
import { getCorrelationId } from "#utils/requestContext.js";

// Turns library errors into operational AppErrors so clients get a stable envelope.
function normalize(err: unknown): AppError | null {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    return new ValidationError(
      "Validation failed",
      err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }
  if (err instanceof UniqueConstraintError) return new ConflictError("Resource already exists");
  if (err instanceof ForeignKeyConstraintError) return new ValidationError("Referenced resource does not exist");
  if (err instanceof jwt.TokenExpiredError) return new UnauthorizedError("Token expired");
  if (err instanceof jwt.JsonWebTokenError) return new UnauthorizedError("Invalid token");
  if (err instanceof Error && (err as { type?: string }).type === "entity.parse.failed") return new ValidationError("Malformed JSON body");
  if (err instanceof Error && (err as { type?: string }).type === "entity.too.large") return new ValidationError("Request body too large");
  return null;
}

const errorHandler = (err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);

  const appError = normalize(err);
  const correlationId = getCorrelationId();

  if (!appError) {
    logger.error("Unexpected error", { error: err });
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      correlationId,
      ...(env.NODE_ENV === "development" && err instanceof Error && { stack: err.stack }),
    });
    return;
  }

  logger.warn(appError.message, { statusCode: appError.statusCode });
  if (appError instanceof TooManyRequestsError && appError.retryAfterSeconds) {
    res.setHeader("Retry-After", String(appError.retryAfterSeconds));
  }
  res.status(appError.statusCode).json({
    success: false,
    message: appError.message,
    correlationId,
    ...(appError.details !== undefined && { details: appError.details }),
  });
};

export default errorHandler;
