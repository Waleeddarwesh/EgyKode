#!/usr/bin/env node
/**
 * Post-deploy smoke test, run against the live site.
 *
 *   node scripts/smoke-production.mjs
 *   node scripts/smoke-production.mjs https://egykode.com
 *
 * The site is a static export behind CloudFront, so the things that break are
 * rarely the pages themselves — they are the edges: a redirect rule that
 * catches a file it should not, a header policy that did not apply, an asset
 * uploaded with the wrong content type. Chapter OpenGraph images shipped
 * broken for weeks because nothing checked that the URL a page advertises
 * actually returns an image, so that check is the reason this file exists.
 *
 * Exits non-zero if anything fails, so it can gate a release.
 */

const BASE = (process.argv[2] ?? "https://egykode.com").replace(/\/$/, "");

let passed = 0;
const failures = [];

function ok(name, detail = "") {
  passed += 1;
  console.log(`  ok    ${name}${detail ? `  ${detail}` : ""}`);
}
function fail(name, detail) {
  failures.push(`${name} — ${detail}`);
  console.log(`  FAIL  ${name}  ${detail}`);
}

const get = (path, init) => fetch(BASE + path, { redirect: "manual", ...init });

// ── Pages ───────────────────────────────────────────────────────────────────
async function pages() {
  console.log("\npages");
  const paths = [
    "/en/", "/en/roadmaps/", "/en/learn/", "/en/labs/", "/en/courses/",
    "/en/projects/", "/en/topics/", "/en/prepare/questions/", "/en/jobs/",
    "/en/community/", "/en/learn/docker/docker/",
    "/en/labs/lab-20-linux-server-administration/",
    "/en/projects/ivolve-cloud-devops-capstone/",
  ];
  for (const p of paths) {
    const r = await get(p);
    if (r.status === 200) ok(p);
    else fail(p, `expected 200, got ${r.status}${r.headers.get("location") ? ` -> ${r.headers.get("location")}` : ""}`);
  }
}

// ── Redirects behave ────────────────────────────────────────────────────────
async function redirects() {
  console.log("\nrouting");
  const cases = [
    ["/", 308, "/en/"],
    ["/en/learn", 308, "/en/learn/"],
  ];
  for (const [path, status, target] of cases) {
    const r = await get(path);
    const loc = r.headers.get("location");
    if (r.status === status && loc?.endsWith(target)) ok(`${path} -> ${target}`);
    else fail(path, `expected ${status} -> ${target}, got ${r.status} -> ${loc}`);
  }
  // www canonicalisation, path preserved.
  const w = await fetch("https://www.egykode.com/en/learn/", { redirect: "manual" });
  const wl = w.headers.get("location");
  if (w.status === 301 && wl === "https://egykode.com/en/learn/") ok("www -> apex, path preserved");
  else fail("www -> apex", `got ${w.status} -> ${wl}`);
}

// ── OpenGraph images ────────────────────────────────────────────────────────
// The regression that motivated this file: every chapter advertised an
// og:image that redirected into a 404.
async function ogImages() {
  console.log("\nopengraph images");
  const chapters = ["/en/learn/docker/docker/", "/en/learn/aws/vpc/", "/en/learn/argocd/argocd/"];
  for (const c of chapters) {
    const html = await (await fetch(BASE + c)).text();
    const url = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    if (!url) { fail(c, "no og:image declared"); continue; }

    const r = await fetch(url, { redirect: "follow" });
    const type = r.headers.get("content-type") ?? "";
    const buf = Buffer.from(await r.arrayBuffer());
    const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;

    if (r.status !== 200) fail(`og ${c}`, `${r.status} for ${url}`);
    else if (!type.startsWith("image/")) fail(`og ${c}`, `content-type "${type}" — scrapers reject this`);
    else if (!isPng) fail(`og ${c}`, "body is not a PNG");
    else ok(`og ${c}`, `${type}, ${(buf.length / 1024).toFixed(0)}K`);
  }
}

// ── Sitemap ─────────────────────────────────────────────────────────────────
async function sitemap() {
  console.log("\nsitemap");
  const xml = await (await fetch(BASE + "/sitemap.xml")).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) return fail("sitemap", "no <loc> entries");
  ok("sitemap parses", `${urls.length} urls`);

  const slashless = urls.filter((u) => !u.endsWith("/"));
  if (slashless.length) fail("sitemap trailing slashes", `${slashless.length} without, e.g. ${slashless[0]}`);
  else ok("every sitemap url ends with /");

  // Sample rather than fetch all — a redirect in the sitemap is systemic, so a
  // sample catches it, and a full sweep would hammer the origin on every deploy.
  const sample = urls.filter((_, i) => i % Math.ceil(urls.length / 12) === 0).slice(0, 12);
  let bad = 0;
  for (const u of sample) {
    const r = await fetch(u, { redirect: "manual" });
    if (r.status !== 200) { bad += 1; if (bad === 1) fail("sitemap url", `${r.status} for ${u}`); }
  }
  if (!bad) ok(`sampled ${sample.length} sitemap urls`, "all 200");
}

