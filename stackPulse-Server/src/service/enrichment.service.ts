import { env } from "#config/env.js";
import logger from "#config/logger.js";
import { Developer, Repo } from "#database/models/index.js";
import { githubClient, GitHubRateLimitError } from "#integrations/github/github.client.js";
import { hasBudgetForEnrichment } from "#integrations/github/rateLimit.js";
import { developerRepository } from "#repository/developer.repository.js";
import { repoRepository } from "#repository/repo.repository.js";

const WEEKS = 52;
const inflight = new Map<number, Promise<void>>();

const needsLanguages = (repo: Repo) => !repo.languagesFetchedAt || (!!repo.pushedAt && repo.pushedAt > repo.languagesFetchedAt);
const needsCommits = (repo: Repo) => !repo.commitsFetchedAt || (!!repo.pushedAt && repo.pushedAt > repo.commitsFetchedAt);

type Outcome = "ok" | "rate-limited" | "failed";

async function enrichRepo(repo: Repo, username: string): Promise<Outcome> {
  try {
    if (needsLanguages(repo)) await repoRepository.saveLanguages(repo.id, await githubClient.getLanguages(repo.fullName));
    if (needsCommits(repo)) {
      const since = new Date(Date.now() - WEEKS * 7 * 24 * 3600 * 1000);
      await repoRepository.saveCommitWeeks(repo.id, await githubClient.getCommitWeeks(repo.fullName, username, since));
    }
    return "ok";
  } catch (error) {
    if (error instanceof GitHubRateLimitError) return "rate-limited";
    logger.warn(`Enrichment failed for ${repo.fullName}`, { error });
    return "failed";
  }
}

async function run(developerId: number): Promise<void> {
  const developer = await developerRepository.findById(developerId);
  if (!developer) return;

  if (!hasBudgetForEnrichment()) {
    await developer.update({ enrichmentStatus: "partial" });
    return;
  }

  await developer.update({ enrichmentStatus: "running" });
  const repos = (await repoRepository.topForEnrichment(developer.id, env.GITHUB_TOP_K_REPOS)).filter(
    (repo) => needsLanguages(repo) || needsCommits(repo),
  );
  const outcomes = await Promise.all(repos.map((repo) => enrichRepo(repo, developer.githubUsername)));

  const failures = outcomes.filter((outcome) => outcome !== "ok").length;
  const status = failures === 0 ? "ready" : outcomes.includes("rate-limited") || failures < outcomes.length ? "partial" : "failed";
  await developer.update({ enrichmentStatus: status, enrichedAt: new Date() });
}

function start(developerId: number) {
  if (inflight.has(developerId)) return;
  const task = run(developerId)
    .catch(async (error) => {
      logger.error("Enrichment crashed", { error, developerId });
      await Developer.update({ enrichmentStatus: "failed" }, { where: { id: developerId } });
    })
    .finally(() => inflight.delete(developerId));
  inflight.set(developerId, task);
}

export const enrichmentService = {
  // Marks the developer pending and runs enrichment in the background; the caller does not wait.
  async schedule(developer: Developer): Promise<void> {
    if (inflight.has(developer.id)) return;
    await developer.update({ enrichmentStatus: "pending" });
    start(developer.id);
  },

  // Picks up work that a process restart interrupted.
  async resumeInterrupted(): Promise<number> {
    const stuck = await developerRepository.withActiveEnrichment();
    stuck.forEach((developer) => start(developer.id));
    return stuck.length;
  },

  idle: async () => {
    while (inflight.size > 0) await Promise.all(inflight.values());
  },
};
