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

    // The control is a three-option switch, so the theme can be named rather
    // than cycled towards. Dark is chosen explicitly, then asserted — a cycling
    // test could pass while landing on the theme it started in.
    await page.getByRole("radio", { name: /^(dark|داكن)$/i }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");

    await page.reload();
    // No flash: the value is correct in the very first frame.
    await expect(html).toHaveAttribute("data-theme", "dark");
    // The switch agrees with the page — the mismatch this control replaced.
    await expect(page.getByRole("radio", { name: /^(dark|داكن)$/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
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
    // `naturalWidth > 0` is the decisive condition: a broken image still
    // "renders" and still reports `complete === true`, so only a non-zero
    // intrinsic width proves the bytes arrived and decoded.
    //
    // It is polled rather than read once. Reading it once raced the lazy load
    // under parallel workers — the earlier version polled `complete` and then
    // took a single sample of `naturalWidth`, which failed roughly one run in
    // eight while the image was still in flight.
    await expect
      .poll(async () => avatar.evaluate((img) => (img as HTMLImageElement).naturalWidth), {
        timeout: 15_000,
      })
      .toBeGreaterThan(0);
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
  /* `/en/labs` is in this list because the promise is one production platform
     rather than a catalogue, and the labs path used to stop at a milestone —
     the last thing a reader saw was "you built it once with no instructions",
     with nowhere to go. The roadmaps and Learn already landed here; the labs
     now do too, so every route converges on the same project. */
  for (const path of ["/en", "/en/learn", "/en/labs"]) {
    test(`the production project card on ${path} opens the project it names`, async ({ page }) => {
      await page.goto(path);
      // Not `.first()` — on the labs page the first project link is the "all
      // projects" index in the nav; the card is the one naming a project.
      const link = page.locator('a[href^="/en/projects/"][href$="/"], a[href^="/en/projects/"]')
        .filter({ has: page.locator("h2, h3, .font-medium") })
        .first();
      await expect(link).toBeVisible();

      const named = (await link.locator("h2, h3, .font-medium").first().textContent())?.trim();
      expect(named).toBeTruthy();

      await link.click();
      await expect(page).toHaveURL(/\/en\/projects\/[a-z0-9-]+/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(named!);
    });
  }
});

test.describe("lab steps", () => {
  /**
   * The step format on lab-20 is the prototype the other labs will follow, so
   * the parts a reader depends on are pinned here before it is rolled out.
   */
  const LAB = "/en/labs/lab-20-linux-server-administration";

  test("a step states what it proves before the work", async ({ page }) => {
    await page.goto(LAB);
    const step = page.locator('section[data-step="2"]');
    await expect(step).toBeVisible();

    // Steps after the first start collapsed, so open it before measuring.
    await step.locator("button[aria-controls]").click();

    // The claim comes before the commands: a reader should know what they are
    // demonstrating without having to infer it from the prose afterwards.
    const proving = step.getByText(/What you are proving/);
    await expect(proving).toBeVisible();
    const provingY = (await proving.boundingBox())!.y;
    const firstCommandY = (await step.locator("pre").first().boundingBox())!.y;
    expect(provingY).toBeLessThan(firstCommandY);
  });

  test("marking a step persists and settles its declared criterion", async ({ page }) => {
    await page.goto(LAB);
    // Steps start collapsed.
    await page.locator('section[data-step="1"] button[aria-controls]').click();
    const mark = page.locator('section[data-step="1"] button[aria-pressed]');
    await expect(mark).toHaveAttribute("aria-pressed", "false");

    await mark.click();
    await expect(mark).toHaveAttribute("aria-pressed", "true");

    // The step declares `criterion={1}`, so the checklist follows the work
    // rather than asking the reader to confirm the same thing twice.
    //
    // The two stores stay distinct — step marks record where you are, criteria
    // record what is proven — but a step that names a criterion writes into it.
    // Only a declared mapping does this: inferring it from position would tick
    // the wrong box in every lab whose steps and criteria do not align.
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("egykode_lab_criteria")))
      .toContain('"lab-20-linux-server-administration":[0]');

    await page.reload();
    await expect(page.locator('section[data-step="1"] button[aria-pressed]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("a step settling no criterion follows the lab once every criterion is met", async ({
    page,
  }) => {
    // The page used to disagree with itself: the checklist said "all criteria
    // met" and the completion card appeared, while the explanatory steps sat
    // unticked with grey rules, because a step settling no criterion knew only
    // its own mark and never the lab's total.
    //
    // lab-k8s-services is the case in point — steps 1 ("Why not just use the
    // Pod IP?") and 5 ("The three types") are reference material that proves
    // nothing on the checklist, and are meant to stay that way.
    const SERVICES = "/en/labs/lab-k8s-services";
    await page.goto(SERVICES);

    const explanatory = page.locator('section[data-step="1"]');
    await expect(explanatory).toHaveAttribute("data-done", "false");

    // Settle the lab from the checklist rather than the steps, which is the
    // route that produced the disagreement: four criteria, none of them owned
    // by step 1.
    await page.evaluate(() =>
      localStorage.setItem(
        "egykode_lab_criteria",
        JSON.stringify({ "lab-k8s-services": [0, 1, 2, 3] }),
      ),
    );
    await page.reload();

    await expect(explanatory).toHaveAttribute("data-done", "true");

    // And it offers no "I've run this": the mark records where the reader is,
    // and a control that cannot change what it shows is worse than no control.
    await explanatory.locator("button[aria-controls]").click();
    await expect(explanatory.locator("button[aria-pressed]")).toHaveCount(0);
    await expect(explanatory.getByText(/Every success criterion for this lab is met/)).toBeVisible();
  });

  test("unmarking a step releases the criterion again", async ({ page }) => {
    // Otherwise a mis-click permanently credits work nobody did, and the only
    // way back is clearing site data.
    await page.goto(LAB);
    const step = page.locator('section[data-step="1"]');
    // Steps start collapsed, so open it before the button inside is reachable.
    await step.locator("button[aria-controls]").click();
    await step.locator("button[aria-pressed]").click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("egykode_lab_criteria")))
      .toContain("[0]");

    // A completed step collapses, so it has to be reopened to undo it.
    await step.locator("button[aria-controls]").click();
    await step.locator("button[aria-pressed]").click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("egykode_lab_criteria")))
      .not.toContain("lab-20-linux-server-administration");
  });

  test("the rail lists steps only, and fills exactly the completed ones", async ({ page }) => {
    // Two bugs this pins. The rail listed leftover section headings ("The
    // work") beside the steps, which read as a step whose circle never fills.
    // And it read the DOM when the store fired rather than when the attribute
    // changed, so it ran a mark behind: completing step 1 filled nothing, and
    // completing all of them filled all but the last.
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(LAB);

    const rail = () =>
      page.evaluate(() => {
        const nav = document.querySelector<HTMLElement>('nav[aria-label="Lab sections"]')!;
        return {
          entries: nav.innerText.split("\n").filter(Boolean).length,
          filled: Array.from(nav.querySelectorAll("li"))
            .map((li) => (li.querySelector("svg") ? "X" : "o"))
            .join(""),
        };
      });

    // Start, four steps, End — and nothing else.
    expect((await rail()).entries).toBe(6);
    expect((await rail()).filled).toBe("oooooo");

    const s1 = page.locator('section[data-step="1"]');
    await s1.locator("button[aria-controls]").click();
    await s1.locator("button[aria-pressed]").click();
    await expect.poll(async () => (await rail()).filled).toBe("oXoooo");
  });

  test("a step's copy button stays inside the step card", async ({ page }) => {
    // Code blocks break out into the right margin on wide screens, which is
    // right for the article column and wrong inside a padded card that clips
    // its overflow — it cut the "Copy command" button in half.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(LAB);
    // Steps start collapsed.
    await page.locator('section[data-step="1"] button[aria-controls]').click();
    const inside = await page.evaluate(() => {
      const step = document.querySelector('section[data-step="1"]')!;
      const copy = step.querySelector("figure button, div.my-6 button");
      if (!copy) return null;
      return copy.getBoundingClientRect().right <= step.getBoundingClientRect().right + 0.5;
    });
    expect(inside).toBe(true);
  });

  test("every step in the rail resolves to a step on the page", async ({ page }) => {
    // Not a scroll-position test. Two attempts at one were written and both
    // passed against a deliberately broken component: `scroll-padding-top` on
    // <html> already offsets every anchor on the site, so nothing this
    // component does changes where the browser lands.
    //
    // What can genuinely break is the link between the rail and the steps.
    // The rail is built by parsing the MDX for `<LabStep n={…}>`; the ids come
    // from the component. A change to either side alone leaves rail entries
    // pointing at nothing, and the reader clicks and stays where they are.
    await page.goto(LAB);
    const hrefs = await page.locator('a[href^="#step-"]').evaluateAll((links) =>
      links.map((l) => l.getAttribute("href")!),
    );
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      await expect(page.locator(`section${href.replace("#", "#")}`)).toHaveCount(1);
    }
  });

  test("a hint stays closed until asked for", async ({ page }) => {
    await page.goto(LAB);
    const step = page.locator('section[data-step="3"]');
    await step.locator("button[aria-controls]").click();

    // Not `button[aria-expanded]` — the step header carries that too, so the
    // bare selector matches two controls and the test silently checks the
    // wrong one. The hint is the one with no aria-controls.
    const hint = step.locator("button[aria-expanded]:not([aria-controls])");
    await expect(hint).toHaveAttribute("aria-expanded", "false");
    await hint.click();
    await expect(hint).toHaveAttribute("aria-expanded", "true");
  });

  test("steps start collapsed and completing one opens the next", async ({ page }) => {
    // The lab opens as a readable list of what it covers rather than as five
    // expanded steps, which is the working-memory problem the format exists to
    // remove. Completing a step then hands the page to the one after it.
    await page.goto(LAB);
    const expanded = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll("section[data-step]"))
          .filter((s) => s.querySelector("button[aria-controls]")!.getAttribute("aria-expanded") === "true")
          .map((s) => s.getAttribute("data-step")),
      );

    expect(await expanded()).toEqual([]);

    const step1 = page.locator('section[data-step="1"]');
    await step1.locator("button[aria-controls]").click();
    expect(await expanded()).toEqual(["1"]);

    await step1.locator("button[aria-pressed]").click();
    await expect(step1).toHaveAttribute("data-done", "true");
    await expect.poll(expanded).toEqual(["2"]);
  });

  test("the success criteria sit after the work, not before it", async ({ page }) => {
    // Above the steps, a 0/4 scorecard met the reader before they had been
    // shown any of the work it scored.
    await page.goto(LAB);
    const order = await page.evaluate(() => {
      const lastStep = Array.from(document.querySelectorAll("section[data-step]")).pop()!;
      const heading = Array.from(document.querySelectorAll("h2, h3, p")).find((e) =>
        /^success criteria$/i.test(e.textContent!.trim()),
      );
      if (!heading) return null;
      return {
        step: lastStep.getBoundingClientRect().top + window.scrollY,
        criteria: heading.getBoundingClientRect().top + window.scrollY,
      };
    });
    expect(order).not.toBeNull();
    expect(order!.criteria).toBeGreaterThan(order!.step);
  });
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

