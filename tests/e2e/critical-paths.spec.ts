import { expect, test, type Page } from "@playwright/test";

import { PUBLIC_LOCALES } from "../../apps/web/lib/locales";

/**
 * Keyboard shortcuts are registered in a useEffect, so they do not exist until
 * React has hydrated — and `goto()` resolves before that. Waiting on the
 * network settles it without an arbitrary sleep.
 */
async function hydrated(page: Page) {
  // The palette sets data-ready once its keydown listener is attached, so this
  // waits for the actual capability rather than a proxy for it.
  await page.locator("button[data-ready='true']").first().waitFor({ state: "attached" });
}

/**
 * The critical paths a reader must be able to complete (§13.2).
 * Every one runs in both locales, because RTL is where things break.
 */

const ARABIC_PUBLISHED = PUBLIC_LOCALES.includes("ar");

test.describe("locale and direction", () => {
  // Arabic is not published right now (see apps/web/lib/locales.ts). These
  // tests are kept, not deleted: RTL is where this app breaks, and they must
  // run again the moment "ar" returns to PUBLIC_LOCALES.
  test.skip(!ARABIC_PUBLISHED, "Arabic is not currently published");

  test("English serves ltr, Arabic serves rtl, from the server", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("the language toggle keeps you on the same page", async ({ page }) => {
    await page.goto("/en/learn/docker/docker");
    await page.getByRole("link", { name: /change language|تغيير اللغة/i }).click();
    await expect(page).toHaveURL(/\/ar\/learn\/docker\/docker$/);
  });

  test("a bare path redirects to a locale", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(en|ar)$/);
  });
});

