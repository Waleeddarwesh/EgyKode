#!/usr/bin/env node
/**
 * Pre-package validation.
 *
 * PWABuilder reads the live site, so anything wrong here becomes a rejected
 * submission or, worse, a package that installs and misbehaves. These are the
 * checks that cost minutes now and days later — Partner Center rejects a
 * submission for a missing privacy URL without telling you which field it meant.
 *
 *   node desktop/scripts/check-package.mjs [--export <dir>]
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const argExport = process.argv.indexOf("--export");
const EXPORT = argExport > -1 ? process.argv[argExport + 1] : "apps/web/.next-export";

let failures = 0;
let warnings = 0;
const fail = (m) => (failures++, console.error(`  FAIL  ${m}`));
const warn = (m) => (warnings++, console.warn(`  warn  ${m}`));
const pass = (m) => console.log(`  ok    ${m}`);

if (!existsSync(EXPORT)) {
  console.error(`export not found at ${EXPORT} — build first:`);
  console.error("  NEXT_OUTPUT=export NEXT_DIST_DIR=.next-export npm run build --workspace=@egykode/web");
  process.exit(1);
}

/* ── manifest ──────────────────────────────────────────────────────────────── */

const manifestPath = join(EXPORT, "manifest.webmanifest");
if (!existsSync(manifestPath)) {
  fail("manifest.webmanifest missing — PWABuilder has nothing to read");
} else {
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));

  // Fields the Store package genuinely needs. `id` matters more than it looks:
  // without it the identity can change between packages and Windows treats the
  // result as a different app.
  for (const field of ["name", "short_name", "start_url", "scope", "display", "icons", "id"]) {
    if (!m[field]) fail(`manifest is missing "${field}"`);
  }
  if (m.name && m.name.length > 45) warn(`manifest name is ${m.name.length} chars; Windows truncates long names`);
  if (m.short_name && m.short_name.length > 12)
    warn(`short_name is ${m.short_name.length} chars — it is what appears under the icon`);
  if (m.display !== "standalone" && m.display !== "minimal-ui")
    warn(`display is "${m.display}" — "standalone" is what makes it feel installed`);
  if (!m.description) warn("no description — the Store listing has to supply one instead");

  const sizes = (m.icons ?? []).map((i) => i.sizes);
  for (const need of ["192x192", "512x512"]) {
    if (!sizes.includes(need)) fail(`no ${need} icon — required for a Windows package`);
  }
  if (!(m.icons ?? []).some((i) => String(i.purpose).includes("maskable")))
    fail("no maskable icon — the mark will be clipped or padded by Windows");

  if (failures === 0) pass("manifest has everything a Windows package needs");
}

/* ── icons are real, square PNGs of the declared size ──────────────────────── */

/** Minimal PNG header read: width and height are big-endian at bytes 16–24. */
function pngSize(file) {
  const b = readFileSync(file);
  if (b.length < 24 || b.toString("hex", 0, 8) !== "89504e470d0a1a0a") return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

for (const [file, expected] of [
  ["icons/icon-192.png", 192],
  ["icons/icon-512.png", 512],
  ["icons/icon-maskable-512.png", 512],
]) {
  const p = join(EXPORT, file);
  if (!existsSync(p)) {
    fail(`${file} missing`);
    continue;
  }
  const size = pngSize(p);
  if (!size) fail(`${file} is not a valid PNG`);
  else if (size.width !== expected || size.height !== expected)
    fail(`${file} is ${size.width}×${size.height}, expected ${expected}×${expected}`);
  else pass(`${file} is a valid ${expected}×${expected} PNG`);
}

/* ── the things Partner Center rejects submissions over ────────────────────── */

const privacy = join(EXPORT, "privacy", "index.html");
if (!existsSync(privacy)) fail("no /privacy/ page — Partner Center requires a reachable privacy policy URL");
else pass("/privacy/ exists (required by Partner Center)");

const offline = join(EXPORT, "offline", "index.html");
if (!existsSync(offline)) fail("no /offline/ page — the service worker has nothing to fall back to");
else pass("/offline/ exists");

const sw = join(EXPORT, "sw.js");
if (!existsSync(sw)) fail("sw.js missing — the app would have no offline support");
else if (statSync(sw).size < 500) fail("sw.js looks empty");
else pass("service worker present");

/* ── the Store listing has no unfilled placeholders in fields that block ───── */

const listing = "desktop/store/listing.md";
if (!existsSync(listing)) {
  warn("desktop/store/listing.md missing — the submission has no copy to paste");
} else {
  const text = readFileSync(listing, "utf8");
  const todos = (text.match(/TODO/g) ?? []).length;
  if (todos) warn(`${todos} TODO(s) in the Store listing — expected before submission, not after`);
  else pass("Store listing has no remaining TODOs");
}

console.log("");
if (failures) {
  console.error(`package check: ${failures} failure(s), ${warnings} warning(s)`);
  process.exit(1);
}
console.log(`package check: ready to package (${warnings} warning(s))`);
