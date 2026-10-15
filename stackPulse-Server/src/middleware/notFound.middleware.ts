import type { Request, Response } from "express";
import { getCorrelationId } from "#utils/requestContext.js";

const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    correlationId: getCorrelationId(),
  });
};

export default notFound;
