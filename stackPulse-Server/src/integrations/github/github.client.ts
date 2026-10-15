import pLimit from "p-limit";
import { env } from "#config/env.js";
import logger from "#config/logger.js";
import { BadGatewayError, NotFoundError, TooManyRequestsError } from "#utils/app.errors.js";
import { weekStartOf } from "#utils/dates.js";
import type { GitHubCommit, GitHubRepo, GitHubResult, GitHubUser } from "./github.types.js";
import { blockFor, rateLimitState, recordRateLimit, secondsUntilAvailable } from "./rateLimit.js";

export class GitHubRateLimitError extends TooManyRequestsError {
  constructor(retryAfterSeconds: number) {
    super("GitHub rate limit reached, try again shortly", retryAfterSeconds);
    this.name = "GitHubRateLimitError";
  }
}

export class GitHubNotFoundError extends NotFoundError {
  constructor(what: string) {
    super(`${what} was not found on GitHub`);
    this.name = "GitHubNotFoundError";
  }
}

const REPOS_PAGE_SIZE = 100;
const MAX_REPO_PAGES = 10;
const MAX_COMMIT_PAGES = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 2;

// One shared gate: GitHub's secondary limits punish bursts, so cap in-flight calls globally.
const gate = pLimit(env.GITHUB_CONCURRENCY);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call<T>(path: string, params: Record<string, string | number> = {}, etag?: string | null): Promise<GitHubResult<T>> {
  const wait = secondsUntilAvailable();
  if (wait > 0) throw new GitHubRateLimitError(wait);

  const url = new URL(path, env.GITHUB_API_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "stackpulse",
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  if (etag) headers["If-None-Match"] = etag;

  return gate(async () => {
    for (let attempt = 1; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      } catch (error) {
        if (attempt < MAX_ATTEMPTS) {
          await sleep(500 * 2 ** (attempt - 1));
          continue;
        }
        logger.warn("GitHub request failed", { path, error });
        throw new BadGatewayError("Could not reach GitHub");
      }

      recordRateLimit(response.headers);

      if (response.status === 304) return { notModified: true, data: null, etag: etag ?? null };
      if (response.ok) return { notModified: false, data: (await response.json()) as T, etag: response.headers.get("etag") };
      if (response.status === 404) throw new GitHubNotFoundError(path);
      // Empty repositories answer 409 on the commits endpoint.
      if (response.status === 409) return { notModified: false, data: null, etag: null };

      if (response.status === 429 || response.status === 403) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const exhausted = rateLimitState.remaining === 0 && rateLimitState.resetAt !== null;
        if (retryAfter > 0 || exhausted) {
          const seconds = retryAfter > 0 ? retryAfter : Math.max(1, Math.ceil(((rateLimitState.resetAt ?? 0) - Date.now()) / 1000));
          blockFor(seconds);
          throw new GitHubRateLimitError(seconds);
        }
      }

      if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
        await sleep(500 * 2 ** (attempt - 1));
        continue;
      }
      throw new BadGatewayError(`GitHub responded with ${response.status}`);
    }
  });
}

export const githubClient = {
  getUser: (username: string, etag?: string | null) => call<GitHubUser>(`/users/${encodeURIComponent(username)}`, {}, etag),

  // Only page 1 can be conditional; callers must skip the etag when the account has more than one page.
  async listRepos(username: string, etag?: string | null): Promise<GitHubResult<GitHubRepo[]>> {
    const repos: GitHubRepo[] = [];
    let firstEtag: string | null = null;

    for (let page = 1; page <= MAX_REPO_PAGES; page++) {
      const result = await call<GitHubRepo[]>(
        `/users/${encodeURIComponent(username)}/repos`,
        { per_page: REPOS_PAGE_SIZE, sort: "pushed", type: "owner", page },
        page === 1 ? etag : null,
      );
      if (page === 1) {
        if (result.notModified) return { notModified: true, data: null, etag: etag ?? null };
        firstEtag = result.etag;
      }
      const batch = result.data ?? [];
      repos.push(...batch);
      if (batch.length < REPOS_PAGE_SIZE) break;
    }
    return { notModified: false, data: repos, etag: firstEtag };
  },

  async getLanguages(fullName: string): Promise<Record<string, number>> {
    const { data } = await call<Record<string, number>>(`/repos/${fullName}/languages`);
    return data ?? {};
  },

  // Commits authored by `username` since `since`, bucketed by Monday-start UTC week. Capped at 300 commits per repo.
  async getCommitWeeks(fullName: string, username: string, since: Date): Promise<Map<string, number>> {
    const weeks = new Map<string, number>();
    for (let page = 1; page <= MAX_COMMIT_PAGES; page++) {
      const { data } = await call<GitHubCommit[]>(`/repos/${fullName}/commits`, {
        author: username,
        since: since.toISOString(),
        per_page: 100,
        page,
      });
      const commits = data ?? [];
      for (const item of commits) {
        const date = item.commit.author?.date;
        if (!date) continue;
        const week = weekStartOf(new Date(date));
        weeks.set(week, (weeks.get(week) ?? 0) + 1);
      }
      if (commits.length < 100) break;
    }
    return weeks;
  },
};
