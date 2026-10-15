import { z } from "zod";

const note = z
  .string()
  .trim()
  .max(1000, "Note must be at most 1000 characters")
  .transform((value) => (value === "" ? null : value))
  .nullable();

const tags = z
  .array(z.string().trim().toLowerCase().min(1).max(30, "Tags must be at most 30 characters"))
  .max(10, "At most 10 tags")
  .transform((values) => [...new Set(values)]);

export const createPinSchema = z.object({
  repoId: z.number().int().positive(),
  note: note.optional(),
  tags: tags.optional(),
});

export const updatePinSchema = z
  .object({ note: note.optional(), tags: tags.optional() })
  .refine((value) => value.note !== undefined || value.tags !== undefined, { message: "Provide a note or tags to update" });

export const pinIdParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const pinListQuerySchema = z.object({
  tag: z.string().trim().toLowerCase().min(1).max(30).optional(),
  developer: z.string().trim().min(1).max(39).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePinInput = z.infer<typeof createPinSchema>;
export type UpdatePinInput = z.infer<typeof updatePinSchema>;
export type PinListQuery = z.infer<typeof pinListQuerySchema>;
