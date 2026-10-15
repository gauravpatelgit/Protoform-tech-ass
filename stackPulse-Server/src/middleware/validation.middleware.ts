import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

interface Schemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

// Parsed (trimmed, coerced, defaulted) values replace the raw ones; a ZodError is mapped to a 400 by the error handler.
export const validate = (schemas: Schemas) => (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
    if (schemas.query) {
      // Express 5 exposes req.query as a getter, so it has to be redefined.
      Object.defineProperty(req, "query", { value: schemas.query.parse(req.query), writable: true, configurable: true });
    }
    next();
  } catch (error) {
    next(error);
  }
};
