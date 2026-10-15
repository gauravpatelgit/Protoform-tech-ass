import { Router } from "express";
import v1Router from "./v1/index.js";

const router = Router();

router.use("/api/v1", v1Router);

export default router;
