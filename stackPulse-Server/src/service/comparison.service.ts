import { UniqueConstraintError } from "@sequelize/core";
import { sequelize } from "#config/sequelize.js";
import type { Comparison, ComparisonDeveloper } from "#database/models/index.js";
import { comparisonRepository } from "#repository/comparison.repository.js";
import type { ComparisonListQuery, CreateComparisonInput, UpdateComparisonInput } from "#schemas/comparison.schema.js";
import { ConflictError, NotFoundError } from "#utils/app.errors.js";
import { compareService } from "./compare.service.js";
import { ensureDeveloper, parseUsernameList } from "./developerSync.service.js";

const duplicateName = () => new ConflictError("You already have a comparison with this name");

const toDeveloper = (member: ComparisonDeveloper) => ({
  username: member.developer!.githubUsername,
  avatarUrl: member.developer!.avatarUrl,
  name: member.developer!.name,
});

const toDto = (comparison: Comparison, members: ComparisonDeveloper[]) => ({
  id: comparison.id,
  name: comparison.name,
  createdAt: comparison.createdAt.toISOString(),
  updatedAt: comparison.updatedAt.toISOString(),
  developers: members.filter((member) => member.comparisonId === comparison.id).map(toDeveloper),
});

async function loadOwned(userId: string, id: number) {
  const comparison = await comparisonRepository.findOwned(userId, id);
  if (!comparison) throw new NotFoundError("Comparison not found");
  return comparison;
}

// Resolves every username through the normal sync path so saved comparisons only reference known developers.
async function resolveDeveloperIds(usernames: string[]) {
  const results = await Promise.all(usernames.map((username) => ensureDeveloper(username)));
  return results.map((result) => result.developer.id);
}

export const comparisonService = {
  async create(userId: string, input: CreateComparisonInput) {
    const usernames = parseUsernameList(input.usernames);
    if (await comparisonRepository.findByName(userId, input.name)) throw duplicateName();
    const developerIds = await resolveDeveloperIds(usernames);

    try {
      const id = await sequelize.transaction(async (transaction) => {
        const comparison = await comparisonRepository.create({ userId, name: input.name }, transaction);
        await comparisonRepository.setMembers(comparison.id, developerIds, transaction);
        return comparison.id;
      });
      return await this.summary(userId, id);
    } catch (error) {
      if (error instanceof UniqueConstraintError) throw duplicateName();
      throw error;
    }
  },

  async summary(userId: string, id: number) {
    const comparison = await loadOwned(userId, id);
    return toDto(comparison, await comparisonRepository.members([comparison.id]));
  },

  async list(userId: string, query: ComparisonListQuery) {
    const { rows, count } = await comparisonRepository.page(userId, query.limit, (query.page - 1) * query.limit);
    const members = rows.length > 0 ? await comparisonRepository.members(rows.map((row) => row.id)) : [];
    return {
      comparisons: rows.map((row) => toDto(row, members)),
      page: { page: query.page, limit: query.limit, total: count },
    };
  },

  // Metrics are computed live, so a saved comparison always shows current numbers.
  async get(userId: string, id: number) {
    const summary = await this.summary(userId, id);
    const compare = await compareService.compare(summary.developers.map((developer) => developer.username));
    return { ...summary, compare };
  },

  async update(userId: string, id: number, input: UpdateComparisonInput) {
    const comparison = await loadOwned(userId, id);
    const usernames = input.usernames && parseUsernameList(input.usernames);
    if (input.name && (await comparisonRepository.findByName(userId, input.name, id))) throw duplicateName();
    const developerIds = usernames ? await resolveDeveloperIds(usernames) : null;

    try {
      await sequelize.transaction(async (transaction) => {
        if (input.name) await comparison.update({ name: input.name }, { transaction });
        if (developerIds) {
          await comparisonRepository.setMembers(id, developerIds, transaction);
          await comparison.update({ updatedAt: new Date() }, { transaction });
        }
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) throw duplicateName();
      throw error;
    }
    return this.summary(userId, id);
  },

  async remove(userId: string, id: number) {
    const comparison = await loadOwned(userId, id);
    await comparison.destroy();
  },
};
