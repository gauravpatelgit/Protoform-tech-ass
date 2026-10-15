import { UniqueConstraintError } from "@sequelize/core";
import type { Pin } from "#database/models/index.js";
import { pinRepository } from "#repository/pin.repository.js";
import { repoRepository } from "#repository/repo.repository.js";
import type { CreatePinInput, PinListQuery, UpdatePinInput } from "#schemas/pin.schema.js";
import { ConflictError, NotFoundError } from "#utils/app.errors.js";
import { toRepoDto } from "./metrics.service.js";

const notFound = () => new NotFoundError("Pin not found");

function toPinDto(pin: Pin) {
  const repo = pin.repo;
  const developer = repo?.developer;
  if (!repo || !developer) throw new Error("Pin was loaded without its repo and developer");

  return {
    id: pin.id,
    note: pin.note,
    tags: pin.tags,
    createdAt: pin.createdAt.toISOString(),
    updatedAt: pin.updatedAt.toISOString(),
    repo: {
      ...toRepoDto(repo),
      pinned: true,
      pinId: pin.id,
      developerUsername: developer.githubUsername,
      developerAvatarUrl: developer.avatarUrl,
    },
  };
}

async function loadOwned(userId: string, id: number) {
  const pin = await pinRepository.findOwned(userId, id);
  if (!pin) throw notFound();
  return pin;
}

export const pinService = {
  async create(userId: string, input: CreatePinInput) {
    const repo = await repoRepository.findById(input.repoId);
    if (!repo) throw new NotFoundError("Repository not found");
    if (await pinRepository.findByRepo(userId, repo.id)) throw new ConflictError("Repository is already pinned");

    try {
      const pin = await pinRepository.create({ userId, repoId: repo.id, note: input.note ?? null, tags: input.tags ?? [] });
      return toPinDto(await loadOwned(userId, pin.id));
    } catch (error) {
      // Two simultaneous requests can both pass the check above; the unique index is the real guard.
      if (error instanceof UniqueConstraintError) throw new ConflictError("Repository is already pinned");
      throw error;
    }
  },

  async list(userId: string, query: PinListQuery) {
    const { rows, count } = await pinRepository.list(userId, query, query.limit, (query.page - 1) * query.limit);
    return { pins: rows.map(toPinDto), page: { page: query.page, limit: query.limit, total: count } };
  },

  async get(userId: string, id: number) {
    return toPinDto(await loadOwned(userId, id));
  },

  async update(userId: string, id: number, input: UpdatePinInput) {
    const pin = await loadOwned(userId, id);
    await pin.update({
      ...(input.note !== undefined && { note: input.note }),
      ...(input.tags !== undefined && { tags: input.tags }),
    });
    return toPinDto(pin);
  },

  async remove(userId: string, id: number) {
    const pin = await loadOwned(userId, id);
    await pin.destroy();
  },
};
