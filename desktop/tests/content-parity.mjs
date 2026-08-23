#!/usr/bin/env node
/**
 * Web ↔ desktop content parity.
 *
 * The desktop client is the web client packaged, so parity is not a matter of
 * comparing two renderings — it is a matter of proving there is only one thing
 * to render. This test asserts that architectural claim in the three ways it
 * could quietly stop being true:
 *
 *   1. `desktop/` contains no curriculum content. The moment somebody copies a
 *      chapter in here to "fix it for desktop", the single source of truth is
 *      gone and every later sync problem follows from it.
 *
 *   2. Every route the desktop shell can reach exists in the same export the
 *      website is served from — one build, both clients.
 *
 *   3. The manifest's `start_url` and `scope` keep navigation inside that
 *      export, so the app cannot silently become a browser pointed elsewhere.
 *
 * It deliberately does not compare pixels. Two clients rendering the same HTML
 * at different window sizes should differ visually; that is the point of having
 * a desktop shell.
 *
 *   node desktop/tests/content-parity.mjs [--export <dir>]
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const argExport = process.argv.indexOf("--export");
const EXPORT = argExport > -1 ? process.argv[argExport + 1] : "apps/web/.next-export";

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL  ${msg}`);
};
const pass = (msg) => console.log(`  ok    ${msg}`);

/* ── 1. desktop/ holds no curriculum content ───────────────────────────────── */

const CONTENT_EXT = new Set([".mdx", ".md"]);
const CONTENT_DIRS = ["content", "labs", "chapters", "roadmaps", "projects", "courses"];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const desktopFiles = existsSync("desktop") ? walk("desktop") : [];

// README.md and docs/*.md are desktop documentation, not curriculum. Anything
// else carrying content extensions is a copy that should not exist.
const strayContent = desktopFiles.filter((f) => {
  const rel = relative("desktop", f).replace(/\\/g, "/");
  if (rel === "README.md" || rel.startsWith("docs/") || rel.startsWith("store/")) return false;
  return CONTENT_EXT.has(extname(f));
});
if (strayContent.length) fail(`desktop/ contains content files: ${strayContent.join(", ")}`);
else pass("desktop/ contains no curriculum content files");

const strayDirs = CONTENT_DIRS.filter((d) => existsSync(join("desktop", d)));
if (strayDirs.length) fail(`desktop/ has content directories: ${strayDirs.join(", ")}`);
else pass(`desktop/ has none of: ${CONTENT_DIRS.join(", ")}`);

/* ── 2. representative routes resolve in the shared export ─────────────────── */

/**
 * One per phase of the curriculum, plus a lab, a roadmap, a project, courses
 * and the interview bank — the spread the brief asks for. These are the routes
 * a learner walks from Linux to the capstone.
 */
const ROUTES = [
  ["Linux chapter", "en/learn/linux/linux-foundations"],
  ["Docker chapter", "en/learn/docker/docker"],
  ["AWS chapter", "en/learn/aws/vpc"],
  ["Terraform chapter", "en/learn/terraform/terraform"],
  ["Kubernetes chapter", "en/learn/kubernetes/kubernetes"],
  ["GitOps chapter", "en/learn/gitops/gitops"],
  ["SRE chapter", "en/learn/sre/sre-fundamentals"],
  ["Lab", "en/labs/lab-23-git-branching-collaboration"],
  ["Capstone lab", "en/labs/lab-19-production-capstone"],
  ["Roadmaps index", "en/roadmaps"],
  ["Labs index", "en/labs"],
  ["Learn index", "en/learn"],
  ["Courses", "en/courses"],
  ["Interview questions", "en/prepare/questions"],
  ["Offline fallback", "offline"],
];

if (!existsSync(EXPORT)) {
  fail(`export not found at ${EXPORT} — run the production build first`);
} else {
  let missing = 0;
  for (const [label, route] of ROUTES) {
    const html = join(EXPORT, route, "index.html");
    if (!existsSync(html) || statSync(html).size === 0) {
      fail(`${label}: /${route}/ has no page in the export`);
      missing += 1;
    }
  }
  if (!missing) pass(`all ${ROUTES.length} representative routes exist in one shared export`);
}

/* ── 3. the manifest keeps the app inside that export ──────────────────────── */

const manifestPath = join(EXPORT, "manifest.webmanifest");
if (!existsSync(manifestPath)) {
  fail("manifest.webmanifest is missing — the app is not installable");
} else {
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));

  if (m.scope !== "/") fail(`manifest scope is "${m.scope}", not "/" — navigation could escape the app`);
  else pass('manifest scope is "/" — all routes stay in the app');

  const startPage = join(EXPORT, m.start_url.replace(/^\/|\/$/g, ""), "index.html");
  if (!existsSync(startPage)) fail(`manifest start_url ${m.start_url} does not exist in the export`);
  else pass(`manifest start_url ${m.start_url} resolves in the same export`);

  const icons = m.icons ?? [];
  const missingIcons = icons.filter((i) => !existsSync(join(EXPORT, i.src.replace(/^\//, ""))));
  if (missingIcons.length) fail(`manifest icons missing: ${missingIcons.map((i) => i.src).join(", ")}`);
  else pass(`all ${icons.length} manifest icons exist`);

  if (!icons.some((i) => String(i.purpose).includes("maskable")))
    fail("no maskable icon — Windows will pad or clip the mark");
  else pass("a maskable icon is declared");

  // Every shortcut target must exist, or the taskbar jump list has dead entries.
  const badShortcuts = (m.shortcuts ?? []).filter(
    (s) => !existsSync(join(EXPORT, s.url.replace(/^\/|\/$/g, ""), "index.html")),
  );
  if (badShortcuts.length) fail(`shortcuts point at missing pages: ${badShortcuts.map((s) => s.url).join(", ")}`);
  else pass(`all ${(m.shortcuts ?? []).length} jump-list shortcuts resolve`);
}

/* ── 4. the service worker caches rather than bundles ──────────────────────── */

const swPath = join(EXPORT, "sw.js");
if (!existsSync(swPath)) {
  fail("sw.js is missing — there is no offline support");
} else {
  const sw = readFileSync(swPath, "utf8");
  // A service worker that shipped its own copy of a chapter would defeat the
  // whole architecture. The shell list should be a handful of routes, not a
  // generated manifest of the corpus.
  const precached = (sw.match(/SHELL_URLS\s*=\s*\[([\s\S]*?)\]/) ?? [])[1] ?? "";
  const count = (precached.match(/"/g) ?? []).length / 2;
  if (count > 12) fail(`service worker precaches ${count} URLs — that is a bundle, not a shell`);
  else pass(`service worker precaches ${count} shell URLs, caching the rest on demand`);
}

console.log("");
if (failures) {
  console.error(`content parity: ${failures} failure(s)`);
  process.exit(1);
}
console.log("content parity: web and desktop resolve the same content from one source.");
