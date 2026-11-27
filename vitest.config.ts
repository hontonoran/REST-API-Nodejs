import "dotenv/config";
import { defineConfig } from "vitest/config";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl || testDatabaseUrl === process.env.DATABASE_URL) {
  throw new Error("Set TEST_DATABASE_URL in .env to a separate database: tests delete all data in it");
}

export default defineConfig({
  test: {
    globals: true,
    env: { DATABASE_URL: testDatabaseUrl },
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
  },
});
