#!/usr/bin/env node
/**
 * Exercise the `web+egykode://` protocol handler.
 *
 * This is guarded because it is the least testable thing the app does and the
 * most expensive to get wrong.
 *
 * Least testable: nothing in a browser exercises it. The manifest is valid
 * either way, PWABuilder scores `protocol_handlers` as present either way, and
 * every automated check the project already runs passed while it was broken.
 * The only way to see it is to install the Windows package and launch a
 * `web+egykode://` link — which is how the bug below was actually found.
 *
 * Most expensive: `protocol_handlers` is one of only two manifest members baked
 * into the MSIX at package time (`handlers?protocol_handlers,app_uri_handler`
 * in the generated AppxManifest). Shipping it wrong costs a Store resubmission
 * rather than a website deploy.
 *
 * The bug it exists to prevent: `%s` in a `protocol_handlers` url is replaced
 * with the **entire escaped URL**, scheme included — never just the path. A
 * template of `/%s` resolved `web+egykode://en/learn/docker/docker/` to
 * `/web%2Begykode%3A%2F%2Fen%2Flearn%2Fdocker%2Fdocker%2F`, so every deep link
 * landed on the 404 page.
 *
 * Like test-edge-router.mjs, this reads the code that actually ships — the
 * inline script inside the exported /open/ page — rather than a copy that can
 * drift from it.
 *
 *   node scripts/test-protocol-handler.mjs [--export <dir>]
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const argExport = process.argv.indexOf("--export");
const EXPORT = argExport > -1 ? process.argv[argExport + 1] : "apps/web/.next-export";

const page = join(EXPORT, "open", "index.html");
if (!existsSync(page)) {
  console.error(`no /open/ page at ${page} — run the production build first`);
  process.exit(1);
}

/* ── the manifest must point at the handler, not straight at the target ────── */

let failed = 0;
const fail = (msg) => {
  failed += 1;
  console.error(`  FAIL  ${msg}`);
};
const pass = (msg) => console.log(`  ok    ${msg}`);

const manifestPath = join(EXPORT, "manifest.webmanifest");
if (!existsSync(manifestPath)) {
  fail("manifest.webmanifest is missing");
} else {
  const handlers = JSON.parse(readFileSync(manifestPath, "utf8")).protocol_handlers ?? [];
  if (!handlers.length) {
    fail("no protocol_handlers in the manifest");
  } else {
    for (const handler of handlers) {
      // The specific shape that was broken. `%s` carries the whole URL, so a
      // template using it as a bare path segment can only ever 404.
      if (/^\/%s\/?$/.test(handler.url))
        fail(`protocol_handlers url "${handler.url}" treats %s as a path — %s is the entire escaped URL`);
      else if (!handler.url.includes("%s")) fail(`protocol_handlers url "${handler.url}" has no %s to substitute`);
      else pass(`${handler.protocol} routes through ${handler.url}`);

      const target = handler.url.split("?")[0].replace(/^\/|\/$/g, "");
      if (!existsSync(join(EXPORT, target, "index.html")))
        fail(`protocol handler target /${target}/ does not exist in the export`);
      else pass(`handler page /${target}/ exists`);
    }
  }
}

/* ── the shipped forwarder resolves links, and refuses hostile ones ────────── */

const html = readFileSync(page, "utf8");
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const forwarder = scripts.find((s) => s.includes("target") && s.includes("location.replace"));

if (!forwarder) {
  fail("the /open/ page ships no forwarding script");
} else {
  const CASES = [
    ["a chapter deep link", "web+egykode://en/learn/docker/docker/", "/en/learn/docker/docker/"],
    ["a section", "web+egykode://en/labs/", "/en/labs/"],
    ["the single-colon form some launchers send", "web+egykode:en/learn/aws/vpc/", "/en/learn/aws/vpc/"],
    ["extra leading slashes collapse", "web+egykode:///en/", "/en/"],
    ["a query string survives", "web+egykode://en/search/?q=linux", "/en/search/?q=linux"],
    ["the scheme is case-insensitive", "WEB+EGYKODE://en/", "/en/"],

    // A protocol link is attacker-supplied: anyone can put one on a web page.
    // It must never become a jump to another origin or a script URL.
    ["another host stays a same-origin path", "web+egykode://evil.com/x", "/evil.com/x"],
    ["a javascript: target is refused", "web+egykode://javascript:alert(1)", null],
    ["a foreign scheme is refused", "web+other://en/", null],
    ["no target at all does nothing", "", null],
  ];

  for (const [label, input, expected] of CASES) {
    let got = null;
    const location = {
      search: input ? `?target=${encodeURIComponent(input)}` : "",
      replace: (p) => {
        got = p;
      },
    };
    try {
      new Function("location", "URLSearchParams", "decodeURIComponent", forwarder)(
        location,
        URLSearchParams,
        decodeURIComponent,
      );
    } catch (error) {
      fail(`${label}: forwarder threw — ${error.message}`);
      continue;
    }
    if (got !== expected) fail(`${label}: ${JSON.stringify(input)} -> ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
    else pass(label);
  }
}

console.log("");
if (failed) {
  console.error(`protocol handler: ${failed} failure(s)`);
  process.exit(1);
}
console.log("protocol handler: web+egykode:// links resolve, and hostile ones do not.");
