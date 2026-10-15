import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "#app.js";
import { resetRateLimitState } from "#integrations/github/rateLimit.js";
import { computeLeaders, type CompareEntry } from "#service/compare.service.js";
import { resetSyncCaches } from "#service/developerSync.service.js";
import { enrichmentService } from "#service/enrichment.service.js";
import { hubot, installFakeGitHub, octocat, signUp, type FakeGitHub } from "./fakeGithub.js";
import { closeDatabase, resetDatabase } from "./helpers.js";

const app = createApp();
let github: FakeGitHub;
let alice: string;
let bob: string;

const as = (token: string) => ({
  get: (path: string) => request(app).get(`/api/v1${path}`).set("Authorization", `Bearer ${token}`),
  post: (path: string, body?: object) => request(app).post(`/api/v1${path}`).set("Authorization", `Bearer ${token}`).send(body),
  put: (path: string, body: object) => request(app).put(`/api/v1${path}`).set("Authorization", `Bearer ${token}`).send(body),
  delete: (path: string) => request(app).delete(`/api/v1${path}`).set("Authorization", `Bearer ${token}`),
});

beforeEach(async () => {
  await resetDatabase();
  resetRateLimitState();
  resetSyncCaches();
  github = installFakeGitHub([octocat, hubot]);
  alice = (await signUp(app, "alice@example.com")).token;
  bob = (await signUp(app, "bob@example.com")).token;
});
afterEach(async () => {
  await enrichmentService.idle();
  vi.unstubAllGlobals();
});
afterAll(closeDatabase);

describe("compare", () => {
  it("compares developers and reports leaders per metric", async () => {
    const res = await as(alice).get("/compare?usernames=octocat,hubot");
    await enrichmentService.idle();

    expect(res.status).toBe(200);
    expect(res.body.data.developers.map((entry: CompareEntry) => [entry.username, entry.status])).toEqual([
      ["octocat", "ok"],
      ["hubot", "ok"],
    ]);

    const settled = await as(alice).get("/compare?usernames=octocat&usernames=hubot");
    expect(settled.body.data.leaders).toMatchObject({
      totalStars: ["octocat"],
      followers: ["octocat"],
      repoCount: ["octocat"],
      commits52w: ["octocat"],
    });
  });

  it("returns partial results when one developer fails", async () => {
    const res = await as(alice).get("/compare?usernames=octocat,hubot,ghost-user");

    expect(res.status).toBe(200);
    const ghost = res.body.data.developers.find((entry: CompareEntry) => entry.username === "ghost-user");
    expect(ghost).toMatchObject({ status: "error", error: expect.stringContaining("not found") });
    expect(res.body.data.developers.filter((entry: CompareEntry) => entry.status === "ok")).toHaveLength(2);
    expect(res.body.data.leaders.totalStars).toEqual(["octocat"]);
  });

  it("de-duplicates usernames case-insensitively and validates the count", async () => {
    expect((await as(alice).get("/compare?usernames=octocat,OctoCat")).status).toBe(400);
    expect((await as(alice).get("/compare?usernames=a")).status).toBe(400);
    expect((await as(alice).get("/compare?usernames=a,b,c,d,e,f")).status).toBe(400);
    expect((await as(alice).get("/compare?usernames=octocat,-bad-")).status).toBe(400);
    expect((await as(alice).get("/compare")).status).toBe(400);
    expect(github.calls).toHaveLength(0);
  });

  it("shares upstream work across overlapping compares", async () => {
    await Promise.all([as(alice).get("/compare?usernames=octocat,hubot"), as(bob).get("/compare?usernames=hubot,octocat")]);
    expect(github.count("/users/octocat")).toBe(2);
    expect(github.count("/users/hubot")).toBe(2);
  });

  it("computes leaders with ties and ignores failed entries", () => {
    const entry = (username: string, status: "ok" | "error", stars = 0): CompareEntry => ({
      username,
      status,
      ...(status === "ok" && {
        metrics: {
          totalStars: stars,
          followers: 0,
          repoCount: 0,
          avgStarsPerRepo: 0,
          commits52w: 0,
          activeRepos90d: 0,
          languageCount: 0,
          languages: [],
          weeklyCommits: [],
          topRepos: [],
        },
      }),
    });

    const leaders = computeLeaders([entry("a", "ok", 5), entry("b", "ok", 5), entry("c", "ok", 1), entry("d", "error")]);
    expect(leaders.totalStars).toEqual(["a", "b"]);
    expect(leaders.followers).toEqual([]);
  });
});

