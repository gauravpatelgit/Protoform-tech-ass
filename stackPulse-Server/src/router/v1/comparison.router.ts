import { Router } from "express";
import { createComparison, deleteComparison, getComparison, listComparisons, updateComparison } from "#controller/comparison.controller.js";
import { validate } from "#middleware/validation.middleware.js";
import { comparisonIdParamSchema, comparisonListQuerySchema, createComparisonSchema, updateComparisonSchema } from "#schemas/comparison.schema.js";

const comparisonRouter = Router();

comparisonRouter.post("/", validate({ body: createComparisonSchema }), createComparison);
comparisonRouter.get("/", validate({ query: comparisonListQuerySchema }), listComparisons);
comparisonRouter.get("/:id", validate({ params: comparisonIdParamSchema }), getComparison);
comparisonRouter.put("/:id", validate({ params: comparisonIdParamSchema, body: updateComparisonSchema }), updateComparison);
comparisonRouter.delete("/:id", validate({ params: comparisonIdParamSchema }), deleteComparison);

export default comparisonRouter;
