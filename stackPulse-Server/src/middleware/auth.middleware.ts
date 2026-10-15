import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "#utils/app.errors.js";
import { verifyAccessToken } from "#utils/jwt.js";

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new UnauthorizedError());

  try {
    req.user = { id: verifyAccessToken(header.slice(7)).userId };
    next();
  } catch (error) {
    next(error);
  }
};

export const currentUserId = (req: Request): string => {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
};