// ── robots.txt ──────────────────────────────────────────────────────────────
async function robots() {
  console.log("\nrobots.txt");
  const txt = await (await fetch(BASE + "/robots.txt")).text();
  if (!/Sitemap:\s*https?:\/\//i.test(txt)) fail("robots", "no Sitemap directive");
  else ok("declares a sitemap");
  if (/Disallow:\s*\/_next\//i.test(txt)) fail("robots", "blocks /_next/ — fonts and CSS would be uncrawlable");
  else ok("does not block /_next/");
  if (/Disallow:\s*\/\s*$/m.test(txt)) fail("robots", "Disallow: / would deindex the whole site");
  else ok("does not disallow everything");
}

// ── Indexing directives ─────────────────────────────────────────────────────
async function indexing() {
  console.log("\nindexing directives");
  for (const p of ["/en/login/", "/en/register/", "/en/settings/profile/"]) {
    const html = await (await fetch(BASE + p)).text();
    const robots = html.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? "";
    if (/noindex/.test(robots)) ok(`${p} noindex`);
    else fail(p, `expected noindex, got "${robots}"`);
  }
  const html = await (await fetch(BASE + "/en/learn/docker/docker/")).text();
  const robots = html.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? "";
  if (/noindex/.test(robots)) fail("chapter indexing", "a chapter is noindex — content would vanish");
  else ok("chapters remain indexable", `"${robots}"`);
}

// ── Structured data ─────────────────────────────────────────────────────────
async function structuredData() {
  console.log("\nstructured data");
  const html = await (await fetch(BASE + "/en/")).text();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => m[1]);
  let org = null;
  for (const b of blocks) {
    try {
      const j = JSON.parse(b);
      org = j.publisher ?? (j["@graph"] ?? []).find((n) => n["@type"] === "Organization") ?? null;
      if (org) break;
    } catch { /* a malformed block is caught below */ }
  }
  if (!org) return fail("Organization", "no Organization node found");
  ok("Organization present");
  if (Array.isArray(org.sameAs) && org.sameAs.length) ok("sameAs", `${org.sameAs.length} profiles`);
  else fail("sameAs", "absent — this is the entity signal for the brand name");
}

// ── Headers ─────────────────────────────────────────────────────────────────
async function headers() {
  console.log("\nsecurity + caching headers");
  const r = await fetch(BASE + "/en/learn/");
  const need = {
    "content-security-policy": /default-src/,
    "strict-transport-security": /max-age=\d+/,
    "x-frame-options": /DENY|SAMEORIGIN/i,
    "x-content-type-options": /nosniff/i,
    "referrer-policy": /./,
  };
  for (const [h, pattern] of Object.entries(need)) {
    const v = r.headers.get(h);
    if (v && pattern.test(v)) ok(h, v.slice(0, 46) + (v.length > 46 ? "…" : ""));
    else fail(h, v ? `unexpected value "${v.slice(0, 40)}"` : "missing");
  }
  if ((r.headers.get("content-encoding") ?? "").match(/br|gzip/)) ok("compressed", r.headers.get("content-encoding"));
  else fail("compression", "responses are not compressed");

  // Hashed assets must be immutable, or every visit refetches the bundle.
  const html = await (await fetch(BASE + "/en/learn/")).text();
  const asset = html.match(/\/_next\/static\/[^"']+\.(?:css|js)/)?.[0];
  if (!asset) return fail("immutable assets", "no hashed asset found to check");
  const a = await fetch(BASE + asset);
  const cc = a.headers.get("cache-control") ?? "";
  if (/immutable/.test(cc)) ok("hashed assets immutable", cc);
  else fail("hashed assets", `cache-control "${cc}"`);
}

// ── Run ─────────────────────────────────────────────────────────────────────
console.log(`smoke test — ${BASE}`);
for (const step of [pages, redirects, ogImages, sitemap, robots, indexing, structuredData, headers]) {
  try {
    await step();
  } catch (err) {
    fail(step.name, `threw: ${err.message}`);
  }
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("\nfailures:");
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log("production looks healthy");
