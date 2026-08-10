import { defineConfig, devices } from "@playwright/test";

/**
 * E2E and visual checks (MASTER_PROMPT §13.2).
 *
 * Runs against the production build, not `next dev`: dev has different
 * bundling, no static generation, and slower hydration, so a green dev run
 * proves nothing about what ships.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // Refuses to run against a build older than the sources it is meant to
  // exercise. Without it, editing content and running the suite passes happily
  // against the previous build.
  globalSetup: "./tests/e2e/assert-fresh-build.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : [["list"]],
  outputDir: "./tests/.output",

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3210",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Mobile is the majority of MENA traffic, not an afterthought (§12.6).
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],

  webServer: {
    // `npm run start -- -p 3210` appends to the script's own `-p 3000`, and
    // Next then serves HTML on one port while rejecting every /_next/static
    // asset with a 400 — no CSS, no JS, no hydration. Invoke next directly.
    // Served from the isolated verification build (see next.config.mjs), so
    // running the suite never disturbs a dev server on :3000.
    command: "npx next start -p 3210",
    cwd: "apps/web",
    env: { NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next-verify" },
    url: "http://127.0.0.1:3210/en",
    // Never reuse: a server left running from an earlier build is adopted
    // silently, and then the suite passes against pages that do not contain
    // the change under test. That cost three wrong conclusions in one session.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
