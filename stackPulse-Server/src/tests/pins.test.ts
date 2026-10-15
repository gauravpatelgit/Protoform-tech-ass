import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "#app.js";
import { resetRateLimitState } from "#integrations/github/rateLimit.js";
import { resetSyncCaches } from "#service/developerSync.service.js";
import { enrichmentService } from "#service/enrichment.service.js";
import { hubot, installFakeGitHub, octocat, signUp } from "./fakeGithub.js";
import { closeDatabase, resetDatabase } from "./helpers.js";

const app = createApp();
let alice: string;
let bob: string;
let helloId: number;
let worldId: number;
let botId: number;

const as = (token: string) => ({
  get: (path: string) => request(app).get(`/api/v1${path}`).set("Authorization", `Bearer ${token}`),
  post: (path: string, body?: object) => request(app).post(`/api/v1${path}`).set("Authorization", `Bearer ${token}`).send(body),
  patch: (path: string, body: object) => request(app).patch(`/api/v1${path}`).set("Authorization", `Bearer ${token}`).send(body),
  delete: (path: string) => request(app).delete(`/api/v1${path}`).set("Authorization", `Bearer ${token}`),
});

const repoId = async (username: string, name: string) => {
  const res = await as(alice).get(`/developers/${username}/repos?includeForks=true`);
  return res.body.data.find((repo: { name: string }) => repo.name === name).id as number;
};

describe("pins", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimitState();
    resetSyncCaches();
    installFakeGitHub([octocat, hubot]);
    alice = (await signUp(app, "alice@example.com")).token;
    bob = (await signUp(app, "bob@example.com")).token;
    helloId = await repoId("octocat", "hello");
    worldId = await repoId("octocat", "world");
    botId = await repoId("hubot", "bot");
  });
  afterEach(async () => {
    await enrichmentService.idle();
    vi.unstubAllGlobals();
  });
  afterAll(closeDatabase);

  it("pins a repo with a normalised note and tags", async () => {
    const res = await as(alice).post("/pins", { repoId: helloId, note: "  great api  ", tags: ["API", "api", " Rust "] });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ note: "great api", tags: ["api", "rust"] });
    expect(res.body.data.repo).toMatchObject({
      id: helloId,
      name: "hello",
      developerUsername: "octocat",
      developerAvatarUrl: "https://avatars.example/583231",
    });
  });

  it("rejects duplicates, unknown repos and invalid input", async () => {
    await as(alice).post("/pins", { repoId: helloId });

    expect((await as(alice).post("/pins", { repoId: helloId })).status).toBe(409);
    expect((await as(alice).post("/pins", { repoId: 999999 })).status).toBe(404);
    expect((await as(alice).post("/pins", { repoId: "x" })).status).toBe(400);
    expect(
      (
        await as(alice).post("/pins", {
          repoId: worldId,
          tags: Array(11)
            .fill("t")
            .map((t, i) => t + i),
        })
      ).status,
    ).toBe(400);
    expect((await as(alice).post("/pins", { repoId: worldId, note: "x".repeat(1001) })).status).toBe(400);
  });

  it("lets two users pin the same repo independently", async () => {
    expect((await as(alice).post("/pins", { repoId: helloId, note: "alice" })).status).toBe(201);
    expect((await as(bob).post("/pins", { repoId: helloId, note: "bob" })).status).toBe(201);

    const list = await as(bob).get("/pins");
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].note).toBe("bob");
  });

  it("hides other users' pins as 404 for read, update and delete", async () => {
    const pin = (await as(alice).post("/pins", { repoId: helloId, note: "mine" })).body.data;

    expect((await as(bob).get(`/pins/${pin.id}`)).status).toBe(404);
    expect((await as(bob).patch(`/pins/${pin.id}`, { note: "hacked" })).status).toBe(404);
    expect((await as(bob).delete(`/pins/${pin.id}`)).status).toBe(404);

    const unchanged = await as(alice).get(`/pins/${pin.id}`);
    expect(unchanged.body.data.note).toBe("mine");
  });

  it("updates and clears note and tags", async () => {
    const pin = (await as(alice).post("/pins", { repoId: helloId, note: "old", tags: ["a"] })).body.data;

    const changed = await as(alice).patch(`/pins/${pin.id}`, { note: null, tags: ["b", "c"] });
    expect(changed.body.data).toMatchObject({ note: null, tags: ["b", "c"] });

    const onlyNote = await as(alice).patch(`/pins/${pin.id}`, { note: "new" });
    expect(onlyNote.body.data).toMatchObject({ note: "new", tags: ["b", "c"] });

    expect((await as(alice).patch(`/pins/${pin.id}`, {})).status).toBe(400);
  });

  it("filters by tag and developer, and paginates newest first", async () => {
    await as(alice).post("/pins", { repoId: helloId, tags: ["api", "ts"] });
    await as(alice).post("/pins", { repoId: worldId, tags: ["api"] });
    await as(alice).post("/pins", { repoId: botId, tags: ["ruby"] });

    const names = (res: request.Response) => res.body.data.map((pin: { repo: { name: string } }) => pin.repo.name);

    expect(names(await as(alice).get("/pins"))).toEqual(["bot", "world", "hello"]);
    expect(names(await as(alice).get("/pins?tag=API"))).toEqual(["world", "hello"]);
    expect(names(await as(alice).get("/pins?tag=ts"))).toEqual(["hello"]);
    expect(names(await as(alice).get("/pins?developer=hubot"))).toEqual(["bot"]);
    expect(names(await as(alice).get("/pins?tag=api&developer=octocat"))).toEqual(["world", "hello"]);

    const page = await as(alice).get("/pins?limit=2&page=2");
    expect(names(page)).toEqual(["hello"]);
    expect(page.body.meta).toEqual({ page: 2, limit: 2, total: 3 });
  });

  it("deletes a pin and reflects pin state on the repo list", async () => {
    const pin = (await as(alice).post("/pins", { repoId: helloId })).body.data;

    const pinned = await as(alice).get("/developers/octocat/repos");
    expect(pinned.body.data.find((repo: { id: number }) => repo.id === helloId)).toMatchObject({ pinned: true, pinId: pin.id });

    const bobsView = await as(bob).get("/developers/octocat/repos");
    expect(bobsView.body.data.find((repo: { id: number }) => repo.id === helloId)).toMatchObject({ pinned: false, pinId: null });

    expect((await as(alice).delete(`/pins/${pin.id}`)).status).toBe(204);
    expect((await as(alice).get(`/pins/${pin.id}`)).status).toBe(404);
  });

  it("requires authentication", async () => {
    expect((await request(app).get("/api/v1/pins")).status).toBe(401);
  });
});
