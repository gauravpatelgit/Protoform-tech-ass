import { Router } from "express";
import { sequelize } from "#config/sequelize.js";
import { requireAuth } from "#middleware/auth.middleware.js";
import { apiLimiter } from "#middleware/rateLimit.middleware.js";
import authRouter from "./auth.router.js";
import compareRouter from "./compare.router.js";
import comparisonRouter from "./comparison.router.js";
import developerRouter from "./developer.router.js";
import pinRouter from "./pin.router.js";

const v1Router = Router();

v1Router.get("/health", async (_req, res) => {
  const db = await sequelize.authenticate().then(
    () => "up" as const,
    () => "down" as const,
  );
  res.status(db === "up" ? 200 : 503).json({ success: db === "up", data: { status: db === "up" ? "ok" : "degraded", db } });
});
v1Router.use("/auth", authRouter);
v1Router.use("/developers", requireAuth, apiLimiter, developerRouter);
v1Router.use("/pins", requireAuth, apiLimiter, pinRouter);
v1Router.use("/compare", requireAuth, apiLimiter, compareRouter);
v1Router.use("/comparisons", requireAuth, apiLimiter, comparisonRouter);

export default v1Router;
