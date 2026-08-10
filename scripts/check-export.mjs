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

for (const file of html) {
  const source = readFileSync(file, "utf8");
  const page = relative(DIR, file).replaceAll("\\", "/");

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

console.log(`export check — ${html.length} pages, ${checked} unique assets`);

if (errors.length) {
  console.log(`\n${errors.length} problem(s):\n`);
  for (const e of errors.slice(0, 25)) console.log(`  ${e}\n`);
  if (errors.length > 25) console.log(`  … ${errors.length - 25} more`);
  process.exit(1);
}

console.log("every referenced asset exists");
