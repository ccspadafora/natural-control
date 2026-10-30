import { defineConfig, devices } from "@playwright/test"

/**
 * E2E and visual parity against the .dc.html prototypes.
 * Parity project uses frozen seed date 2026-10-29 and compares screenshots.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "e2e",
      testMatch: /.*\.e2e\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "parity",
      testMatch: /.*\.parity\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "parity-campo",
      testMatch: /.*campo\.parity\.ts/,
      use: {
        ...devices["iPhone 12"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
})
