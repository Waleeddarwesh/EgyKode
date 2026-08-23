#!/usr/bin/env node
/**
 * Chapter teaching-structure audit.
 *
 * This is a GAP DETECTOR, not a quality score. It answers one narrow question
 * per chapter: "is this teaching element present, and does it appear before the
 * learner needs it?" It cannot tell whether the prose is any good, whether an
 * explanation is correct, or whether a beginner would actually follow it. Those
 * judgements need a person reading the chapter, and the audit document records
 * them separately.
 *
 * The reason position matters as much as presence: the Terraform chapter has a
 * "What Existed Before?" section, so a presence-only check passes it. It sits at
 * line 328 of 451 - after providers, plan/apply, variables and modules - so the
 * beginner meets the whole workflow before learning which problem it solves.
 * Docker puts the same element at line 31 of 733. Both "have" it; only one
 * teaches with it.
 *
 * Never report a chapter as beginner-ready because this script is quiet.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const LEARN = join(process.cwd(), "content", "learn");

/**
 * Each element: how to recognise it, and where it must appear.
 *
 * `before` is a fraction of the body. It is deliberately loose - the point is
 * to catch an element that arrives far too late to do its job, not to enforce a
 * layout. An orientation element at 70% of the way down is a real finding; the
 * difference between 12% and 18% is noise.
 */
