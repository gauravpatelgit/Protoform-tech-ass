import logger from "#config/logger.js";
import { AppError } from "#utils/app.errors.js";
import { developerService, type DeveloperView } from "./developer.service.js";
import { parseUsernameList } from "./developerSync.service.js";
import type { DeveloperMetrics } from "./metrics.service.js";

export type NumericMetric = "totalStars" | "followers" | "repoCount" | "avgStarsPerRepo" | "commits52w" | "activeRepos90d" | "languageCount";

const NUMERIC_METRICS: NumericMetric[] = ["totalStars", "followers", "repoCount", "avgStarsPerRepo", "commits52w", "activeRepos90d", "languageCount"];

export interface CompareEntry {
  username: string;
  status: "ok" | "error";
  error?: string;
  profile?: DeveloperView["developer"]["profile"];
  metrics?: DeveloperMetrics;
  enrichmentStatus?: DeveloperView["developer"]["enrichmentStatus"];
}

export interface CompareResult {
  developers: CompareEntry[];
  leaders: Record<NumericMetric, string[]>;
}

async function resolveEntry(username: string): Promise<CompareEntry> {
  try {
    const { developer } = await developerService.get(username);
    return {
      username: developer.profile.username,
      status: "ok",
      profile: developer.profile,
      metrics: developer.metrics,
      enrichmentStatus: developer.enrichmentStatus,
    };
  } catch (error) {
    if (error instanceof AppError) return { username, status: "error", error: error.message };
    logger.error("Compare entry failed", { error, username });
    return { username, status: "error", error: "Could not load this developer" };
  }
}

// Ties share the lead; a metric where everyone is at zero has no leader.
export function computeLeaders(entries: CompareEntry[]): Record<NumericMetric, string[]> {
  const ok = entries.filter((entry) => entry.status === "ok" && entry.metrics);
  const leaders = {} as Record<NumericMetric, string[]>;

  for (const metric of NUMERIC_METRICS) {
    const values = ok.map((entry) => ({ username: entry.username, value: entry.metrics![metric] }));
    const best = Math.max(0, ...values.map((item) => item.value));
    leaders[metric] = best > 0 ? values.filter((item) => item.value === best).map((item) => item.username) : [];
  }
  return leaders;
}

export const compareService = {
  parse: (values: string[]) => parseUsernameList(values),

  // One failing developer never fails the whole comparison.
  async compare(usernames: string[]): Promise<CompareResult> {
    const developers = await Promise.all(usernames.map(resolveEntry));
    return { developers, leaders: computeLeaders(developers) };
  },
};
