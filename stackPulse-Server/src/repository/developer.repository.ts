import { Op } from "@sequelize/core";
import { Developer } from "#database/models/index.js";

export const developerRepository = {
  findByUsername: (username: string) => Developer.findOne({ where: { githubUsername: username } }),
  findByGithubId: (githubId: number) => Developer.findOne({ where: { githubId } }),
  findById: (id: number) => Developer.findByPk(id),
  findManyByUsernames: (usernames: string[]) => Developer.findAll({ where: { githubUsername: usernames } }),
  // Only developers whose sync fully completed are suggested.
  recent: (limit: number) => Developer.findAll({ where: { fetchedAt: { [Op.gt]: new Date(0) } }, order: [["fetchedAt", "DESC"]], limit }),
  withActiveEnrichment: () => Developer.findAll({ where: { enrichmentStatus: ["pending", "running"] } }),
};
