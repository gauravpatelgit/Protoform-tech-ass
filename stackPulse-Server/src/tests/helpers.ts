import { sequelize } from "#config/sequelize.js";
import { Comparison, ComparisonDeveloper, Developer, Pin, RefreshToken, Repo, RepoCommitWeek, RepoLanguage, User } from "#database/models/index.js";

// Children first so foreign keys never block a delete.
export async function resetDatabase() {
  await ComparisonDeveloper.destroy({ where: {} });
  await Comparison.destroy({ where: {} });
  await Pin.destroy({ where: {} });
  await RepoCommitWeek.destroy({ where: {} });
  await RepoLanguage.destroy({ where: {} });
  await Repo.destroy({ where: {} });
  await Developer.destroy({ where: {} });
  await RefreshToken.destroy({ where: {} });
  await User.destroy({ where: {} });
}

export const closeDatabase = () => sequelize.close();
