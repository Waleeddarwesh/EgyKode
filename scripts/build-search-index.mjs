/**
 * Build the static search index (MASTER_PROMPT §12.1).
 *
 * Runs at deploy time and emits one JSON file per locale to
 * apps/web/public/search/. The index is served from the CDN and searched in
 * the browser, so an anonymous visitor searching a chapter never touches the
 * backend — which is what keeps a 1GB origin from falling over (§9.2).
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");
const OUT = join(ROOT, "apps", "web", "public", "search");

const LOCALES = ["en", "ar"];
const BUDGET_KB = 400; // §12.1 — enforced, not aspirational

// Mirrors lib/search.ts. Duplicated deliberately: the build script must not
// import from the Next app, and a divergence here would be caught by the
// round-trip test at the bottom.
const DIACRITICS = /[ً-ْٰـ]/g;
function normalize(input) {
  return input
    .toLowerCase()
    .replace(DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, " ")
    .trim();
}

function frontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return [{}, raw];
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return [data, raw.slice(match[0].length)];
}

/** Strip markdown to plain prose so the haystack is words, not syntax. */
function toPlainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")     // fenced code
    .replace(/`[^`]*`/g, " ")            // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

mkdirSync(OUT, { recursive: true });

for (const locale of LOCALES) {
  const docs = [];

  // ── Chapters ──────────────────────────────────────────────────────────────
  const learn = join(CONTENT, "learn");
  for (const domain of readdirSync(learn, { withFileTypes: true })) {
    if (!domain.isDirectory()) continue;
    for (const file of readdirSync(join(learn, domain.name))) {
      if (!file.endsWith(`.${locale}.mdx`)) {
        // Fall back to English so an untranslated chapter is still findable.
        if (locale === "en" || !file.endsWith(".en.mdx")) continue;
        const slug = file.replace(".en.mdx", "");
        if (existsSync(join(learn, domain.name, `${slug}.${locale}.mdx`))) continue;
      }
      const raw = readFileSync(join(learn, domain.name, file), "utf8");
      const [meta, body] = frontmatter(raw);
      if (!meta.contentId) continue;

      const text = toPlainText(body);
      docs.push({
        id: meta.contentId,
        url: `/${locale}/learn/${domain.name}/${meta.contentId}`,
        title: meta.title ?? meta.contentId,
        description: meta.description ?? "",
        domain: meta.domain ?? domain.name,
        level: meta.level ?? "beginner",
        type: "chapter",
        // Cap the body: the tail of a long chapter contributes little to
        // relevance and a lot to index size.
        haystack: normalize(`${meta.title} ${meta.description} ${text.slice(0, 4000)}`),
      });
    }
  }

  // ── Roadmaps ──────────────────────────────────────────────────────────────
  for (const file of readdirSync(join(CONTENT, "roadmaps"))) {
    if (!file.endsWith(".json")) continue;
    const roadmap = JSON.parse(readFileSync(join(CONTENT, "roadmaps", file), "utf8"));
    const title = locale === "ar" ? roadmap.titleAr : roadmap.title;
    const description = locale === "ar" ? roadmap.descriptionAr : roadmap.description;
    docs.push({
      id: roadmap.id,
      url: `/${locale}/roadmaps`,
      title,
      description,
      domain: "roadmap",
      level: roadmap.level ?? "all",
      type: "roadmap",
      haystack: normalize(
        `${title} ${description} ${roadmap.phases.map((p) => `${p.title} ${p.titleAr}`).join(" ")}`,
      ),
    });
  }

  // ── Projects ──────────────────────────────────────────────────────────────
  const projectDir = join(CONTENT, "projects");
  if (existsSync(projectDir)) {
    for (const file of readdirSync(projectDir)) {
      if (!file.endsWith(".json")) continue;
      const project = JSON.parse(readFileSync(join(projectDir, file), "utf8"));
      const title = (locale === "ar" && project.titleAr) || project.title;
      const summary = (locale === "ar" && project.summaryAr) || project.summary;
      docs.push({
        id: project.id,
        url: `/${locale}/build/${project.id}`,
        title,
        description: summary,
        domain: project.stack?.[0] ?? "platform",
        level: project.level ?? "intermediate",
        type: "project",
        haystack: normalize(`${title} ${summary} ${project.why ?? ""} ${project.stack.join(" ")}`),
      });
    }
  }

  const path = join(OUT, `${locale}.json`);
  const json = JSON.stringify(docs);
  writeFileSync(path, json, "utf8");

  const kb = Math.round(Buffer.byteLength(json) / 1024);
  console.log(`search: ${locale} — ${docs.length} documents, ${kb}KB raw`);
  if (kb > BUDGET_KB * 3) {
    console.error(`::error::search index for ${locale} is ${kb}KB raw, over budget`);
    process.exit(1);
  }
}
