#!/usr/bin/env node
/**
 * Validate the external reference list, and optionally re-check every link.
 *
 * External links rot in a way internal ones cannot: a video is deleted, a
 * channel renamed, a course moved. Nothing in the build notices, because the
 * page still renders a perfectly good link to a 404.
 *
 *   node scripts/check-resources.mjs           shape only — fast, runs in CI
 *   node scripts/check-resources.mjs --live    also fetch every URL
 *
 * `--live` is deliberately not part of `npm run verify`: it depends on other
 * people's servers, so a rate limit or an outage would fail a build that has
 * nothing wrong with it. Run it on a schedule, or before a release.
 */
import { readFileSync } from "node:fs";

const LANGUAGES = new Set(["en", "ar"]);
const KINDS = new Set(["course", "playlist", "channel", "talk"]);
const REQUIRED = ["title", "url", "by", "language", "kind"];
const LEVELS = new Set(["beginner", "intermediate", "advanced"]);

const errors = [];
const notes = [];

const raw = JSON.parse(readFileSync("content/resources.json", "utf8"));
const domains = raw.domains ?? {};

// Known domains, so a typo does not silently hide a whole section. `domains`
// is an object keyed by id, not an array.
const known = new Set(Object.keys(JSON.parse(readFileSync("content/domains.json", "utf8")).domains ?? {}));

let count = 0;
const entries = [];
for (const [domain, list] of Object.entries(domains)) {
  if (known.size && !known.has(domain)) {
    errors.push(`"${domain}" is not a known domain — the section would never render`);
  }
  if (!Array.isArray(list) || list.length === 0) {
    errors.push(`"${domain}" has no entries`);
    continue;
  }
  const seen = new Set();
  for (const entry of list) {
    count += 1;
    entries.push({ domain, ...entry });
    for (const key of REQUIRED) {
      if (!entry[key]) errors.push(`${domain}: entry missing "${key}" — ${entry.url ?? entry.title ?? "?"}`);
    }
    if (entry.language && !LANGUAGES.has(entry.language))
      errors.push(`${domain}: unknown language "${entry.language}"`);
    if (entry.kind && !KINDS.has(entry.kind))
      errors.push(`${domain}: unknown kind "${entry.kind}"`);
    if (entry.url && !/^https:\/\//.test(entry.url))
      errors.push(`${domain}: url must be https — ${entry.url}`);
    if (entry.level && !LEVELS.has(entry.level))
      errors.push(`${domain}: unknown level "${entry.level}"`);
    if (entry.minutes !== undefined && !(Number.isInteger(entry.minutes) && entry.minutes > 0))
      errors.push(`${domain}: minutes must be a positive integer — ${entry.url}`);
    if (entry.videos !== undefined && !(Number.isInteger(entry.videos) && entry.videos > 0))
      errors.push(`${domain}: videos must be a positive integer — ${entry.url}`);
    if (entry.extra !== undefined && typeof entry.extra !== "boolean")
      errors.push(`${domain}: extra must be a boolean — ${entry.url}`);
    if (entry.url && seen.has(entry.url))
      errors.push(`${domain}: the same url is listed twice — ${entry.url}`);
    seen.add(entry.url);
  }
}

if (process.argv.includes("--live")) {
  console.log(`checking ${count} link(s) against their servers…\n`);
  const UA = { "user-agent": "Mozilla/5.0 (compatible; EgyKode link check)" };
  for (const entry of entries) {
    let res;
    try {
      res = await fetch(entry.url, { redirect: "follow", headers: UA });
    } catch (error) {
      errors.push(`${entry.domain}: ${entry.url} — ${String(error)}`);
      continue;
    }
    if (!res.ok) {
      errors.push(`${entry.domain}: HTTP ${res.status} — ${entry.url}`);
      continue;
    }
    // Some pages are behind a login and expose no usable title. Those are
    // flagged in the data so a gated page is not reported as a mismatch on
    // every run; reachability is still checked.
    if (entry.titleFromPage === false) {
      notes.push(`${entry.domain}: reachable, title not verifiable (login-gated) — ${entry.url}`);
      continue;
    }
    const html = await res.text();
    const title = (html.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? "";
    if (/404 Not Found|Video unavailable|This playlist does not exist/i.test(html + title)) {
      errors.push(`${entry.domain}: page loads but the content is gone — ${entry.url}`);
    }
  }
}

console.log(`resource check — ${count} reference(s) across ${Object.keys(domains).length} domain(s)`);
const byLang = entries.reduce((acc, e) => ({ ...acc, [e.language]: (acc[e.language] ?? 0) + 1 }), {});
console.log(`  by language: ${Object.entries(byLang).map(([l, n]) => `${l}=${n}`).join(", ")}`);

if (notes.length) {
  console.log(`\nnotes (${notes.length}):`);
  for (const n of notes) console.log(`  ${n}`);
}
if (errors.length) {
  console.log(`\nerrors (${errors.length}):`);
  for (const e of errors) console.log(`  ${e}`);
  process.exit(1);
}
console.log("\nall references are well-formed");
