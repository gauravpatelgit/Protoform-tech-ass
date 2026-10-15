import { Op, type Transaction } from "@sequelize/core";
import { Comparison, ComparisonDeveloper } from "#database/models/index.js";

// Every query is scoped by userId: another user's comparison is indistinguishable from a missing one.
export const comparisonRepository = {
  findOwned: (userId: string, id: number) => Comparison.findOne({ where: { id, userId } }),

  findByName: (userId: string, name: string, excludeId?: number) =>
    Comparison.findOne({ where: { userId, name, ...(excludeId !== undefined && { id: { [Op.ne]: excludeId } }) } }),

  create: (values: { userId: string; name: string }, transaction: Transaction) => Comparison.create(values, { transaction }),

  page: (userId: string, limit: number, offset: number) =>
    Comparison.findAndCountAll({
      where: { userId },
      order: [
        ["updatedAt", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset,
    }),

  members: (comparisonIds: number[]) =>
    ComparisonDeveloper.findAll({
      where: { comparisonId: comparisonIds },
      include: ["developer"],
      order: [["position", "ASC"]],
    }),

  // Keeps rows that stay, removes the others by key and rewrites positions.
  async setMembers(comparisonId: number, developerIds: number[], transaction: Transaction) {
    const existing = await ComparisonDeveloper.findAll({ where: { comparisonId }, transaction });
    const removed = existing.filter((row) => !developerIds.includes(row.developerId)).map((row) => row.developerId);
    if (removed.length > 0) await ComparisonDeveloper.destroy({ where: { comparisonId, developerId: removed }, transaction });
    await ComparisonDeveloper.bulkCreate(
      developerIds.map((developerId, position) => ({ comparisonId, developerId, position })),
      { transaction, updateOnDuplicate: ["position"] },
    );
  },
};
