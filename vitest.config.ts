import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    globals: true,
    env: {
      RESEARCH_MODE: "mock",
      MOCK_STEP_MS: "1",
      INTERNAL_WEBHOOK_SECRET: "test-secret",
    },
  },
})