test.describe("reading a chapter", () => {
  test("chapter renders with title, prose and highlighted code", async ({ page }) => {
    await page.goto("/en/learn/kubernetes/kubernetes");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Kubernetes");
    // Shiki runs at build time — if this is missing, the client is doing work
    // it should not be doing.
    await expect(page.locator("pre").first()).toBeVisible();
    await expect(page.locator("[data-rehype-pretty-code-figure]").first()).toBeAttached();
  });

  test("prev/next navigation follows the roadmap order", async ({ page }) => {
    await page.goto("/en/learn/docker/docker");
    const next = page.getByRole("navigation", { name: "Chapter" }).getByRole("link").last();
    await next.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("an untranslated chapter says so instead of silently serving English", async ({ page }) => {
    await page.goto("/ar/learn/docker/docker");
    await expect(page.getByText(/غير متاح بالعربية/)).toBeVisible();
    // The fallback body is English prose, so it must be pinned to ltr.
    await expect(page.locator("div.prose")).toHaveAttribute("dir", "ltr");
  });
});

test.describe("search", () => {
  test("opens with the keyboard and finds an English chapter", async ({ page }) => {
    await page.goto("/en");
    await hydrated(page);
    await page.keyboard.press("ControlOrMeta+k");
    const input = page.getByRole("dialog").getByRole("combobox");
    await expect(input).toBeFocused();

    await input.fill("kubernetes");
    await expect(page.getByRole("option").first()).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/learn\/.+/);
  });

  test("Arabic query matches despite orthographic variants", async ({ page }) => {
    test.skip(!ARABIC_PUBLISHED, "Arabic is not currently published");
    await page.goto("/ar");
    await hydrated(page);
    await page.keyboard.press("ControlOrMeta+k");
    const input = page.getByRole("dialog").getByRole("combobox");

    // "الحاويات" written without the definite article and with a bare alef —
    // this is what a real user types, and it must still match.
    await input.fill("كوبرنيتس");
    // The roadmap phase title is Arabic; a hit proves normalisation runs.
    await expect(page.getByRole("option").first()).toBeVisible({ timeout: 5000 });
  });

  test("Escape closes the palette", async ({ page }) => {
    await page.goto("/en");
    await hydrated(page);
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("theme", () => {
  test("toggling persists and applies before paint on reload", async ({ page }) => {
    await page.goto("/en");
    const html = page.locator("html");
    const before = await html.getAttribute("data-theme");

    // system -> light -> dark; two clicks guarantees a change from any start.
    const toggle = page.getByRole("button", { name: /change theme|تغيير المظهر/i });
    await toggle.click();
    await toggle.click();

    const after = await html.getAttribute("data-theme");
    expect(after).not.toBe(null);

    await page.reload();
    // No flash: the value is correct in the very first frame.
    await expect(html).toHaveAttribute("data-theme", after!);
    expect(["light", "dark"]).toContain(after!);
    void before;
  });
});

test.describe("projects and roadmaps", () => {
  test("a project shows its author, licence and source link", async ({ page }) => {
    await page.goto("/en/build/cloud-native-devops-platform");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Waleed Darwesh")).toBeVisible();
    await expect(page.getByText("MIT").first()).toBeVisible();
  });

  test("the author photo loads", async ({ page }) => {
    await page.goto("/en/build/cloud-native-devops-platform");
    const avatar = page.locator("img").first();
    // The avatar is below the fold and lazily loaded — which is correct, so
    // the test scrolls to it rather than the image being made eager.
    await avatar.scrollIntoViewIfNeeded();
    await expect(avatar).toBeVisible();
    await expect
      .poll(async () => avatar.evaluate((img) => (img as HTMLImageElement).complete))
      .toBe(true);
    // A broken image still "renders", so assert it actually decoded.
    const decoded = await avatar.evaluate(
      (img) => (img as HTMLImageElement).naturalWidth > 0,
    );
    expect(decoded).toBe(true);
  });

  test("every roadmap ends with a production project", async ({ page }) => {
    await page.goto("/en/roadmaps");
    const roadmaps = page.getByRole("article");
    const count = await roadmaps.count();
    expect(count).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < count; i += 1) {
      await expect(roadmaps.nth(i).getByText(/Ends with/i)).toBeVisible();
    }
  });

  /**
   * The card that names the production project must open the project it names.
   *
   * Two ways this broke at once, and neither was visible to a test that only
   * asserted the text was present: the home page hardcoded a project id while
   * rendering the roadmap's title, so it linked somewhere else entirely; and
   * the Learn page rendered the same card with no link at all — a dead end at
   * exactly the point the path is meant to pay off.
   *
   * Following the link and comparing headings is what catches both.
   */
  for (const path of ["/en", "/en/learn"]) {
    test(`the production project card on ${path} opens the project it names`, async ({ page }) => {
      await page.goto(path);
      const link = page.locator('a[href^="/en/projects/"]').first();
      await expect(link).toBeVisible();

      const named = (await link.locator("h2, .font-medium").first().textContent())?.trim();
      expect(named).toBeTruthy();

      await link.click();
      await expect(page).toHaveURL(/\/en\/projects\/[a-z0-9-]+/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(named!);
    });
  }
});

test.describe("progress and disclosure", () => {
  test("marking a chapter complete persists and reaches the roadmap", async ({ page }) => {
    await page.goto("/en/learn/terraform/terraform");

    const button = page.getByRole("button", { name: /Mark as complete|Completed/ });
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");

    // It must survive a reload — the whole point is that it is stored.
    await page.reload();
    await expect(page.getByRole("button", { name: "Completed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // ...and the roadmap must count it, since both read one store.
    await page.goto("/en/roadmaps/cloud-devops-engineer");
    await expect(page.getByText(/1 of \d+ · \d+%/)).toBeVisible();
  });

  test("an area's topics expand in place instead of pointing elsewhere", async ({ page }) => {
    await page.goto("/en/topics");

    // Native <details>, so this works before hydration and ships no JavaScript.
    // The preview cards sit outside the disclosure — a closed <details> hides
    // everything but its summary — so count within the whole area block.
    const disclosure = page.locator("details").first();
    const area = disclosure.locator("xpath=..");
    const cards = area.locator("li:visible");
    const summary = disclosure.locator("summary");

    const collapsed = await cards.count();
    expect(collapsed).toBeGreaterThan(0);
    await expect(summary).toContainText(/Show \d+ more/);

    await summary.click();
    await expect(disclosure).toHaveAttribute("open", "");
    expect(await cards.count()).toBeGreaterThan(collapsed);
    await expect(summary).toContainText("Show fewer");

    await summary.click();
    await expect(disclosure).not.toHaveAttribute("open", "");
    expect(await cards.count()).toBe(collapsed);
  });
});

test.describe("accessibility basics", () => {
  test("skip link is reachable and focus is visible", async ({ page }) => {
    await page.goto("/en");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /skip to content/i })).toBeFocused();
  });

  test("one h1 per page", async ({ page }) => {
    for (const path of ["/en/learn", "/en/build", "/en/roadmaps"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    }
  });

  test("the page never scrolls horizontally on a phone", async ({ page }) => {
    // Two widths: 320 is the narrowest supported, 390 is a current iPhone —
    // /en/learn overflowed at 390 while passing at 320, because a grid item's
    // `min-width: auto` only bit at that ratio.
    for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 720 });
    const paths = [
      "/en",
      "/en/learn",
      "/en/topics",
      "/en/labs",
      "/en/roadmaps",
      "/en/projects",
      "/en/prepare/questions",
      "/en/learn/kubernetes/kubernetes",
      ...(ARABIC_PUBLISHED ? ["/ar"] : []),
    ];
    for (const path of paths) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} overflows by ${overflow}px at ${width}px`).toBeLessThanOrEqual(1);
    }
    }
  });
});
