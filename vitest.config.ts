import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.spec.ts"],
    environment: "node",
    // One SQLite file for the whole suite: parallel files fight over the lock
    fileParallelism: false,
    globalSetup: ["tests/global-setup.ts"],
    // Keeps the suite off dev.db: these values win over .env, which dotenv
    // only applies to variables that are not already set.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "file:./tmp/test.db",
      JWT_SECRET: "test-only-secret",
      CORS_ORIGIN: "*"
    }
  }
});
