import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      JWT_ACCESS_SECRET: "test-secret-test-secret-test-secret-123",
      COOKIE_SECURE: "false",
    },
  },
});
