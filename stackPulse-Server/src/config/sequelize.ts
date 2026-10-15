import { Sequelize } from "@sequelize/core";
import { MySqlDialect } from "@sequelize/mysql";
import config from "#config/database.config.js";
import { env } from "#config/env.js";
import logger from "#config/logger.js";
import { models } from "#database/models/index.js";

const db = config[env.NODE_ENV];

export const sequelize = new Sequelize({
  dialect: MySqlDialect,
  database: db.database,
  user: db.username,
  password: db.password ?? "",
  host: db.host,
  port: db.port,
  models,
  timezone: "+00:00",
  logging: env.NODE_ENV === "development" ? (sql) => logger.debug(sql) : false,
});

export async function connectDB(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info(`Database connected: ${db.database}@${db.host}:${db.port}`);
  } catch (error) {
    logger.error("Unable to connect to the database", { error });
    throw error;
  }
}
