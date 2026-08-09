import { test } from "@playwright/test";

import { PUBLIC_LOCALES } from "../../apps/web/lib/locales";

/**
 * The four-state matrix (§4.7): locale × theme.
 *
 * Derived from PUBLIC_LOCALES: while the site is English-only this is two
 * states, and it becomes four again the moment Arabic is published — the
 * `ar` + `light` combination that always ships broken because nobody looks
 * at it comes back automatically rather than being remembered.
 */
const STATES = PUBLIC_LOCALES.flatMap((locale) =>
  (["light", "dark"] as const).map((theme) => ({ locale, theme })),
);

const PAGES = [
  { name: "home", path: "" },
  { name: "learn", path: "/learn" },
  { name: "roadmaps", path: "/roadmaps" },
  { name: "build", path: "/build" },
  { name: "chapter", path: "/learn/kubernetes/kubernetes" },
  { name: "project", path: "/build/cloud-native-devops-platform" },
];

test.describe("visual matrix", () => {
  // Screenshots are a review artifact here, not an assertion — the baseline
  // comparison lands once the design has settled.
  test.describe.configure({ mode: "parallel" });

  for (const { locale, theme } of STATES) {
    for (const { name, path } of PAGES) {
      test(`${locale}-${theme}-${name}`, async ({ page }, testInfo) => {
        // Set the preference before first paint, the way a returning user's
        // browser would, so the capture shows the real initial render.
        await page.addInitScript((value) => {
          localStorage.setItem("egykode_theme", value);
        }, theme);

        await page.goto(`/${locale}${path}`, { waitUntil: "domcontentloaded" });
        // Fonts, not the network, are what shift a capture — networkidle can
        // hang on a long-lived connection and proves less.
        await page.evaluate(() => document.fonts.ready);
        // Wait for real painted content, not just a resolved font promise:
        // fonts.ready can settle a frame before the first paint, which
        // captured an empty body and looked exactly like an RTL bug.
        await page.locator("#main").first().waitFor({ state: "visible" });
        await page.waitForTimeout(600);

        await page.screenshot({
          path: testInfo.project.name === "mobile"
            ? `tests/screenshots/mobile/${locale}-${theme}-${name}.png`
            : `tests/screenshots/${locale}-${theme}-${name}.png`,
          fullPage: false,
        });
      });
    }
  }
});
