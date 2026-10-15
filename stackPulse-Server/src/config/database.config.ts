import type { Config, DBConfig } from "./database.types.js";

// Pure config: also loaded by sequelize-cli, so it must not import the app or require app-only env vars.
const build = (database: string): DBConfig => ({
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database,
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  dialect: "mysql",
});

const config: Config = {
  development: build(process.env.DB_NAME || "stackpulse_dev"),
  test: build(process.env.DB_NAME_TEST || "stackpulse_test"),
  production: build(process.env.DB_NAME || "stackpulse"),
};

export default config;
