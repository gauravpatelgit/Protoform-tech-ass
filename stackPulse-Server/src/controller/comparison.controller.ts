import type { RequestHandler } from "express";
import { currentUserId } from "#middleware/auth.middleware.js";
import type { ComparisonListQuery } from "#schemas/comparison.schema.js";
import { compareService } from "#service/compare.service.js";
import { comparisonService } from "#service/comparison.service.js";
import { ok } from "#utils/http.js";

const idOf = (params: Record<string, string | string[] | undefined>) => Number(params.id);

export const compare: RequestHandler = async (req, res) => {
  const { usernames } = req.query as unknown as { usernames: string[] };
  ok(res, await compareService.compare(compareService.parse(usernames)));
};

export const createComparison: RequestHandler = async (req, res) => {
  ok(res, await comparisonService.create(currentUserId(req), req.body), undefined, 201);
};

export const listComparisons: RequestHandler = async (req, res) => {
  const { comparisons, page } = await comparisonService.list(currentUserId(req), req.query as unknown as ComparisonListQuery);
  ok(res, comparisons, page);
};

export const getComparison: RequestHandler = async (req, res) => {
  ok(res, await comparisonService.get(currentUserId(req), idOf(req.params)));
};

export const updateComparison: RequestHandler = async (req, res) => {
  ok(res, await comparisonService.update(currentUserId(req), idOf(req.params), req.body));
};

export const deleteComparison: RequestHandler = async (req, res) => {
  await comparisonService.remove(currentUserId(req), idOf(req.params));
  res.status(204).end();
};
