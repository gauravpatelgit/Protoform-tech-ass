import { Router } from "express";
import { getDeveloper, listDeveloperRepos, recentDevelopers, refreshDeveloper } from "#controller/developer.controller.js";
import { validate } from "#middleware/validation.middleware.js";
import { repoListQuerySchema, usernameParamSchema } from "#schemas/developer.schema.js";

const developerRouter = Router();

// Registered before "/:username" so "recent" is not read as a username.
developerRouter.get("/recent", recentDevelopers);
developerRouter.get("/:username", validate({ params: usernameParamSchema }), getDeveloper);
developerRouter.post("/:username/refresh", validate({ params: usernameParamSchema }), refreshDeveloper);
developerRouter.get("/:username/repos", validate({ params: usernameParamSchema, query: repoListQuerySchema }), listDeveloperRepos);

export default developerRouter;
