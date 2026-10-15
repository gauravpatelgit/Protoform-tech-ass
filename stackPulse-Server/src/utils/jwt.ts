import jwt from "jsonwebtoken";
import { env } from "#config/env.js";

export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, { algorithm: "HS256", subject: userId, expiresIn: env.JWT_ACCESS_TTL_SEC });
}

// Throws JsonWebTokenError / TokenExpiredError, which the error handler maps to 401.
export function verifyAccessToken(token: string): { userId: string } {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
  if (typeof payload === "string" || !payload.sub) throw new jwt.JsonWebTokenError("Invalid token");
  return { userId: payload.sub };
}
