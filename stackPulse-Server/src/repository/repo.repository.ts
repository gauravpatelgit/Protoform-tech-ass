import { Op, type Order, type WhereOptions } from "@sequelize/core";
import { sequelize } from "#config/sequelize.js";
import { Repo, RepoCommitWeek, RepoLanguage } from "#database/models/index.js";
import type { GitHubRepo } from "#integrations/github/github.types.js";

export interface RepoFilter {
  includeForks: boolean;
  language?: string | undefined;
}

export type RepoSort = "stars" | "pushed" | "name";

const ORDER: Record<RepoSort, Order> = {
  stars: [
    ["stars", "DESC"],
    ["pushedAt", "DESC"],
    ["id", "ASC"],
  ],
  pushed: [
    ["pushedAt", "DESC"],
    ["id", "ASC"],
  ],
  name: [
    ["name", "ASC"],
    ["id", "ASC"],
  ],
};

const where = (developerId: number, filter: RepoFilter): WhereOptions<Repo> => ({
  developerId,
  ...(!filter.includeForks && { isFork: false }),
  ...(filter.language && { primaryLanguage: filter.language }),
});

const toDate = (value: string | null) => (value ? new Date(value) : null);

export const repoRepository = {
  // Upserts by GitHub id and drops repos that no longer exist upstream; keeps enrichment timestamps intact.
  async replaceForDeveloper(developerId: number, incoming: GitHubRepo[]) {
    await sequelize.transaction(async (transaction) => {
      const keepIds = incoming.map((repo) => repo.id);
      // Delete by primary key only: range deletes take gap locks that deadlock with concurrent syncs.
      const existing = await Repo.findAll({ attributes: ["id", "githubId"], where: { developerId }, transaction });
      const staleIds = existing.filter((repo) => !keepIds.includes(repo.githubId)).map((repo) => repo.id);
      if (staleIds.length > 0) await Repo.destroy({ where: { id: staleIds }, transaction });
      if (keepIds.length === 0) return;

      await Repo.bulkCreate(
        incoming.map((repo) => ({
          githubId: repo.id,
          developerId,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          htmlUrl: repo.html_url,
          isFork: repo.fork,
          isArchived: repo.archived,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          openIssues: repo.open_issues_count,
          primaryLanguage: repo.language,
          pushedAt: toDate(repo.pushed_at),
          githubCreatedAt: toDate(repo.created_at),
          languagesFetchedAt: null,
          commitsFetchedAt: null,
        })),
        {
          transaction,
          updateOnDuplicate: [
            "developerId",
            "name",
            "fullName",
            "description",
            "htmlUrl",
            "isFork",
            "isArchived",
            "stars",
            "forks",
            "openIssues",
            "primaryLanguage",
            "pushedAt",
            "githubCreatedAt",
            "updatedAt",
          ],
        },
      );
    });
  },

  // Candidates for the expensive per-repo calls: own, active repos ranked by popularity then recency.
  topForEnrichment: (developerId: number, limit: number) =>
    Repo.findAll({
      where: { developerId, isFork: false, isArchived: false },
      order: ORDER.stars,
      limit,
    }),

  findById: (id: number) => Repo.findByPk(id),

  page: (developerId: number, filter: RepoFilter, sort: RepoSort, limit: number, offset: number) =>
    Repo.findAndCountAll({ where: where(developerId, filter), order: ORDER[sort], limit, offset }),

  top: (developerId: number, filter: RepoFilter, limit: number) => Repo.findAll({ where: where(developerId, filter), order: ORDER.stars, limit }),

  listIdsAndLanguages: (developerId: number, filter: RepoFilter) =>
    Repo.findAll({ attributes: ["id", "primaryLanguage", "commitsFetchedAt"], where: where(developerId, filter) }),

  countAll: (developerId: number, filter: RepoFilter) => Repo.count({ where: where(developerId, filter) }),

  countActiveSince: (developerId: number, filter: RepoFilter, since: Date) =>
    Repo.count({ where: { ...where(developerId, filter), pushedAt: { [Op.gte]: since } } }),

  async sumStars(developerId: number, filter: RepoFilter): Promise<number> {
    const total = await Repo.sum("stars", { where: where(developerId, filter) });
    return Number(total ?? 0);
  },

  async saveLanguages(repoId: number, bytesByLanguage: Record<string, number>) {
    await sequelize.transaction(async (transaction) => {
      const existing = await RepoLanguage.findAll({ attributes: ["language"], where: { repoId }, transaction });
      const stale = existing.map((row) => row.language).filter((language) => !(language in bytesByLanguage));
      if (stale.length > 0) await RepoLanguage.destroy({ where: { repoId, language: stale }, transaction });
      const rows = Object.entries(bytesByLanguage).map(([language, bytes]) => ({ repoId, language, bytes }));
      if (rows.length > 0) await RepoLanguage.bulkCreate(rows, { transaction, updateOnDuplicate: ["bytes"] });
      await Repo.update({ languagesFetchedAt: new Date() }, { where: { id: repoId }, transaction });
    });
  },

  async saveCommitWeeks(repoId: number, commitsByWeek: Map<string, number>) {
    await sequelize.transaction(async (transaction) => {
      const existing = await RepoCommitWeek.findAll({ attributes: ["weekStart"], where: { repoId }, transaction });
      const stale = existing.map((row) => row.weekStart).filter((week) => !commitsByWeek.has(week));
      if (stale.length > 0) await RepoCommitWeek.destroy({ where: { repoId, weekStart: stale }, transaction });
      const rows = [...commitsByWeek].map(([weekStart, commits]) => ({ repoId, weekStart, commits }));
      if (rows.length > 0) await RepoCommitWeek.bulkCreate(rows, { transaction, updateOnDuplicate: ["commits"] });
      await Repo.update({ commitsFetchedAt: new Date() }, { where: { id: repoId }, transaction });
    });
  },

  languageBytes: (repoIds: number[]) =>
    RepoLanguage.findAll({
      attributes: ["language", [sequelize.fn("SUM", sequelize.col("bytes")), "bytes"]],
      where: { repoId: repoIds },
      group: ["language"],
      raw: true,
    }) as unknown as Promise<{ language: string; bytes: string | number }[]>,

  commitsByWeek: (repoIds: number[], since: string) =>
    RepoCommitWeek.findAll({
      attributes: ["weekStart", [sequelize.fn("SUM", sequelize.col("commits")), "commits"]],
      where: { repoId: repoIds, weekStart: { [Op.gte]: since } },
      group: ["weekStart"],
      raw: true,
    }) as unknown as Promise<{ weekStart: string; commits: string | number }[]>,
};
