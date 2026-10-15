import type { RequestHandler } from "express";
import { currentUserId } from "#middleware/auth.middleware.js";
import type { RepoListQuery } from "#schemas/developer.schema.js";
import { developerService } from "#service/developer.service.js";
import { ok } from "#utils/http.js";

const usernameOf = (params: Record<string, string | string[] | undefined>) => String(params.username);

const sendView = (res: Parameters<typeof ok>[0], view: Awaited<ReturnType<typeof developerService.get>>) => ok(res, view.developer, view.meta);

export const getDeveloper: RequestHandler = async (req, res) => {
  sendView(res, await developerService.get(usernameOf(req.params)));
};

export const refreshDeveloper: RequestHandler = async (req, res) => {
  sendView(res, await developerService.refresh(currentUserId(req), usernameOf(req.params)));
};

export const listDeveloperRepos: RequestHandler = async (req, res) => {
  const query = req.query as unknown as RepoListQuery;
  const { repos, page } = await developerService.repos(currentUserId(req), usernameOf(req.params), query);
  ok(res, repos, page);
};

export const recentDevelopers: RequestHandler = async (_req, res) => {
  ok(res, await developerService.recent());
};
