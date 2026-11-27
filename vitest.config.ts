import "dotenv/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL! },
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["dotenv/config"],
    fileParallelism: false,
  },
});
