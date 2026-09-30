import "dotenv/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    fileParallelism: false, // test files share one database, so they run one at a time
    env: {
      NODE_ENV: "test", // turns off rate limiting and the Secure cookie flag
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      JWT_SECRET: "test-secret-not-for-production",
    },
  },
});