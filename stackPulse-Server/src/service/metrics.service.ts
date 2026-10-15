import { Pin, type Developer, type Repo } from "#database/models/index.js";
import { repoRepository, type RepoFilter } from "#repository/repo.repository.js";
import { recentWeekStarts } from "#utils/dates.js";

const WEEKS = 52;
const MAX_LANGUAGES = 8;
const ACTIVE_DAYS = 90;

export interface RepoDto {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  isFork: boolean;
  isArchived: boolean;
  stars: number;
  forks: number;
  primaryLanguage: string | null;
  pushedAt: string | null;
  pinned?: boolean;
  pinId?: number | null;
}

export interface DeveloperMetrics {
  totalStars: number;
  repoCount: number;
  followers: number;
  avgStarsPerRepo: number;
  commits52w: number;
  activeRepos90d: number;
  languageCount: number;
  languages: { language: string; percent: number }[];
  weeklyCommits: { weekStart: string; commits: number }[];
  topRepos: RepoDto[];
}

export const toRepoDto = (repo: Repo): RepoDto => ({
  id: repo.id,
  name: repo.name,
  fullName: repo.fullName,
  description: repo.description,
  htmlUrl: repo.htmlUrl,
  isFork: repo.isFork,
  isArchived: repo.isArchived,
  stars: repo.stars,
  forks: repo.forks,
  primaryLanguage: repo.primaryLanguage,
  pushedAt: repo.pushedAt?.toISOString() ?? null,
});

// Attaches the caller's own pin state; other users' pins are never visible.
export async function withPinState(repos: Repo[], userId: string): Promise<RepoDto[]> {
  const pins = await Pin.findAll({ where: { userId, repoId: repos.map((repo) => repo.id) }, attributes: ["id", "repoId"] });
  const pinByRepo = new Map(pins.map((pin) => [pin.repoId, pin.id]));
  return repos.map((repo) => ({ ...toRepoDto(repo), pinned: pinByRepo.has(repo.id), pinId: pinByRepo.get(repo.id) ?? null }));
}

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

async function languageShares(repos: { id: number; primaryLanguage: string | null }[]) {
  const bytes = await repoRepository.languageBytes(repos.map((repo) => repo.id));
  const totals = new Map<string, number>(bytes.map((row) => [row.language, Number(row.bytes)]));

  // Until enrichment lands, fall back to each repo's primary language so the chart is never empty.
  if (totals.size === 0) {
    for (const repo of repos) {
      if (repo.primaryLanguage) totals.set(repo.primaryLanguage, (totals.get(repo.primaryLanguage) ?? 0) + 1);
    }
  }

  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  const sorted = [...totals].sort((a, b) => b[1] - a[1]);
  const shares = sorted.slice(0, MAX_LANGUAGES).map(([language, value]) => ({ language, percent: round((value / sum) * 100) }));
  const rest = sorted.slice(MAX_LANGUAGES).reduce((acc, [, value]) => acc + value, 0);
  if (rest > 0) shares.push({ language: "Other", percent: round((rest / sum) * 100) });
  return { shares: sum > 0 ? shares : [], languageCount: totals.size };
}

export async function computeMetrics(developer: Developer, filter: RepoFilter): Promise<{ metrics: DeveloperMetrics; sampledRepos: number }> {
  const weekStarts = recentWeekStarts(WEEKS);
  const activeSince = new Date(Date.now() - ACTIVE_DAYS * 24 * 3600 * 1000);

  const [repos, totalStars, activeRepos90d, topRepos] = await Promise.all([
    repoRepository.listIdsAndLanguages(developer.id, filter),
    repoRepository.sumStars(developer.id, filter),
    repoRepository.countActiveSince(developer.id, filter, activeSince),
    repoRepository.top(developer.id, filter, 5),
  ]);

  const ids = repos.map((repo) => repo.id);
  const [{ shares, languageCount }, weekRows] = await Promise.all([
    languageShares(repos),
    ids.length > 0 ? repoRepository.commitsByWeek(ids, weekStarts[0]!) : Promise.resolve([]),
  ]);

  const commitsByWeek = new Map(weekRows.map((row) => [String(row.weekStart).slice(0, 10), Number(row.commits)]));
  const weeklyCommits = weekStarts.map((weekStart) => ({ weekStart, commits: commitsByWeek.get(weekStart) ?? 0 }));
  const repoCount = repos.length;

  return {
    sampledRepos: repos.filter((repo) => repo.commitsFetchedAt).length,
    metrics: {
      totalStars,
      repoCount,
      followers: developer.followers,
      avgStarsPerRepo: repoCount > 0 ? round(totalStars / repoCount) : 0,
      commits52w: weeklyCommits.reduce((acc, week) => acc + week.commits, 0),
      activeRepos90d,
      languageCount,
      languages: shares,
      weeklyCommits,
      topRepos: topRepos.map(toRepoDto),
    },
  };
}
