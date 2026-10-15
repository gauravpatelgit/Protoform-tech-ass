export type Environment = "development" | "test" | "production";

export interface DBConfig {
  username: string;
  password: string | null;
  database: string;
  host: string;
  port: number;
  dialect: "mysql";
}

export type Config = Record<Environment, DBConfig>;
