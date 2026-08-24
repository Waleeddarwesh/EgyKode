#!/usr/bin/env node
/**
 * Exercise the service worker against a real browser.
 *
 * Two properties have to hold at once, and they pull in opposite directions:
 * online, nothing may be served stale; offline, what has been read must still
 * be readable. A worker can satisfy either one alone by accident.
 *
 * The bug this exists to prevent shipped and reached production. Next writes
 * each route's RSC payload as `index.txt` beside its `index.html`, not under
 * `/_next/static/`, so it was neither a navigation nor immutable and fell
 * through to stale-while-revalidate — which serves the cached copy first by
 * definition. After a deploy the browser therefore loaded new chunks alongside
 * a pre-deploy payload, whose webpack module ids no longer resolved, and React
 * threw: "Application error: a client-side exception has occurred".
 *
 * `/build-id.txt` made it worse. stale-build-guard.tsx polls that file to
 * detect this very mismatch, using `cache: "no-store"` — which bypasses the
 * HTTP cache but not a service worker. The stale copy blinded the guard.
 *
 * None of this is visible to a unit test, a type check or a static export
 * check. It needs a browser, a worker, and a file changing underneath it.
 *
 *   node scripts/test-service-worker.mjs [--export <dir>]
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync, cpSync, rmSync, mkdirSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { chromium } from "playwright";

const argExport = process.argv.indexOf("--export");
const SRC = argExport > -1 ? process.argv[argExport + 1] : "apps/web/.next-export";

if (!existsSync(join(SRC, "sw.js"))) {
  console.error(`no service worker at ${SRC}/sw.js — run the production build first`);
  process.exit(1);
}

let failed = 0;
const fail = (m) => {
  failed += 1;
  console.error(`  FAIL  ${m}`);
};
const pass = (m) => console.log(`  ok    ${m}`);

/* ── serve a disposable copy, so files can change underneath the worker ────── */

const ROOT = ".sw-test-export";
rmSync(ROOT, { recursive: true, force: true });

const CHAPTER = "en/learn/docker/docker";
const SINGLES = ["en/index.html", "en/index.txt", "sw.js", "build-id.txt", "offline/index.html", "en/labs/index.html"];
for (const rel of SINGLES) {
  const from = join(SRC, rel);
  if (!existsSync(from)) continue;
  mkdirSync(join(ROOT, dirname(rel)), { recursive: true });
  cpSync(from, join(ROOT, rel));
}
cpSync(join(SRC, CHAPTER), join(ROOT, CHAPTER), { recursive: true });
cpSync(join(SRC, "_next"), join(ROOT, "_next"), { recursive: true });

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join(ROOT, path);
  if (path.endsWith("/") || !extname(path)) file = join(ROOT, path, "index.html");
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": "public,max-age=0,must-revalidate",
  });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`${base}/en/`, { waitUntil: "networkidle" });
await page.evaluate(() =>
  navigator.serviceWorker.ready.then(
    () =>
      new Promise((resolve) => {
        if (navigator.serviceWorker.controller) return resolve();
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve());
      }),
  ),
);
pass("the worker installs and takes control");

const read = (u) => page.evaluate((url) => fetch(url).then((r) => r.text()).catch(() => "<<failed>>"), u);
const status = (u) => page.evaluate((url) => fetch(url).then((r) => r.status).catch(() => 0), u);

/* ── 1. page data must never be served stale ──────────────────────────────── */

const RSC = `/${CHAPTER}/index.txt`;
await read(RSC); // populate whatever cache it would use

const rscFile = join(ROOT, CHAPTER, "index.txt");
const originalRsc = readFileSync(rscFile, "utf8");
writeFileSync(rscFile, `AFTER-DEPLOY::${originalRsc}`);

if ((await read(RSC)).startsWith("AFTER-DEPLOY::"))
  pass("an RSC payload changed by a deploy is served fresh, not from cache");
else fail("the RSC payload was served stale after a deploy — the client-side exception is back");

/* ── 2. the deploy guard must see the deploy ──────────────────────────────── */

await read("/build-id.txt");
writeFileSync(join(ROOT, "build-id.txt"), "second-deploy-id");
if ((await read("/build-id.txt")).trim() === "second-deploy-id")
  pass("/build-id.txt is fresh, so stale-build-guard can still see a deploy");
else fail("/build-id.txt was served stale — the deploy guard is blinded");

/* ── 3. offline still works, which is the point of having a worker ────────── */

await page.goto(`${base}/${CHAPTER}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await context.setOffline(true);

await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
const offlineBody = (await page.textContent("body").catch(() => "")) ?? "";
if (offlineBody.length > 500 && !offlineBody.includes("not been saved yet"))
  pass("a page already read stays readable offline");
else fail("a previously-read page is not readable offline");

// A page never visited has nothing cached; the reader should get the offline
// page rather than a browser error.
await page.goto(`${base}/en/labs/`, { waitUntil: "domcontentloaded" }).catch(() => {});
const unseen = (await page.textContent("body").catch(() => "")) ?? "";
if (unseen.includes("not been saved yet") || unseen.includes("offline") || unseen.includes("Offline"))
  pass("an unvisited page falls back to the offline page");
else fail(`an unvisited page offline gave: ${JSON.stringify(unseen.slice(0, 80))}`);

// Page data offline must fail honestly rather than return the offline page's
// HTML, which the router would try to parse as a payload.
const dataStatus = await status("/en/index.txt");
if (dataStatus === 503 || dataStatus === 200) pass(`page data offline answers ${dataStatus}, not an HTML document`);
else fail(`page data offline answered ${dataStatus}`);

await context.setOffline(false);
await browser.close();
server.close();
rmSync(ROOT, { recursive: true, force: true });

console.log("");
if (failed) {
  console.error(`service worker: ${failed} failure(s)`);
  process.exit(1);
}
console.log("service worker: fresh when online, readable when offline.");
