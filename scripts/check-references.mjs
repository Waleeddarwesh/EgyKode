#!/usr/bin/env node
/**
 * Every id that points at something else must resolve, in both directions.
 *
 * The corpus is a graph held together by string ids: chapters name
 * prerequisites and related chapters, roadmaps name chapters and a production
 * project, the lab path names labs, labs name a counterpart and a domain,
 * projects name a roadmap. Nothing in the type system connects them, so a
 * rename breaks a link silently and the page renders with a gap rather than an
 * error.
 *
 * This also reports orphans — content that exists and is reachable from
 * nothing — which is not an error but is almost always an oversight.
 *
 * Run: node scripts/check-references.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CONTENT = "content";
const errors = [];
const warnings = [];

const fail = (where, msg) => errors.push(`${where}  ${msg}`);
const warn = (where, msg) => warnings.push(`${where}  ${msg}`);

/** Minimal frontmatter reader — CRLF-safe, which matters on this repo. */
function frontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const data = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const scalar = line.match(/^([a-zA-Z][\w]*):\s*(.*)$/);
    const item = line.match(/^\s+-\s*(.+)$/);
    if (scalar) {
      key = scalar[1];
      const value = scalar[2].trim();
      if (value === "") data[key] = [];
      else if (value.startsWith("[")) {
        data[key] = value.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      } else data[key] = value.replace(/^["']|["']$/g, "");
    } else if (item && key) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(item[1].trim().replace(/^["']|["']$/g, ""));
    }
  }
  return data;
}

// ── Load ──────────────────────────────────────────────────────────────────
const chapters = new Map();
for (const domain of readdirSync(join(CONTENT, "learn"), { withFileTypes: true })) {
  if (!domain.isDirectory()) continue;
  for (const name of readdirSync(join(CONTENT, "learn", domain.name))) {
    if (!name.endsWith(".en.mdx")) continue;
    const file = join(CONTENT, "learn", domain.name, name);
    const fm = frontmatter(readFileSync(file, "utf8"));
    if (!fm?.contentId) { fail(file, "no contentId"); continue; }
    if (chapters.has(fm.contentId)) fail(file, `duplicate contentId "${fm.contentId}"`);
    chapters.set(fm.contentId, { ...fm, file, domain: domain.name });
  }
}

const labs = new Map();
for (const name of readdirSync(join(CONTENT, "labs"))) {
  if (!name.endsWith(".en.mdx")) continue;
  const file = join(CONTENT, "labs", name);
  const fm = frontmatter(readFileSync(file, "utf8"));
  if (!fm?.labId) { fail(file, "no labId"); continue; }
  if (labs.has(fm.labId)) fail(file, `duplicate labId "${fm.labId}"`);
  labs.set(fm.labId, { ...fm, file });
}

const projects = new Map();
for (const name of readdirSync(join(CONTENT, "projects"))) {
  if (!name.endsWith(".json")) continue;
  const p = JSON.parse(readFileSync(join(CONTENT, "projects", name), "utf8"));
  projects.set(p.id, { ...p, file: join(CONTENT, "projects", name) });
}

const roadmaps = new Map();
for (const name of readdirSync(join(CONTENT, "roadmaps"))) {
  if (!name.endsWith(".json")) continue;
  const r = JSON.parse(readFileSync(join(CONTENT, "roadmaps", name), "utf8"));
  roadmaps.set(r.id ?? name.replace(".json", ""), { ...r, file: join(CONTENT, "roadmaps", name) });
}

const path = JSON.parse(readFileSync(join(CONTENT, "labs", "path.json"), "utf8"));

// ── Chapter → chapter ─────────────────────────────────────────────────────
for (const [id, c] of chapters) {
  for (const key of ["prerequisites", "relatedChapters"]) {
    for (const ref of c[key] ?? []) {
      if (!chapters.has(ref)) fail(c.file, `${key} references unknown chapter "${ref}"`);
      if (ref === id) fail(c.file, `${key} references itself`);
    }
  }
  const stem = c.file.split(/[\\/]/).pop().replace(/\.[a-z]{2}\.mdx$/, "");
  if (stem !== id) fail(c.file, `filename "${stem}" must equal contentId "${id}"`);
}

// ── Roadmap → chapter, project ────────────────────────────────────────────
const chaptersInRoadmaps = new Set();
for (const [id, r] of roadmaps) {
  const seen = [];
  for (const phase of r.phases ?? []) {
    for (const ref of phase.chapters ?? []) {
      seen.push(ref);
      if (!chapters.has(ref)) fail(r.file, `phase "${phase.id}" references unknown chapter "${ref}"`);
      chaptersInRoadmaps.add(ref);
    }
  }
  const dupes = [...new Set(seen.filter((c, i) => seen.indexOf(c) !== i))];
  if (dupes.length) fail(r.file, `chapter listed twice: ${dupes.join(", ")}`);

  const pp = r.productionProject;
  if (!pp) fail(r.file, "no productionProject");
  else if (!projects.has(pp.id)) fail(r.file, `productionProject "${pp.id}" is not a project`);
}

// ── Lab path → labs ───────────────────────────────────────────────────────
const labsInPath = new Set();
for (const phase of path.phases) {
  for (const ref of phase.labs) {
    if (!labs.has(ref)) fail("content/labs/path.json", `phase "${phase.id}" references unknown lab "${ref}"`);
    if (labsInPath.has(ref)) fail("content/labs/path.json", `lab listed twice: "${ref}"`);
    labsInPath.add(ref);
  }
}

// ── Lab → lab ─────────────────────────────────────────────────────────────
for (const [id, l] of labs) {
  for (const key of ["challengeId", "guidedLabId"]) {
    const ref = l[key];
    if (ref && !labs.has(ref)) fail(l.file, `${key} references unknown lab "${ref}"`);
  }
  if (l.challengeId && labs.get(l.challengeId)?.guidedLabId !== id) {
    warn(l.file, `challenge "${l.challengeId}" does not point back at this lab`);
  }
  const stem = l.file.split(/[\\/]/).pop().replace(/\.[a-z]{2}\.mdx$/, "");
  if (stem !== id) fail(l.file, `filename "${stem}" must equal labId "${id}"`);
}

// ── Project → roadmap ─────────────────────────────────────────────────────
for (const [, p] of projects) {
  if (p.roadmap && !roadmaps.has(p.roadmap)) fail(p.file, `roadmap "${p.roadmap}" does not exist`);
}

// ── Orphans ───────────────────────────────────────────────────────────────
const REFERENCE_PHASES = new Set(["reference", "orientation"]);
for (const [id, c] of chapters) {
  if (!chaptersInRoadmaps.has(id) && !REFERENCE_PHASES.has(c.phase)) {
    warn(c.file, `chapter "${id}" is in no roadmap`);
  }
}
for (const [id, l] of labs) {
  if (l.tier === "guided" && !labsInPath.has(id)) warn(l.file, `guided lab "${id}" is not in the project path`);
}
for (const [id, p] of projects) {
  const linked = [...roadmaps.values()].some((r) => r.productionProject?.id === id);
  if (!linked && !p.featured) warn(p.file, `project "${id}" is neither featured nor a roadmap endpoint`);
}

// ── Report ────────────────────────────────────────────────────────────────
console.log(
  `reference check — ${chapters.size} chapters, ${labs.size} labs, ` +
    `${roadmaps.size} roadmaps, ${projects.size} projects`,
);
if (warnings.length) {
  console.log(`\nwarnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  ${w}`);
}
if (errors.length) {
  console.log(`\nerrors (${errors.length}):`);
  for (const e of errors) console.log(`  ${e}`);
  process.exit(1);
}
console.log("\nevery reference resolves");
