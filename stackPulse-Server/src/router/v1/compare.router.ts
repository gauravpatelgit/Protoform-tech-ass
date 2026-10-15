import { Router } from "express";
import { compare } from "#controller/comparison.controller.js";
import { validate } from "#middleware/validation.middleware.js";
import { compareQuerySchema } from "#schemas/comparison.schema.js";

const compareRouter = Router();

compareRouter.get("/", validate({ query: compareQuerySchema }), compare);

export default compareRouter;
