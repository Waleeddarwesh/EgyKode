import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { PUBLIC_LOCALES } from "../../apps/web/lib/locales";

/**
 * Automated accessibility audit (MASTER_PROMPT §12.3).
 *
 * Zero serious/critical violations is a merge gate. Automated tooling catches
 * roughly a third of real barriers, so this is a floor, not a certificate —
 * the screen-reader smoke tests in §12.3 remain a manual step.
 *
 * Every page is audited in every PUBLISHED locale. RTL is where this breaks —
 * an RTL layout can reorder the accessibility tree, and an Arabic page with an
 * `en` lang attribute makes a screen reader read Arabic with English phonemes —
 * so the Arabic audits return automatically when "ar" returns to
 * PUBLIC_LOCALES (see apps/web/lib/locales.ts).
 */
const PAGES = [
  { name: "home", path: "" },
  { name: "learn", path: "/learn" },
  { name: "roadmaps", path: "/roadmaps" },
  { name: "topics", path: "/topics" },
  { name: "labs", path: "/labs" },
  { name: "projects", path: "/projects" },
  { name: "project", path: "/projects/cloud-native-devops-platform" },
  { name: "lab", path: "/labs/lab-01-aws-vpc-subnets-gateways-route-tables" },
  { name: "chapter", path: "/learn/kubernetes/kubernetes" },
  { name: "register", path: "/register" },
];

async function audit(page: Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
  await page.locator("#main").first().waitFor({ state: "visible" });
  // Wait for fonts and for client components to mount. Without this the audit
  // races the first paint and reports different pages on each run — flaky
  // accessibility results are worse than none, because they mask regressions.
  await page.evaluate(() => document.fonts.ready);
  // Wait for the page-fade animation to finish. axe samples computed colours,
  // and mid-fade every element is composited at partial opacity — which
  // reported --clr-text-muted as #7f898d and produced contrast failures that
  // moved between pages on every run.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))),
  );

  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
}

for (const locale of PUBLIC_LOCALES) {
  test.describe(`a11y (${locale})`, () => {
    for (const { name, path } of PAGES) {
      test(`${name} has no serious or critical violations`, async ({ page }) => {
        const results = await audit(page, `/${locale}${path}`);

        const blocking = results.violations.filter(
          (violation) => violation.impact === "serious" || violation.impact === "critical",
        );

        // Name the rule and the element, so a failure is actionable without
        // opening a report.
        const detail = blocking
          .map(
            (violation) =>
              `${violation.id} (${violation.impact}) — ${violation.help}\n` +
              violation.nodes
                .slice(0, 3)
                .map((node) => `    ${node.target.join(" ")}`)
                .join("\n"),
          )
          .join("\n");

        expect(blocking, `\n${detail}\n`).toEqual([]);
      });
    }

    test("the palette traps nothing and returns focus", async ({ page }) => {
      await page.goto(`/${locale}`);
      await page.locator("button[data-ready='true']").first().waitFor({ state: "attached" });
      await page.keyboard.press("ControlOrMeta+k");

      const results = await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(blocking.map((v) => v.id)).toEqual([]);
    });
  });
}
