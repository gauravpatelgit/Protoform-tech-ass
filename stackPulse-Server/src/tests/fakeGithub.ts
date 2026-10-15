import { vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

interface FakeRepo {
  id: number;
  name: string;
  stars: number;
  fork?: boolean;
  language?: string | null;
  pushedDaysAgo?: number;
}

export interface FakeUser {
  id: number;
  login: string;
  repos: FakeRepo[];
}

const dayMs = 24 * 3600 * 1000;

export const octocat: FakeUser = {
  id: 583231,
  login: "octocat",
  repos: [
    { id: 1, name: "hello", stars: 100, language: "TypeScript", pushedDaysAgo: 2 },
    { id: 2, name: "world", stars: 50, language: "Go", pushedDaysAgo: 200 },
    { id: 3, name: "forked", stars: 999, fork: true, language: "Rust", pushedDaysAgo: 1 },
  ],
};

export const hubot: FakeUser = {
  id: 900,
  login: "hubot",
  repos: [{ id: 10, name: "bot", stars: 7, language: "Ruby", pushedDaysAgo: 5 }],
};

export interface FakeGitHub {
  calls: string[];
  failWith: { status: number; headers?: Record<string, string> } | null;
  count: (fragment: string) => number;
}

const json = (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", "x-ratelimit-limit": "5000", "x-ratelimit-remaining": "4900", ...init.headers },
  });

// Replaces global fetch with an in-memory GitHub; every upstream call is recorded in `calls`.
export function installFakeGitHub(users: FakeUser[]): FakeGitHub {
  const fake: FakeGitHub = {
    calls: [],
    failWith: null,
    count: (fragment) => fake.calls.filter((call) => call.includes(fragment)).length,
  };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string, init?: RequestInit) => {
      const url = new URL(input.toString());
      fake.calls.push(url.pathname);
      if (fake.failWith) return json({ message: "nope" }, fake.failWith);

      const etag = (init?.headers as Record<string, string> | undefined)?.["If-None-Match"];
      const parts = url.pathname.split("/").filter(Boolean);

      if (parts[0] === "users") {
        const user = users.find((candidate) => candidate.login.toLowerCase() === parts[1]?.toLowerCase());
        if (!user) return json({ message: "Not Found" }, { status: 404 });

        if (parts[2] === "repos") {
          if (etag === `"repos-${user.id}"`) return new Response(null, { status: 304 });
          const page = Number(url.searchParams.get("page") ?? 1);
          const body =
            page > 1
              ? []
              : user.repos.map((repo) => ({
                  id: repo.id,
                  name: repo.name,
                  full_name: `${user.login}/${repo.name}`,
                  description: `${repo.name} repo`,
                  html_url: `https://github.com/${user.login}/${repo.name}`,
                  fork: repo.fork ?? false,
                  archived: false,
                  stargazers_count: repo.stars,
                  forks_count: 1,
                  open_issues_count: 0,
                  language: repo.language ?? null,
                  pushed_at: new Date(Date.now() - (repo.pushedDaysAgo ?? 1) * dayMs).toISOString(),
                  created_at: "2020-01-01T00:00:00Z",
                }));
          return json(body, { headers: { etag: `"repos-${user.id}"` } });
        }

        if (etag === `"user-${user.id}"`) return new Response(null, { status: 304 });
        return json(
          {
            id: user.id,
            login: user.login,
            name: `${user.login} name`,
            bio: null,
            company: null,
            location: null,
            blog: "",
            html_url: `https://github.com/${user.login}`,
            avatar_url: `https://avatars.example/${user.id}`,
            followers: 10 * user.repos.length,
            following: 1,
            public_repos: user.repos.length,
            created_at: "2011-01-25T18:44:36Z",
          },
          { headers: { etag: `"user-${user.id}"` } },
        );
      }

      if (parts[0] === "repos" && parts[3] === "languages") {
        return json(parts[2] === "hello" ? { TypeScript: 3000, CSS: 1000 } : { Go: 500 });
      }
      if (parts[0] === "repos" && parts[3] === "commits") {
        const now = new Date();
        const twoWeeksAgo = new Date(Date.now() - 14 * dayMs);
        return json([
          { commit: { author: { date: now.toISOString() } } },
          { commit: { author: { date: now.toISOString() } } },
          { commit: { author: { date: twoWeeksAgo.toISOString() } } },
        ]);
      }
      return json({ message: "unexpected" }, { status: 500 });
    }),
  );
  return fake;
}

export async function signUp(app: Express, email = "dev@example.com") {
  const res = await request(app).post("/api/v1/auth/signup").send({ email, password: "correct-horse" });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user.id as string };
}