describe("saved comparisons", () => {
  const create = (token: string, body: object = { name: "Duo", usernames: ["octocat", "hubot"] }) => as(token).post("/comparisons", body);

  it("creates a comparison and lists it with developer avatars", async () => {
    const res = await create(alice);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: "Duo" });
    expect(res.body.data.developers.map((developer: { username: string }) => developer.username)).toEqual(["octocat", "hubot"]);

    const list = await as(alice).get("/comparisons");
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].developers[0]).toMatchObject({ username: "octocat", avatarUrl: "https://avatars.example/583231" });
    expect(list.body.meta).toEqual({ page: 1, limit: 20, total: 1 });
  });

  it("validates input, unknown developers and duplicate names", async () => {
    expect((await create(alice, { name: "", usernames: ["octocat", "hubot"] })).status).toBe(400);
    expect((await create(alice, { name: "x", usernames: ["octocat"] })).status).toBe(400);
    expect((await create(alice, { name: "x", usernames: ["octocat", "OctoCat"] })).status).toBe(400);
    expect((await create(alice, { name: "x", usernames: ["octocat", "ghost-user"] })).status).toBe(404);

    expect((await create(alice)).status).toBe(201);
    expect((await create(alice)).status).toBe(409);
    expect((await create(bob)).status).toBe(201);
  });

  it("hydrates a comparison with live compare metrics", async () => {
    const { id } = (await create(alice)).body.data;
    await enrichmentService.idle();

    const res = await as(alice).get(`/comparisons/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.compare.developers).toHaveLength(2);
    expect(res.body.data.compare.leaders.totalStars).toEqual(["octocat"]);
  });

  it("renames and replaces the developer set", async () => {
    const { id } = (await create(alice)).body.data;

    const renamed = await as(alice).put(`/comparisons/${id}`, { name: "Renamed" });
    expect(renamed.body.data.name).toBe("Renamed");
    expect(renamed.body.data.developers).toHaveLength(2);

    const swapped = await as(alice).put(`/comparisons/${id}`, { usernames: ["hubot", "octocat"] });
    expect(swapped.body.data.developers.map((developer: { username: string }) => developer.username)).toEqual(["hubot", "octocat"]);

    expect((await as(alice).put(`/comparisons/${id}`, {})).status).toBe(400);
  });

  it("rejects renaming onto another of the user's comparisons", async () => {
    await create(alice, { name: "One", usernames: ["octocat", "hubot"] });
    const two = (await create(alice, { name: "Two", usernames: ["octocat", "hubot"] })).body.data;

    expect((await as(alice).put(`/comparisons/${two.id}`, { name: "One" })).status).toBe(409);
  });

  it("hides other users' comparisons as 404 for read, update and delete", async () => {
    const { id } = (await create(alice)).body.data;

    expect((await as(bob).get(`/comparisons/${id}`)).status).toBe(404);
    expect((await as(bob).put(`/comparisons/${id}`, { name: "hijack" })).status).toBe(404);
    expect((await as(bob).delete(`/comparisons/${id}`)).status).toBe(404);
    expect((await as(bob).get("/comparisons")).body.data).toEqual([]);
    expect((await as(alice).get(`/comparisons/${id}`)).body.data.name).toBe("Duo");
  });

  it("deletes a comparison", async () => {
    const { id } = (await create(alice)).body.data;

    expect((await as(alice).delete(`/comparisons/${id}`)).status).toBe(204);
    expect((await as(alice).get(`/comparisons/${id}`)).status).toBe(404);
  });

  it("paginates the list", async () => {
    for (const name of ["A", "B", "C"]) await create(alice, { name, usernames: ["octocat", "hubot"] });

    const page = await as(alice).get("/comparisons?limit=2&page=2");
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta).toEqual({ page: 2, limit: 2, total: 3 });
  });
});

describe("health", () => {
  it("reports database status without auth", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ status: "ok", db: "up" });
  });
});
