import type { Developer } from "#database/models/index.js";
import { developerRepository } from "#repository/developer.repository.js";
import { repoRepository, type RepoSort } from "#repository/repo.repository.js";
import { TooManyRequestsError } from "#utils/app.errors.js";
import { computeMetrics, withPinState, type DeveloperMetrics } from "./metrics.service.js";
import { ensureDeveloper, normalizeUsername } from "./developerSync.service.js";

const REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
const lastRefresh = new Map<string, number>();

export const toProfile = (developer: Developer) => ({
  username: developer.githubUsername,
  name: developer.name,
  avatarUrl: developer.avatarUrl,
  bio: developer.bio,
  company: developer.company,
  location: developer.location,
  blog: developer.blog,
  htmlUrl: developer.htmlUrl,
  followers: developer.followers,
  following: developer.following,
  publicRepos: developer.publicRepos,
  githubCreatedAt: developer.githubCreatedAt?.toISOString() ?? null,
});

export interface DeveloperView {
  developer: { profile: ReturnType<typeof toProfile>; metrics: DeveloperMetrics; enrichmentStatus: Developer["enrichmentStatus"] };
  meta: { stale: boolean; fetchedAt: string; sampledRepos: number };
}

async function buildView(developer: Developer, stale: boolean): Promise<DeveloperView> {
  const { metrics, sampledRepos } = await computeMetrics(developer, { includeForks: false });
  return {
    developer: { profile: toProfile(developer), metrics, enrichmentStatus: developer.enrichmentStatus },
    meta: { stale, fetchedAt: developer.fetchedAt.toISOString(), sampledRepos },
  };
}

export const developerService = {
  async get(username: string): Promise<DeveloperView> {
    const { developer, stale } = await ensureDeveloper(username);
    // Re-read: enrichment may have finished while the sync was in flight.
    const fresh = (await developerRepository.findById(developer.id)) ?? developer;
    return buildView(fresh, stale);
  },

  async refresh(userId: string, username: string): Promise<DeveloperView> {
    const key = `${userId}:${normalizeUsername(username).toLowerCase()}`;
    const last = lastRefresh.get(key) ?? 0;
    const remaining = last + REFRESH_COOLDOWN_MS - Date.now();
    if (remaining > 0) throw new TooManyRequestsError("This developer was refreshed recently", Math.ceil(remaining / 1000));

    const { developer, stale } = await ensureDeveloper(username, { force: true });
    if (!stale) lastRefresh.set(key, Date.now());
    const fresh = (await developerRepository.findById(developer.id)) ?? developer;
    return buildView(fresh, stale);
  },

  // Metrics for compare; shares the same sync and cache path as the single-developer view.
  async metricsFor(username: string) {
    const view = await this.get(username);
    return view.developer;
  },

  async repos(
    userId: string,
    username: string,
    query: { sort: RepoSort; language?: string | undefined; includeForks: boolean; page: number; limit: number },
  ) {
    const { developer } = await ensureDeveloper(username);
    const { rows, count } = await repoRepository.page(
      developer.id,
      { includeForks: query.includeForks, language: query.language },
      query.sort,
      query.limit,
      (query.page - 1) * query.limit,
    );
    return { repos: await withPinState(rows, userId), page: { page: query.page, limit: query.limit, total: count } };
  },

  async recent() {
    const developers = await developerRepository.recent(10);
    return developers.map((developer) => ({
      username: developer.githubUsername,
      avatarUrl: developer.avatarUrl,
      name: developer.name,
    }));
  },
};
