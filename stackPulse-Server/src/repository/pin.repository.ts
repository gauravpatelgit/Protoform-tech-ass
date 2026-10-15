import { col, fn, Op, where, type WhereOptions } from "@sequelize/core";
import { Developer, Pin, Repo } from "#database/models/index.js";

// Every query is scoped by userId, so another user's pin is indistinguishable from a missing one.
const withRepo = (developerUsername?: string) => [
  {
    model: Repo,
    as: "repo",
    required: true,
    include: [
      {
        model: Developer,
        as: "developer",
        required: true,
        ...(developerUsername && { where: { githubUsername: developerUsername } }),
      },
    ],
  },
];

export const pinRepository = {
  findOwned: (userId: string, id: number) => Pin.findOne({ where: { id, userId }, include: withRepo() }),

  findByRepo: (userId: string, repoId: number) => Pin.findOne({ where: { userId, repoId } }),

  create: (values: { userId: string; repoId: number; note: string | null; tags: string[] }) => Pin.create(values),

  list(userId: string, filter: { tag?: string | undefined; developer?: string | undefined }, limit: number, offset: number) {
    const conditions: NonNullable<WhereOptions<Pin>>[] = [{ userId }];
    if (filter.tag) conditions.push(where(fn("JSON_CONTAINS", col("Pin.tags"), fn("JSON_QUOTE", filter.tag)), 1));

    return Pin.findAndCountAll({
      where: { [Op.and]: conditions },
      include: withRepo(filter.developer),
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset,
    });
  },
};
