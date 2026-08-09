/**
 * Content linter (MASTER_PROMPT §11.6). Runs in CI; a failure blocks the merge.
 *
 * A content rule that is not enforced by a machine is a rule that decays, so
 * every check here is one that would otherwise rot silently.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");
const MESSAGES = join(ROOT, "apps", "web", "messages");

const DOMAINS = new Set(Object.keys(JSON.parse(readFileSync(join(ROOT, "content", "index.json"), "utf8"))
  .reduce((acc, c) => ({ ...acc, [c.domain]: true }), {})));
const LEVELS = new Set(["beginner", "intermediate", "advanced", "expert", "all"]);
const TYPES = new Set(["concept", "howto", "reference", "lab", "decision", "troubleshooting", "interview", "course"]);
const REQUIRED = ["contentId", "title", "description", "domain", "level", "type", "status"];

// Words that tell a stuck reader the problem is them (§11.6).
const BANNED = /\b(simply|just remember|obviously|as you can see|it'?s easy|trivially)\b/i;

const errors = [];
const warnings = [];

function fail(file, line, message) {
  errors.push(`${file}${line ? `:${line}` : ""}  ${message}`);
}
function warn(file, message) {
  warnings.push(`${file}  ${message}`);
}

// ── 1. Frontmatter ──────────────────────────────────────────────────────────
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return data;
}

const chapters = [];
const learnDir = join(CONTENT, "learn");
for (const domain of readdirSync(learnDir, { withFileTypes: true })) {
  if (!domain.isDirectory()) continue;
  for (const name of readdirSync(join(learnDir, domain.name))) {
    if (!name.endsWith(".mdx")) continue;
    const path = join(learnDir, domain.name, name);
    const file = relative(ROOT, path).replaceAll("\\", "/");
    const raw = readFileSync(path, "utf8");

    const fm = parseFrontmatter(raw);
    if (!fm) {
      fail(file, 1, "missing or malformed frontmatter");
      continue;
    }
    for (const key of REQUIRED) {
      if (!fm[key]) fail(file, 1, `frontmatter missing required field "${key}"`);
    }
    if (fm.domain && !DOMAINS.has(fm.domain)) fail(file, 1, `unknown domain "${fm.domain}"`);
    if (fm.level && !LEVELS.has(fm.level)) fail(file, 1, `unknown level "${fm.level}"`);
    if (fm.type && !TYPES.has(fm.type)) fail(file, 1, `unknown type "${fm.type}"`);
    if (fm.domain && fm.domain !== domain.name) {
      fail(file, 1, `domain "${fm.domain}" does not match directory "${domain.name}"`);
    }
    chapters.push({ file, fm, raw });

    // ── 2. Body rules ───────────────────────────────────────────────────────
    const body = raw.split(/^---$/m).slice(2).join("---");
    let inFence = false;
    body.split(/\r?\n/).forEach((line, i) => {
      const lineNo = i + 1;
      if (line.trimStart().startsWith("```")) {
        // A fence must declare a language so highlighting and copy work.
        if (!inFence && line.trim() === "```") warn(file, `line ${lineNo}: code fence without a language`);
        inFence = !inFence;
        return;
      }
      if (inFence) return;
      if (BANNED.test(line)) {
        warn(file, `line ${lineNo}: banned phrasing — "${line.match(BANNED)[0]}"`);
      }
      // Images must carry alt text.
      const img = line.match(/!\[\s*\]\(/);
      if (img) fail(file, lineNo, "image missing alt text");
    });
  }
}

// ── 3. Cross-references resolve ─────────────────────────────────────────────
const ids = new Set(chapters.map((c) => c.fm.contentId));
for (const { file, raw } of chapters) {
  for (const field of ["prerequisites", "relatedChapters"]) {
    const match = raw.match(new RegExp(`^${field}:\\s*\\[(.*)\\]`, "m"));
    if (!match || !match[1].trim()) continue;
    for (const ref of match[1].split(",").map((s) => s.trim().replace(/"/g, ""))) {
      if (ref && !ids.has(ref)) fail(file, 1, `${field} references unknown contentId "${ref}"`);
    }
  }
}

// ── 4. Roadmap integrity — every roadmap, not just the flagship ─────────────
const roadmapDir = join(CONTENT, "roadmaps");
const placed = new Set();
for (const name of readdirSync(roadmapDir).filter((f) => f.endsWith(".json"))) {
  const file = `content/roadmaps/${name}`;
  const roadmap = JSON.parse(readFileSync(join(roadmapDir, name), "utf8"));
  const refs = [...roadmap.phases.flatMap((p) => p.chapters), ...(roadmap.reference ?? [])];
  for (const id of refs) {
    if (!ids.has(id)) fail(file, null, `references unknown chapter "${id}"`);
    placed.add(id);
  }
  // The core promise is structural (§6.0): a roadmap without a terminal
  // project is a reading list, and must not ship as a roadmap.
  if (!roadmap.productionProject?.title) {
    fail(file, null, "roadmap has no productionProject — every roadmap must end with one");
  }
  // The terminal project must resolve, or "Ends with" links nowhere. Two
  // roadmaps shipped pointing at project ids that did not exist.
  const pid = roadmap.productionProject?.id;
  if (pid && existsSync(join(CONTENT, "projects")) &&
      !readdirSync(join(CONTENT, "projects")).includes(`${pid}.json`)) {
    fail(file, null, `productionProject.id "${pid}" does not match any content/projects file`);
  }
}
for (const id of ids) {
  if (!placed.has(id)) warn("roadmaps", `chapter "${id}" is not placed in any roadmap`);
}

// ── 4b. Projects reference a known author and declare a licence ─────────────
const projectDir = join(CONTENT, "projects");
if (existsSync(projectDir)) {
  const authors = new Set(
    readdirSync(join(CONTENT, "authors"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(join(CONTENT, "authors", f), "utf8")).id),
  );
  for (const name of readdirSync(projectDir).filter((f) => f.endsWith(".json"))) {
    const file = `content/projects/${name}`;
    const project = JSON.parse(readFileSync(join(projectDir, name), "utf8"));
    if (!authors.has(project.author)) fail(file, null, `unknown author "${project.author}"`);
    if (!project.repo && project.repoStatus !== "unpublished") {
      fail(file, null, 'missing repo URL — set one, or mark repoStatus: "unpublished"');
    }
    // Featuring a repo whose licence is unclear is a legal and ethical problem.
    if (project.featured && (!project.license || project.license === "NOASSERTION")) {
      fail(file, null, "featured project has no clear licence");
    }
  }
}

// ── 5. Message catalogue parity (§4.4a) ─────────────────────────────────────
if (existsSync(MESSAGES)) {
  const en = JSON.parse(readFileSync(join(MESSAGES, "en.json"), "utf8"));
  const ar = JSON.parse(readFileSync(join(MESSAGES, "ar.json"), "utf8"));
  for (const key of Object.keys(en)) {
    if (!(key in ar)) fail("messages/ar.json", null, `missing key "${key}"`);
    else if (!String(ar[key]).trim()) fail("messages/ar.json", null, `empty value for "${key}"`);
  }
  for (const key of Object.keys(ar)) {
    if (!(key in en)) fail("messages/en.json", null, `orphan key "${key}" (not in en)`);
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`content lint — ${chapters.length} chapters checked\n`);
if (warnings.length) {
  console.log(`warnings (${warnings.length}):`);
  for (const w of warnings.slice(0, 20)) console.log(`  ${w}`);
  if (warnings.length > 20) console.log(`  … ${warnings.length - 20} more`);
  console.log();
}
if (errors.length) {
  console.log(`errors (${errors.length}):`);
  for (const e of errors.slice(0, 30)) console.log(`  ${e}`);
  if (errors.length > 30) console.log(`  … ${errors.length - 30} more`);
  process.exit(1);
}
console.log("no errors");