/**
 * ASCII diagrams are made of box-drawing characters, and the site ships a
 * subset of JetBrains Mono. Google's default subset omits U+2500–U+259F, so
 * the browser silently fell back to a system font where `─` measures 12.67px
 * against 8.16px for a latin character — every diagram across 22 content files
 * lost its column alignment and overflowed its container.
 *
 * `lint:diagrams` cannot catch this: it counts characters in the source, which
 * were correctly aligned. The defect only exists once a font is applied, so it
 * has to be asserted in a browser.
 *
 * Three layers, because any one alone would have passed while broken:
 *   1. the glyphs resolve to a font that has them
 *   2. their advance matches a latin character exactly
 *   3. a real diagram fits its container
 */
test.describe("diagram fonts", () => {
  // Every non-latin glyph the content draws with.
  const GLYPHS = ["─", "│", "┌", "┐", "└", "┘", "├", "┤", "┬", "┴", "┼", "═", "←", "→", "↓", "▶"];

  test("box-drawing glyphs use the monospace advance", async ({ page }) => {
    await page.goto("/en/learn/platform/system-architecture");
    const measured = await page.evaluate(async (glyphs) => {
      await document.fonts.ready;
      const pre = document.querySelector("pre");
      if (!pre) return null;
      const style = getComputedStyle(pre);
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return null;
      ctx.font = `${style.fontSize} ${style.fontFamily}`;
      const width = (ch: string) => ctx.measureText(ch).width;
      return { latin: width("M"), glyphs: glyphs.map((g) => ({ g, w: width(g) })) };
    }, GLYPHS);

    expect(measured, "no <pre> found to measure").not.toBeNull();
    // A latin advance of 0 would make every comparison trivially pass.
    expect(measured!.latin).toBeGreaterThan(0);

    for (const { g, w } of measured!.glyphs) {
      expect(
        Math.abs(w - measured!.latin),
        `"${g}" advances ${w.toFixed(2)}px against ${measured!.latin.toFixed(2)}px for "M" — ` +
          "the shipped mono subset is missing this glyph and the browser fell back",
      ).toBeLessThan(0.05);
    }
  });

  test("diagrams fit their container", async ({ page }) => {
    // The pages carrying the most box-drawing content.
    for (const path of [
      "/en/learn/platform/system-architecture",
      "/en/learn/platform/project-overview",
      "/en/learn/platform/repository-structure",
    ]) {
      await page.goto(path);
      const worst = await page.evaluate(async () => {
        await document.fonts.ready;
        // Array.from, not spread: this tsconfig targets a lib where a NodeList
        // is not iterable.
        const diagrams = Array.from(document.querySelectorAll("pre")).filter((el) =>
          /[─-▟]/.test(el.textContent ?? ""),
        );
        return diagrams.reduce((n, el) => Math.max(n, el.scrollWidth - el.clientWidth), 0);
      });
      expect(worst, `a diagram on ${path} overflows by ${worst}px`).toBeLessThanOrEqual(1);
    }
  });
});
