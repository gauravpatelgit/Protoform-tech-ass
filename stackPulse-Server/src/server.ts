import { createApp } from "#app.js";
import { env } from "#config/env.js";
import logger from "#config/logger.js";
import { connectDB, sequelize } from "#config/sequelize.js";
import { enrichmentService } from "#service/enrichment.service.js";

async function startServer(): Promise<void> {
  await connectDB();
  if (!env.GITHUB_TOKEN) logger.warn("GITHUB_TOKEN is not set: GitHub allows only 60 requests/hour");
  const resumed = await enrichmentService.resumeInterrupted();
  if (resumed > 0) logger.info(`Resumed enrichment for ${resumed} developer(s)`);

  const server = createApp().listen(env.PORT, () => {
    logger.info(`Server is running on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
  logger.error("Failed to start server", { error });
  process.exit(1);
});
