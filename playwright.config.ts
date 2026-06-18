import { defineConfig, devices } from "@playwright/test"

/**
 * E2E runs against a deterministic mock server:
 * - RESEARCH_MODE=mock     -> canned results, no Kimi/Groq/Eve calls
 * - DISABLE_EVE=1          -> plain Next dev (skips booting the Eve runtime)
 * - MOCK_STEP_MS=150       -> fast but observable progress
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    // Use localhost (not 127.0.0.1) so it matches Next's dev origin; otherwise
    // Next 16 blocks the HMR resource cross-origin and the client never hydrates.
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "DISABLE_EVE=1 RESEARCH_MODE=mock MOCK_STEP_MS=150 npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