const ELEMENTS = [
  {
    id: "why-now",
    label: "Opens with a why-now bridge, not a generic Introduction",
    // Calibrated against the real corpus rather than guessed. Surveying the
    // first H2 of all 57 chapters found two authoring generations: roughly
    // thirty open "## Introduction" or "## Introduction to X", and fifteen open
    // with a bridge that names what came before - "Why this comes after
    // Docker", "Why Docker sits exactly here", "Why this comes before breaking
    // things". Only the second kind answers "why am I learning this now?", so
    // the check is anchored to the FIRST H2: a bridge buried lower down is not
    // an opening.
    re: /^## .*(why this|why .* (comes|sits)|why labs|how to use this chapter|what you are going to build|the chain)/im,
    firstH2Only: true,
    before: 1,
  },
  {
    id: "problem",
    label: "The problem that existed before the technology",
    re: /^#{2,3} .*\b(the problem|problem it solves|what existed before|before .*, |life without|the pain)/im,
    before: 0.35,
  },
  {
    id: "mental-model",
    label: "Mental model / diagram before the vocabulary",
    re: /^#{2,3} .*\b(mental model|diagram|the workflow|how it fits|architecture at a glance)/im,
    before: 0.5,
    // A fenced ASCII/mermaid block early in the chapter also counts; many
    // chapters draw the model without giving it a heading.
    altRe: /```(text|mermaid|ascii)?\n[\s\S]{0,900}?(--?->|→|│|├|\|\s*$)/m,
  },
  {
    id: "troubleshooting",
    label: "Failure modes / troubleshooting",
    re: /^#{2,3} .*\b(common failures?|troubleshoot|debugging|when it breaks|failure modes?|common mistakes?|what goes wrong|diagnos|things that go wrong)/im,
    before: 1,
  },
  {
    id: "capstone",
    label: "Says in prose where this appears in the capstone",
    // Every core chapter already declares `capstonePurpose` in frontmatter, and
    // `labs.ts` uses it to drive the architecture view - but the chapter page
    // never renders it, so a reader of the chapter is not told. Presence of the
    // frontmatter is therefore NOT evidence the learner was told; this looks
    // for the chapter saying it out loud.
    re: /^#{2,3} .*\b(capstone|in the platform|where .* appears|appears in)/im,
    // A dedicated section is one way; the other is a bold **In the capstone**
    // line inside the opening bridge, which is where it does the most work -
    // the learner is told what they are about to build it for before they
    // start. Anchored to that exact marker rather than any mention of the word,
    // so a passing reference in prose does not count as having told them.
    altRe: /\*\*In the capstone\*\*/i,
    before: 1,
  },
  {
    id: "practise",
    label: "Practise it / linked lab",
    re: /^#{2,3} .*\b(practise|practice this|try it|your turn)\b/im,
    before: 1,
    altRe: /\]\(\/(en\/)?labs\//i,
  },
];

function bodyOf(raw) {
  const t = raw.replace(/\r\n/g, "\n");
  const m = t.match(/^---\n([\s\S]*?)\n---\n/);
  return { fm: m ? m[1] : "", body: m ? t.slice(m[0].length) : t };
}

function fmField(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
}

/** Position of the first match as a fraction of the body, or null. */
function positionOf(body, re) {
  const m = body.match(re);
  if (!m || m.index === undefined) return null;
  return m.index / body.length;
}

const chapters = [];
for (const domain of readdirSync(LEARN, { withFileTypes: true })) {
  if (!domain.isDirectory()) continue;
  for (const file of readdirSync(join(LEARN, domain.name))) {
    if (!file.endsWith(".en.mdx")) continue;
    const path = join(LEARN, domain.name, file);
    const raw = readFileSync(path, "utf8");
    const { fm, body } = bodyOf(raw);
    const firstH2 = (body.match(/^## .*/m) || [""])[0];
    const findings = [];
    for (const el of ELEMENTS) {
      let pos = el.firstH2Only ? (el.re.test(firstH2) ? 0 : null) : positionOf(body, el.re);
      if (pos === null && el.altRe) pos = positionOf(body, el.altRe);
      if (pos === null) findings.push({ id: el.id, state: "missing", label: el.label });
      else if (pos > el.before)
        findings.push({
          id: el.id,
          state: "late",
          label: el.label,
          at: Math.round(pos * 100),
          expected: Math.round(el.before * 100),
        });
    }
    // Generic "Level N" scaffolding is not wrong, but where a chapter uses it
    // *and* has no why-now/problem opening, the learner meets a difficulty
    // ladder with no orientation - worth surfacing together.
    const levels = (body.match(/^## Level \d/gim) || []).length;
    chapters.push({
      domain: domain.name,
      file,
      contentId: fmField(fm, "contentId"),
      title: fmField(fm, "title"),
      phase: fmField(fm, "phase"),
      order: Number(fmField(fm, "order") || 0),
      capstoneRole: fmField(fm, "capstoneRole"),
      prerequisites: fmField(fm, "prerequisites"),
      lines: body.split("\n").length,
      levels,
      findings,
    });
  }
}

chapters.sort((a, b) => a.order - b.order || a.contentId.localeCompare(b.contentId));

const args = process.argv.slice(2);
if (args.includes("--json")) {
  console.log(JSON.stringify(chapters, null, 2));
  process.exit(0);
}

const core = chapters.filter((c) => c.capstoneRole === "core");
console.log(
  `${chapters.length} chapters (${core.length} capstoneRole: core). Gap detector only - a quiet chapter is not a verified one.\n`,
);

const counts = new Map();
for (const c of chapters)
  for (const f of c.findings) counts.set(f.id + ":" + f.state, (counts.get(f.id + ":" + f.state) || 0) + 1);

console.log("Across all chapters:");
for (const el of ELEMENTS) {
  const missing = counts.get(el.id + ":missing") || 0;
  const late = counts.get(el.id + ":late") || 0;
  if (missing || late)
    console.log(
      `  ${el.label.padEnd(46)} missing ${String(missing).padStart(2)}   late ${String(late).padStart(2)}`,
    );
}

console.log("\nPer chapter (only chapters with findings):");
for (const c of chapters) {
  if (!c.findings.length) continue;
  const tag = c.capstoneRole === "core" ? "CORE" : (c.capstoneRole || "-").slice(0, 4).toUpperCase();
  console.log(`\n  [${tag}] ${c.contentId}  (${c.domain}, order ${c.order}, ${c.lines} lines)`);
  if (c.levels && c.findings.some((f) => f.id === "why-now" || f.id === "problem"))
    console.log(`      uses ${c.levels}x "Level N" scaffolding with no early orientation`);
  for (const f of c.findings)
    console.log(
      `      ${f.state === "missing" ? "MISSING" : `LATE @${f.at}%`.padEnd(7)}  ${f.label}` +
        (f.state === "late" ? ` (wanted before ${f.expected}%)` : ""),
    );
}

const clean = chapters.filter((c) => !c.findings.length);
console.log(`\n${clean.length} chapter(s) with no structural gaps detected:`);
for (const c of clean) console.log(`  ${c.contentId} (${c.domain})`);
