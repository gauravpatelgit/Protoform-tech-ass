import { env } from "#config/env.js";
import { Developer } from "#database/models/index.js";
import { githubClient, GitHubNotFoundError, GitHubRateLimitError } from "#integrations/github/github.client.js";
import type { GitHubUser } from "#integrations/github/github.types.js";
import { developerRepository } from "#repository/developer.repository.js";
import { repoRepository } from "#repository/repo.repository.js";
import { BadGatewayError, NotFoundError, ValidationError } from "#utils/app.errors.js";
import { SingleFlight } from "#utils/singleflight.js";
import { enrichmentService } from "./enrichment.service.js";

export interface SyncResult {
  developer: Developer;
  stale: boolean;
}

const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const MAX_STALE_MS = 7 * 24 * 3600 * 1000;
const NOT_FOUND_TTL_MS = 5 * 60 * 1000;

const flights = new SingleFlight<Developer>();
const knownMissing = new Map<string, number>();

export function normalizeUsername(raw: string): string {
  const username = raw.trim();
  if (!USERNAME_PATTERN.test(username)) throw new ValidationError(`"${raw}" is not a valid GitHub username`);
  return username;
}

// Splits, validates and de-duplicates (case-insensitively) a list of usernames for compare-style requests.
export function parseUsernameList(values: string[], min = 2, max = 5): string[] {
  const unique = new Map<string, string>();
  for (const value of values.flatMap((entry) => entry.split(","))) {
    if (value.trim() === "") continue;
    const username = normalizeUsername(value);
    if (!unique.has(username.toLowerCase())) unique.set(username.toLowerCase(), username);
  }
  if (unique.size < min || unique.size > max) throw new ValidationError(`Provide between ${min} and ${max} distinct usernames`);
  return [...unique.values()];
}

const isFresh = (developer: Developer) => Date.now() - developer.fetchedAt.getTime() < env.GITHUB_PROFILE_TTL_MIN * 60_000;
const isServableStale = (developer: Developer) => Date.now() - developer.fetchedAt.getTime() < MAX_STALE_MS;

const toDate = (value: string | null) => (value ? new Date(value) : null);

const profileValues = (user: GitHubUser) => ({
  githubUsername: user.login,
  name: user.name,
  bio: user.bio,
  company: user.company,
  location: user.location,
  blog: user.blog || null,
  htmlUrl: user.html_url,
  avatarUrl: user.avatar_url,
  followers: user.followers,
  following: user.following,
  publicRepos: user.public_repos,
  githubCreatedAt: toDate(user.created_at),
});

async function syncProfile(username: string, existing: Developer | null): Promise<Developer> {
  const result = await githubClient.getUser(username, existing?.profileEtag);
  if (result.notModified && existing) return existing;
  if (!result.data) throw new BadGatewayError("GitHub returned an empty profile");

  const user = result.data;
  const current = existing ?? (await developerRepository.findByGithubId(user.id));
  if (current) return current.update({ ...profileValues(user), profileEtag: result.etag });

  // fetchedAt stays at the epoch until repos are stored, so a half-synced row is never treated as fresh.
  return Developer.create({
    githubId: user.id,
    ...profileValues(user),
    profileEtag: result.etag,
    reposEtag: null,
    fetchedAt: new Date(0),
    reposFetchedAt: null,
    enrichedAt: null,
  });
}

async function sync(username: string, existing: Developer | null): Promise<Developer> {
  const developer = await syncProfile(username, existing);

  // Only page 1 is conditional, so the shortcut is valid only for accounts that fit on one page.
  const reposEtag = developer.publicRepos <= 100 ? developer.reposEtag : null;
  const repos = await githubClient.listRepos(developer.githubUsername, reposEtag);
  if (!repos.notModified && repos.data) {
    await repoRepository.replaceForDeveloper(developer.id, repos.data);
    developer.reposEtag = repos.etag;
    developer.reposFetchedAt = new Date();
  }

  developer.fetchedAt = new Date();
  await developer.save();

  const needsEnrichment = !repos.notModified || developer.enrichmentStatus !== "ready";
  if (needsEnrichment) await enrichmentService.schedule(developer);
  return developer;
}

export async function ensureDeveloper(rawUsername: string, options: { force?: boolean } = {}): Promise<SyncResult> {
  const username = normalizeUsername(rawUsername);
  const key = username.toLowerCase();

  const existing = await developerRepository.findByUsername(username);
  if (existing && !options.force && isFresh(existing)) return { developer: existing, stale: false };

  if (!existing && (knownMissing.get(key) ?? 0) > Date.now()) {
    throw new NotFoundError(`GitHub user "${username}" was not found`);
  }

  try {
    const developer = await flights.run(key, () => sync(username, existing));
    knownMissing.delete(key);
    return { developer, stale: false };
  } catch (error) {
    if (error instanceof GitHubNotFoundError) {
      knownMissing.set(key, Date.now() + NOT_FOUND_TTL_MS);
      throw new NotFoundError(`GitHub user "${username}" was not found`);
    }
    const upstreamProblem = error instanceof GitHubRateLimitError || error instanceof BadGatewayError;
    if (upstreamProblem && existing && isServableStale(existing)) return { developer: existing, stale: true };
    throw error;
  }
}

export const resetSyncCaches = () => knownMissing.clear();
