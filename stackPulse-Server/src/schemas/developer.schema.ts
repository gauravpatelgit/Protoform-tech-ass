import { z } from "zod";

const username = z.string().trim().min(1).max(39);

export const usernameParamSchema = z.object({ username });

const bool = z.enum(["true", "false"]).transform((value) => value === "true");

export const repoListQuerySchema = z.object({
  sort: z.enum(["stars", "pushed", "name"]).default("stars"),
  language: z.string().trim().min(1).max(64).optional(),
  includeForks: bool.default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type RepoListQuery = z.infer<typeof repoListQuerySchema>;
