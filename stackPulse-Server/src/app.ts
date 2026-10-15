import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "#config/env.js";
import errorHandler from "#middleware/error.middleware.js";
import requestLogger from "#middleware/logger.middleware.js";
import notFound from "#middleware/notFound.middleware.js";
import router from "#router/index.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
  app.use(requestLogger);
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(router);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
