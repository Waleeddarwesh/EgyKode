#!/usr/bin/env node
/**
 * Generate content/index.json from chapter frontmatter, and enforce that they
 * agree.
 *
 * The chapter MDX is canonical. The index is a derived catalogue, and it had
 * drifted badly: 47 records against 57 chapters, ten of them marked
 * `status: complete` and absent entirely, plus stale durations for `docker`
 * (50 vs 75) and `linux-foundations` (45 vs 75).
 *
 * None of that reached a reader - apps/web/lib/content.ts reads frontmatter
 * from disk, so the site was self-consistent throughout. The damage was to the
 * tooling: scripts/lint-content.mjs derived its set of valid domains from this
 * file, which made the content linter validate chapters against a list built
 * out of chapters. A domain whose only chapter went missing from the index
 * would silently drop out of the allow-list. That loop is now cut - the linter
 * reads content/domains.json, the actual registry - and this script keeps the
 * catalogue honest.
 *
 *   node scripts/build-content-index.mjs --write   regenerate
 *   node scripts/build-content-index.mjs --check   fail on any drift (CI)
 *
 * The invariant is total: every chapter file has exactly one record, every
 * record has exactly one chapter file, and every compared field is equal. A
 * completed chapter must never be silently absent.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEARN = join(ROOT, "content", "learn");
const INDEX = join(ROOT, "content", "index.json");

/** Fields the catalogue carries, and therefore the fields kept in step. */
const FIELDS = [
  "contentId",
  "slug",
  "title",
  "domain",
  "level",
  "type",
  "phase",
  "order",
  "readingTime",
  "status",
  "capstoneRole",
  "locales",
];

function collect() {
  const records = [];
  for (const domain of readdirSync(LEARN, { withFileTypes: true })) {
    if (!domain.isDirectory()) continue;
    const dir = join(LEARN, domain.name);
    // Group by slug so translations become `locales` on one record rather than
    // duplicate entries.
    const bySlug = new Map();
    for (const file of readdirSync(dir)) {
      const m = file.match(/^(.*)\.([a-z]{2})\.mdx$/);
      if (!m) continue;
      const [, slug, locale] = m;
      if (!bySlug.has(slug)) bySlug.set(slug, { locales: [] });
      const entry = bySlug.get(slug);
      entry.locales.push(locale);
      if (locale === "en") entry.data = matter(readFileSync(join(dir, file), "utf8")).data;
    }
    for (const [slug, entry] of bySlug) {
      // English is the source of truth for metadata; a translation-only file
      // would have no canonical record, which is itself worth failing on.
      if (!entry.data) {
        console.error(`  ${domain.name}/${slug}: no .en.mdx — cannot index`);
        process.exitCode = 1;
        continue;
      }
      const d = entry.data;
      records.push({
        contentId: d.contentId,
        slug,
        title: d.title,
        domain: d.domain,
        level: d.level,
        type: d.type,
        phase: d.phase,
        order: d.order ?? 0,
        readingTime: d.readingTime ?? 0,
        status: d.status,
        capstoneRole: d.capstoneRole,
        locales: entry.locales.sort(),
      });
    }
  }
  // Deterministic, so a regeneration produces a reviewable diff.
  records.sort((a, b) => a.order - b.order || String(a.contentId).localeCompare(String(b.contentId)));
  return records;
}

function readIndex() {
  try {
    const parsed = JSON.parse(readFileSync(INDEX, "utf8"));
    if (!Array.isArray(parsed)) return { error: "content/index.json is not an array" };
    return { records: parsed };
  } catch (e) {
    return { error: `content/index.json is unreadable: ${e.message}` };
  }
}

const expected = collect();
const args = process.argv.slice(2);

if (args.includes("--write")) {
  writeFileSync(INDEX, JSON.stringify(expected, null, 2) + "\n");
  console.log(`content/index.json regenerated from frontmatter — ${expected.length} chapters.`);
  process.exit(process.exitCode ?? 0);
}

const { records: actual, error } = readIndex();
const problems = [];
if (error) problems.push(error);
else {
  const byId = new Map(actual.map((r) => [r.contentId, r]));
  const seen = new Set();
  for (const want of expected) {
    const got = byId.get(want.contentId);
    if (!got) {
      problems.push(
        `missing from the index: ${want.contentId} (${want.domain}/${want.slug}, status: ${want.status})`,
      );
      continue;
    }
    seen.add(want.contentId);
    for (const f of FIELDS) {
      const a = JSON.stringify(got[f]);
      const b = JSON.stringify(want[f]);
      if (a !== b) problems.push(`${want.contentId}: ${f} is ${a} in the index, ${b} in the chapter`);
    }
  }
  for (const got of actual)
    if (!seen.has(got.contentId)) problems.push(`indexed but no chapter file exists: ${got.contentId}`);
  if (actual.length !== expected.length)
    problems.push(`chapter count: ${expected.length} files, ${actual.length} index records`);
}

if (!args.includes("--check")) {
  console.log("Usage: build-content-index.mjs --write | --check");
  process.exit(2);
}

if (problems.length) {
  console.error(`content/index.json is out of step with the chapters (${problems.length} problem(s)):\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(`\nRegenerate with: node scripts/build-content-index.mjs --write`);
  process.exit(1);
}
console.log(`content/index.json matches all ${expected.length} chapters.`);
