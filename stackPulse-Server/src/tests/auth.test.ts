import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "#app.js";
import { RefreshToken } from "#database/models/index.js";
import { closeDatabase, resetDatabase } from "./helpers.js";

const app = createApp();
const credentials = { email: "Ada@Example.com", password: "correct-horse" };

const refreshCookie = (res: request.Response) => {
  const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
  return raw?.find((cookie) => cookie.startsWith("refresh_token="));
};

describe("auth", () => {
  beforeEach(resetDatabase);
  afterAll(closeDatabase);

  it("signs up, normalises the email and sets an httpOnly refresh cookie", async () => {
    const res = await request(app).post("/api/v1/auth/signup").send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe("ada@example.com");
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user.passwordHash).toBeUndefined();
    const cookie = refreshCookie(res);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/api/v1/auth");
  });

  it("rejects duplicate emails and weak passwords", async () => {
    await request(app).post("/api/v1/auth/signup").send(credentials);

    const duplicate = await request(app).post("/api/v1/auth/signup").send(credentials);
    expect(duplicate.status).toBe(409);

    const weak = await request(app).post("/api/v1/auth/signup").send({ email: "b@example.com", password: "short" });
    expect(weak.status).toBe(400);
    expect(weak.body).toMatchObject({ success: false, correlationId: expect.any(String) });
  });

  it("logs in with correct credentials only", async () => {
    await request(app).post("/api/v1/auth/signup").send(credentials);

    const good = await request(app).post("/api/v1/auth/login").send(credentials);
    expect(good.status).toBe(200);

    const bad = await request(app)
      .post("/api/v1/auth/login")
      .send({ ...credentials, password: "wrong-password" });
    expect(bad.status).toBe(401);
    const unknown = await request(app).post("/api/v1/auth/login").send({ email: "nobody@example.com", password: "whatever1" });
    expect(unknown.body.message).toBe(bad.body.message);
  });

  it("protects /me and returns the user for a valid token", async () => {
    expect((await request(app).get("/api/v1/auth/me")).status).toBe(401);

    const signup = await request(app).post("/api/v1/auth/signup").send(credentials);
    const me = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${signup.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe("ada@example.com");
  });

  it("rotates refresh tokens and revokes everything when an old one is replayed", async () => {
    const signup = await request(app).post("/api/v1/auth/signup").send(credentials);
    const first = refreshCookie(signup)!;

    const rotated = await request(app).post("/api/v1/auth/refresh").set("Cookie", first);
    expect(rotated.status).toBe(200);
    const second = refreshCookie(rotated)!;
    expect(second).not.toBe(first);

    // Replay after the grace window is simulated by revoking directly in the DB.
    await RefreshToken.update({ revokedAt: new Date(Date.now() - 60_000) }, { where: {} });
    await RefreshToken.update({ revokedAt: null }, { where: { replacedBy: null } });

    const replay = await request(app).post("/api/v1/auth/refresh").set("Cookie", first);
    expect(replay.status).toBe(401);

    const afterTheft = await request(app).post("/api/v1/auth/refresh").set("Cookie", second);
    expect(afterTheft.status).toBe(401);
  });

  it("logout revokes the refresh token", async () => {
    const signup = await request(app).post("/api/v1/auth/signup").send(credentials);
    const cookie = refreshCookie(signup)!;

    expect((await request(app).post("/api/v1/auth/logout").set("Cookie", cookie)).status).toBe(204);
    expect((await request(app).post("/api/v1/auth/refresh").set("Cookie", cookie)).status).toBe(401);
  });

  it("serves health without auth and a JSON 404 envelope for unknown routes", async () => {
    expect((await request(app).get("/api/v1/health")).body.data.status).toBe("ok");
    const missing = await request(app).get("/api/v1/nope");
    expect(missing.status).toBe(404);
    expect(missing.body.success).toBe(false);
  });
});
