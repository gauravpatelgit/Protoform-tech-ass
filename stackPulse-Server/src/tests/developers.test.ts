import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "#app.js";
import { Developer } from "#database/models/index.js";
import { resetRateLimitState } from "#integrations/github/rateLimit.js";
import { enrichmentService } from "#service/enrichment.service.js";
import { resetSyncCaches } from "#service/developerSync.service.js";
import { installFakeGitHub, octocat, signUp, type FakeGitHub } from "./fakeGithub.js";
import { closeDatabase, resetDatabase } from "./helpers.js";

const app = createApp();
let github: FakeGitHub;
let token: string;

const get = (path: string) => request(app).get(`/api/v1${path}`).set("Authorization", `Bearer ${token}`);
const post = (path: string) => request(app).post(`/api/v1${path}`).set("Authorization", `Bearer ${token}`);

describe("developers", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimitState();
    resetSyncCaches();
    github = installFakeGitHub([octocat]);
    ({ token } = await signUp(app));
  });
  afterEach(async () => {
    await enrichmentService.idle();
    vi.unstubAllGlobals();
  });
  afterAll(closeDatabase);

  it("requires authentication", async () => {
    expect((await request(app).get("/api/v1/developers/octocat")).status).toBe(401);
  });

  it("returns the base profile immediately, then enriched metrics", async () => {
    const first = await get("/developers/octocat");
    expect(first.status).toBe(200);
    expect(first.body.data.profile).toMatchObject({ username: "octocat", followers: 30 });
    expect(["pending", "running", "ready"]).toContain(first.body.data.enrichmentStatus);

    await enrichmentService.idle();
    const settled = await get("/developers/octocat");
    const { metrics, enrichmentStatus } = settled.body.data;

    expect(enrichmentStatus).toBe("ready");
    // The fork (999 stars) is excluded by default.
    expect(metrics.totalStars).toBe(150);
    expect(metrics.repoCount).toBe(2);
    expect(metrics.activeRepos90d).toBe(1);
    expect(metrics.topRepos[0].name).toBe("hello");
    expect(metrics.languages[0]).toEqual({ language: "TypeScript", percent: 66.7 });
    expect(metrics.languageCount).toBe(3);
    expect(metrics.weeklyCommits).toHaveLength(52);
    expect(metrics.commits52w).toBe(6);
    expect(settled.body.meta).toMatchObject({ stale: false, sampledRepos: 2 });
  });

  it("serves repeated lookups from the cache without calling GitHub", async () => {
    await get("/developers/octocat");
    await enrichmentService.idle();
    const callsAfterFirst = github.calls.length;

    await get("/developers/OctoCat");
    expect(github.calls.length).toBe(callsAfterFirst);
  });

  it("shares one upstream sync between concurrent requests", async () => {
    const responses = await Promise.all(Array.from({ length: 5 }, () => get("/developers/octocat")));
    expect(responses.every((res) => res.status === 200)).toBe(true);
    expect(github.count("/users/octocat")).toBe(2); // profile + repos, once
  });

  it("revalidates with ETags after the TTL and skips unchanged data", async () => {
    await get("/developers/octocat");
    await enrichmentService.idle();
    await Developer.update({ fetchedAt: new Date(Date.now() - 2 * 3600 * 1000) }, { where: {} });
    const enrichmentCallsBefore = github.count("/repos/");

    const res = await get("/developers/octocat");
    await enrichmentService.idle();

    expect(res.status).toBe(200);
    expect(github.count("/users/octocat")).toBe(4);
    expect(github.count("/repos/")).toBe(enrichmentCallsBefore);
  });

  it("returns 404 for unknown users and remembers the miss", async () => {
    expect((await get("/developers/ghost-user")).status).toBe(404);
    expect((await get("/developers/ghost-user")).status).toBe(404);
    expect(github.count("/users/ghost-user")).toBe(1);
  });

  it("rejects malformed usernames before calling GitHub", async () => {
    const res = await get("/developers/-bad-");
    expect(res.status).toBe(400);
    expect(github.calls).toHaveLength(0);
  });

  it("serves stale data when GitHub is rate limited", async () => {
    await get("/developers/octocat");
    await enrichmentService.idle();
    await Developer.update({ fetchedAt: new Date(Date.now() - 2 * 3600 * 1000) }, { where: {} });
    github.failWith = { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 600) } };

    const res = await get("/developers/octocat");
    expect(res.status).toBe(200);
    expect(res.body.meta.stale).toBe(true);
  });

  it("answers 429 with Retry-After when rate limited and nothing is cached", async () => {
    github.failWith = { status: 429, headers: { "retry-after": "42" } };
    const res = await get("/developers/octocat");
    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBe("42");
  });

  it("lists repos with sorting, filtering and pagination", async () => {
    await get("/developers/octocat");
    await enrichmentService.idle();

    const byStars = await get("/developers/octocat/repos?sort=stars&limit=1");
    expect(byStars.body.data.map((repo: { name: string }) => repo.name)).toEqual(["hello"]);
    expect(byStars.body.meta).toEqual({ page: 1, limit: 1, total: 2 });

    const withForks = await get("/developers/octocat/repos?includeForks=true&sort=stars");
    expect(withForks.body.data[0].name).toBe("forked");

    const go = await get("/developers/octocat/repos?language=go");
    expect(go.body.data.map((repo: { name: string }) => repo.name)).toEqual(["world"]);
    expect(go.body.data[0]).toMatchObject({ pinned: false, pinId: null });

    expect((await get("/developers/octocat/repos?limit=500")).status).toBe(400);
  });

  it("limits manual refreshes with a cooldown", async () => {
    expect((await post("/developers/octocat/refresh")).status).toBe(200);
    const again = await post("/developers/octocat/refresh");
    expect(again.status).toBe(429);
    expect(Number(again.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("lists recently synced developers", async () => {
    await get("/developers/octocat");
    const res = await get("/developers/recent");
    expect(res.body.data).toEqual([{ username: "octocat", avatarUrl: "https://avatars.example/583231", name: "octocat name" }]);
  });
});
