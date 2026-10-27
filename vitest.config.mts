import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["./src/test/global-setup.ts"],
    setupFiles: ["./src/test/setup.ts"],
    // Integration tests share one database.
    fileParallelism: false,
    // Fail fast if a test waits on a database lock.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
