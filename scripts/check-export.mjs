/**
 * Verify the exported site before it is published.
 *
 * A static export fails in ways a dev server never does: the image optimiser
 * is gone, middleware is gone, and anything referencing a server route renders
 * a src that resolves to nothing. That is how the author photos shipped broken
 * — perfect under `next start`, 404 on the CDN.
 *
 * This walks every exported HTML file and checks that each asset it references
 * exists on disk, so the failure is caught before the sync rather than by a
 * reader.
 *
 * Run: node scripts/check-export.mjs [exportDir]
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DIR = process.argv[2] ?? "apps/web/.next-export";

if (!existsSync(DIR)) {
  console.error(`no export at ${DIR} — run the export build first`);
  process.exit(1);
}

const html = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith(".html")) html.push(path);
  }
})(DIR);

const errors = [];
const seen = new Set();
let checked = 0;

/** Assets the browser will request: images, media, stylesheets, scripts. */
const ASSET = /(?:src|href)="(\/[^"#?]+\.(?:png|jpe?g|gif|svg|webp|avif|ico|css|js|woff2?|json|xml|txt))"/g;
/** Any reference to a route that only exists with a server behind it. */
const SERVER_ROUTE = /(?:src|href)="(\/_next\/image[^"]*)"/g;

/**
 * A page that called `notFound()` at build time is still written to disk as a
 * normal HTML file, and a CDN serves it with HTTP 200. So a status-code check
 * — the obvious way to verify a deployment — cannot see it, and the page looks
 * live while showing "Page not found" to every visitor.
 *
 * This happened to five chapters whose filename did not match their contentId:
 * the route was generated, the body could not be loaded, and the deploy was
 * reported as successful. `content:lint` now blocks the mismatch; this blocks
 * every other way a page can reach the CDN empty.
 */
/* Detecting a not-found page by looking *for* the not-found markup does not
   work: Next serialises that component into every page's flight payload as the
   route's not-found boundary, so it is present in all 295 files.

   What actually separates them is that a page which called `notFound()` renders
   no `<h1>` into the HTML shell and falls back to the site's default title,
   while every real page renders its own heading. The E2E suite already asserts
   one `<h1>` per page; this applies the same invariant to the whole export. */
const HAS_H1 = /<h1[\s>]/;

/** Pages that legitimately have no heading of their own. */
const NO_H1_EXPECTED = /(^|\/)(404|_not-found)([./]|$)/;

/**
 * Fonts must be preloaded, not merely discovered through the stylesheet.
 *
 * Without a preload the browser cannot request a face until it has downloaded
 * and parsed the CSS that names it — an extra round trip before any text can
 * paint in its real font.
 *
 * Checked on Linux only, and the reason is worth recording. Next decides what
 * to preload in `next-font-manifest-plugin`, which collects modules by testing
 * `mod.request.includes("/next-font-loader/index.js?")` — a forward-slash
 * match. On Windows that same request reads `…\node_modules\next\dist\…`, so it
 * never matches, the manifest comes out empty, and every page is emitted with
 * no preload at all. That is a property of the build host, not of the commit:
 * the font files are still stamped `.p` by the loader, and a Linux build
 * preloads them. Asserting it on Windows would fail every local run over a
 * fault that cannot reach production; skipping it in CI would leave the real
 * risk unguarded — and CI is Linux, which is exactly where it must hold.
 */
const FONT_PRELOAD = /<link[^>]+rel="preload"[^>]+\.woff2?"/;
const checkPreload = process.platform !== "win32";
let preloadPages = 0;
let preloadEligible = 0;

for (const file of html) {
  const source = readFileSync(file, "utf8");
  const page = relative(DIR, file).replaceAll("\\", "/");

  // The not-found pages are rendered by the root layout, not the locale one,
  // and it is the locale layout that applies the font variables — it owns
  // <html>, because that is where `lang` and `dir` belong. So those two pages
  // carry no font and no preload by construction, and are not evidence of a
  // fault. Same exemption as the <h1> rule above, for the same reason.
  if (!NO_H1_EXPECTED.test(page)) {
    preloadEligible += 1;
    if (FONT_PRELOAD.test(source)) preloadPages += 1;
  }

  if (!HAS_H1.test(source) && !NO_H1_EXPECTED.test(page)) {
    errors.push(
      `${page}\n    renders no <h1> — this page called notFound() at build time, and a CDN` +
        `\n    will serve it with HTTP 200, so no status check can see it`,
    );
  }

  for (const [, url] of source.matchAll(SERVER_ROUTE)) {
    errors.push(
      `${page}\n    references the image optimiser, which does not exist in an export:\n    ${url}`,
    );
  }

  for (const [, url] of source.matchAll(ASSET)) {
    const key = url;
    if (seen.has(key)) continue;
    seen.add(key);
    checked += 1;

    const onDisk = join(DIR, decodeURIComponent(url));
    if (!existsSync(onDisk) || !statSync(onDisk).isFile()) {
      errors.push(`${page}\n    missing asset: ${url}`);
    }
  }
}

if (checkPreload && preloadPages === 0) {
  errors.push(
    "no page preloads a font\n" +
      "    Every face is still stamped `.p` by next/font, so the loader intends to\n" +
      "    preload them and it is the manifest that came out empty. Check that\n" +
      "    lib/fonts.ts is imported by a layout under app/, and that this build ran\n" +
      "    on Linux — the manifest plugin matches module paths with forward slashes.",
  );
} else if (checkPreload && preloadPages < preloadEligible) {
  errors.push(
    `only ${preloadPages} of ${preloadEligible} pages preload a font\n` +
      "    Fonts are applied by the locale layout, so every page it renders should\n" +
      "    preload them. The not-found pages are already excluded.",
  );
}

console.log(
  `export check — ${html.length} pages, ${checked} unique assets` +
    (checkPreload
      ? `, ${preloadPages}/${preloadEligible} preloading fonts`
      : ", font preload not checked on win32"),
);

if (errors.length) {
  console.log(`\n${errors.length} problem(s):\n`);
  for (const e of errors.slice(0, 25)) console.log(`  ${e}\n`);
  if (errors.length > 25) console.log(`  … ${errors.length - 25} more`);
  process.exit(1);
}

console.log("every referenced asset exists");
