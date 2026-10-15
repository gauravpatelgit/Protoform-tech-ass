import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { env } from "#config/env.js";
import { TooManyRequestsError } from "#utils/app.errors.js";

const base = {
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  handler: (_req: Request, _res: unknown, next: (err: unknown) => void) => next(new TooManyRequestsError("Too many requests, please slow down", 60)),
};

// Per IP: credentials endpoints are the brute-force target.
export const authLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 10 });

// Per user once authenticated, per IP otherwise.
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 120,
  keyGenerator: (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
});
