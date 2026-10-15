import { z } from "zod";

// `?usernames=a,b,c` and repeated `?usernames=a&usernames=b` are both accepted.
const usernameList = z.union([z.string(), z.array(z.string())]).transform((value) => (Array.isArray(value) ? value : [value]));

export const compareQuerySchema = z.object({ usernames: usernameList });

export const createComparisonSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  usernames: z.array(z.string().trim().min(1).max(39)).min(2).max(5),
});

export const updateComparisonSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    usernames: z.array(z.string().trim().min(1).max(39)).min(2).max(5).optional(),
  })
  .refine((value) => value.name !== undefined || value.usernames !== undefined, { message: "Provide a name or usernames to update" });

export const comparisonIdParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const comparisonListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateComparisonInput = z.infer<typeof createComparisonSchema>;
export type UpdateComparisonInput = z.infer<typeof updateComparisonSchema>;
export type ComparisonListQuery = z.infer<typeof comparisonListQuerySchema>;
