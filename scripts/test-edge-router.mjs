#!/usr/bin/env node
/**
 * Exercise the CloudFront viewer-request function.
 *
 * This function is the only routing the site has. `output: export` removes
 * middleware, so every locale redirect, every legacy URL, and the mapping from
 * `/en/learn/` to `/en/learn/index.html` happens here — a mistake in it does
 * not break one page, it breaks all of them, and the only way to find out
 * would be in production.
 *
 * The code is not duplicated here. It is read out of the Terraform heredoc
 * that actually deploys, so a test cannot pass against a copy that has drifted
 * from what is live.
 *
 * What this does NOT verify: that the CloudFront JS runtime accepts the
 * syntax. It runs under Node, which is far more permissive. Keep to the subset
 * cloudfront-js-2.0 documents.
 *
 * Run: node scripts/test-edge-router.mjs
 */
import { readFileSync } from "node:fs";

const TF = "infrastructure/terraform/production/cloudfront.tf";
const source = readFileSync(TF, "utf8");

// `\r?\n` throughout: the working copy on Windows has CRLF line endings, and a
// `\n`-only pattern silently matches nothing here while passing in CI.
const body = source.match(/code\s*=\s*<<-JS\r?\n([\s\S]*?)\r?\n[ \t]*JS\r?\n/);
if (!body) {
  console.error(`could not find the function source in ${TF}`);
  process.exit(1);
}

// Terraform's <<- strips the common leading indentation; recreate that so the
// snippet parses exactly as the deployed one does.
const lines = body[1].split("\n").filter((l) => l.trim());
const indent = Math.min(...lines.map((l) => l.match(/^ */)[0].length));
const code = body[1]
  .split("\n")
  .map((l) => l.slice(indent))
  .join("\n");

const handler = new Function(`${code}; return handler;`)();

/** Build the event shape CloudFront passes in. */
const event = (uri, { host = "egykode.com", query = {} } = {}) => ({
  request: {
    uri,
    method: "GET",
    headers: host ? { host: { value: host } } : {},
    querystring: query,
  },
});

const cases = [
  // [name, event, expectation]
  ["apex root redirects to the published locale", event("/"), { status: 308, location: "/en/" }],
  ["directory gets an index", event("/en/learn/"), { uri: "/en/learn/index.html" }],
  ["extensionless path gains a trailing slash", event("/en/learn"), { status: 308, location: "/en/learn/" }],
  ["asset passes through untouched", event("/_next/static/chunks/main.js"), { uri: "/_next/static/chunks/main.js" }],
  ["renamed /build keeps working", event("/en/build/foo/"), { status: 308, location: "/en/projects/foo/" }],
  ["renamed /build bare", event("/en/build"), { status: 308, location: "/en/projects/" }],

  // Host canonicalisation.
  ["www redirects to apex, preserving the path", event("/en/learn/", { host: "www.egykode.com" }), { status: 301, location: "https://egykode.com/en/learn/" }],
  ["www root redirects to apex root", event("/", { host: "www.egykode.com" }), { status: 301, location: "https://egykode.com/" }],
  [
    "www preserves the query string",
    event("/en/search/", { host: "www.egykode.com", query: { q: { value: "linux" } } }),
    { status: 301, location: "https://egykode.com/en/search/?q=linux" },
  ],
  ["apex is never redirected to itself", event("/en/learn/"), { uri: "/en/learn/index.html" }],
  ["a host that merely contains www is untouched", event("/en/"), { uri: "/en/index.html" }],
  ["missing host header does not throw", { request: { uri: "/en/", method: "GET", headers: {}, querystring: {} } }, { uri: "/en/index.html" }],
];

let failed = 0;
for (const [name, ev, want] of cases) {
  let got;
  try {
    got = handler(ev);
  } catch (error) {
    console.log(`  FAIL  ${name}\n        threw: ${error.message}`);
    failed += 1;
    continue;
  }

  const actual = got.statusCode
    ? { status: got.statusCode, location: got.headers?.location?.value }
    : { uri: got.uri };

  const ok = Object.entries(want).every(([k, v]) => actual[k] === v);
  if (!ok) {
    console.log(`  FAIL  ${name}\n        want ${JSON.stringify(want)}\n        got  ${JSON.stringify(actual)}`);
    failed += 1;
  } else {
    console.log(`  ok    ${name}`);
  }
}

console.log(`\nedge router — ${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
