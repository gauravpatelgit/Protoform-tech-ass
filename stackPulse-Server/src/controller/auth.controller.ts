import type { CookieOptions, Request, RequestHandler, Response } from "express";
import { env } from "#config/env.js";
import { currentUserId } from "#middleware/auth.middleware.js";
import { authService, type Session } from "#service/auth.service.js";
import { ok } from "#utils/http.js";

const COOKIE_NAME = "refresh_token";

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax",
  path: "/api/v1/auth",
});

function sendSession(res: Response, session: Session, status = 200) {
  res.cookie(COOKIE_NAME, session.refreshToken, { ...cookieOptions(), expires: session.refreshExpiresAt });
  ok(res, { user: session.user, accessToken: session.accessToken }, undefined, status);
}

const readRefreshCookie = (req: Request): string | undefined => {
  const value: unknown = req.cookies?.[COOKIE_NAME];
  return typeof value === "string" ? value : undefined;
};

export const signup: RequestHandler = async (req, res) => {
  sendSession(res, await authService.signup(req.body), 201);
};

export const login: RequestHandler = async (req, res) => {
  sendSession(res, await authService.login(req.body));
};

export const refresh: RequestHandler = async (req, res) => {
  try {
    sendSession(res, await authService.refresh(readRefreshCookie(req)));
  } catch (error) {
    res.clearCookie(COOKIE_NAME, cookieOptions());
    throw error;
  }
};

export const logout: RequestHandler = async (req, res) => {
  await authService.logout(readRefreshCookie(req));
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.status(204).end();
};

export const me: RequestHandler = async (req, res) => {
  ok(res, await authService.me(currentUserId(req)));
};
