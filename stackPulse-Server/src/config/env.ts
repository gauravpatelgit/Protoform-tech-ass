import { z } from "zod";

const boolean = z.enum(["true", "false"]).transform((value) => value === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["critical", "error", "warn", "info", "debug"]).optional(),

  JWT_ACCESS_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_ACCESS_TTL_SEC: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: boolean.default(false),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  GITHUB_TOKEN: z.string().optional(),
  GITHUB_API_URL: z.string().default("https://api.github.com"),
  GITHUB_PROFILE_TTL_MIN: z.coerce.number().int().positive().default(60),
  GITHUB_TOP_K_REPOS: z.coerce.number().int().positive().max(50).default(15),
  GITHUB_CONCURRENCY: z.coerce.number().int().positive().max(10).default(5),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`).join("\n");
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
