/**
 * Topic depth audit (MASTER_PROMPT §5.3).
 *
 * build-topics.mjs decides *whether* a topic ships and *which* chapter explains
 * it. This asks the next question: does that chapter explain it in enough
 * detail to be worth a reader's click?
 *
 * It measures three things per topic:
 *   section  — words under headings that name the topic (a real explanation)
 *   context  — words in paragraphs that mention it (supporting prose)
 *   code     — fenced blocks in those sections (something to actually run)
 *
 * Verdicts:
 *   solid    a dedicated section with substance, and usually code
 *   partial  explained, but briefly — a reader will still have questions
 *   thin     mentioned across chapters with no section of its own
 *   gap      published on labs alone, or the primary chapter is a lookup page
 *
 * Run: node scripts/audit-topics.mjs [area]
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");

const { concepts } = JSON.parse(readFileSync(join(CONTENT, "concepts.json"), "utf8"));
const { areas, topics } = JSON.parse(
  readFileSync(join(CONTENT, "topics.generated.json"), "utf8"),
);

const LOOKUP_PHASES = new Set(["reference", "orientation"]);
const only = process.argv[2];

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

/** contentId -> { meta, body } */
const chapters = new Map();
const learn = join(CONTENT, "learn");
for (const domain of readdirSync(learn, { withFileTypes: true })) {
  if (!domain.isDirectory()) continue;
  for (const file of readdirSync(join(learn, domain.name))) {
    if (!file.endsWith(".en.mdx")) continue;
    const [meta, body] = frontmatter(readFileSync(join(learn, domain.name, file), "utf8"));
    if (meta.contentId) chapters.set(meta.contentId, { meta, body });
  }
}

const words = (text) => (text.match(/\S+/g) ?? []).length;

/** Split a chapter into { level, title, body } sections. */
function sections(body) {
  const out = [];
  const lines = body.split(/\r?\n/);
  let current = { level: 1, title: "(intro)", lines: [] };
  for (const line of lines) {
    const h = line.match(/^(#{2,6})\s+(.*)$/);
    if (h) {
      out.push(current);
      current = { level: h[1].length, title: h[2].trim(), lines: [] };
    } else current.lines.push(line);
  }
  out.push(current);
  return out.map((s) => ({ ...s, body: s.lines.join("\n") }));
}

/**
 * The five sides of a complete explanation.
 *
 * Length is a poor proxy for completeness: a 400-word section can define a
 * thing beautifully and never say how it breaks. These probe the text for the
 * moves a good technical explanation actually makes, so a topic can be marked
 * incomplete for the right reason rather than for being short.
 */
const DIMENSIONS = [
  /** Something runnable: a command, a manifest, a resource block. */
  { label: "usage", test: /```/, blocking: true },
  /**
   * How it goes wrong. The single most common weakness in the corpus was a
   * topic defined well and never shown failing, which is the half a reader
   * needs at 3am.
   */
  {
    label: "failure modes",
    test: /\bfails?\b|\bfailed\b|\bbreaks?\b|common mistake|watch out|the trap|goes wrong|caught out|surprises?\b|forget|outage|incident|\bnever\b|\bwrong\b|danger|silently|\bcannot\b|\bhangs?\b|\bstuck\b|timeout|denied|\bcrash|does nothing|catch(es)? (people|you) out|the problem/i,
    blocking: true,
  },
  /** Why this and not the alternative — the judgement a reader cannot look up. */
  {
    label: "trade-offs",
    test: /\bvs\.?\b|\bversus\b|trade-?off|instead of|when to use|\bprefer\b|the cost of|downside|but not|cheaper|\bchoose\b|rather than|only when|\bunlike\b|the difference between|worth (it|the)|reach for|use it for|is right when|the alternative|right for|use when|best for|not free/i,
    blocking: true,
  },
  // Advisory only — these two are genuinely hard to detect from prose, so they
  // are reported to guide a human read, never used to fail a topic.
  { label: "definition", test: /\bwhat is\b|\bis an?\b|\bmeans\b|\brefers to\b|\bis one or more\b/i },
  {
    label: "mechanism",
    test: /how it works|internally|under the hood|what actually happens|behind the scenes|works by|happens when|step by step|^\d\.\s|──|─▶|-->|▼/im,
  },
];

const results = [];

for (const topic of topics) {
  const concept = concepts.find((c) => c.id === topic.id);
  const patterns = concept.match.map((m) => new RegExp(m, "gi"));
  // Mirrors build-topics.mjs: a heading naming the topic is a signal in itself.
  const titleWords = concept.title
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w.length >= 5 && !["and", "the", "with", "your", "into"].includes(w.toLowerCase()))
    .map((w) => new RegExp(`\\b${w}s?\\b`, "gi"));
  const hit = (text) =>
    [...patterns, ...titleWords].some((re) => ((re.lastIndex = 0), re.test(text)));

  const primaryId = topic.chapters[0];
  const primary = primaryId ? chapters.get(primaryId) : undefined;

  let sectionWords = 0;
  let contextWords = 0;
  let codeBlocks = 0;
  let sectionTitles = [];
  /** Everything the chapter says about this topic, for the dimension probes. */
  let topicText = "";

  if (primary) {
    for (const section of sections(primary.body)) {
      if (hit(section.title)) {
        sectionWords += words(section.body);
        codeBlocks += (section.body.match(/```/g) ?? []).length / 2;
        sectionTitles.push(section.title);
        topicText += `${section.title}\n${section.body}\n`;
      } else {
        for (const para of section.body.split(/\n\s*\n/)) {
          if (hit(para)) {
            contextWords += words(para);
            topicText += `${para}\n`;
          }
        }
      }
    }
  }

  const absent = DIMENSIONS.filter((d) => !d.test.test(topicText));
  const missing = absent.map((d) => d.label);
  const blocking = absent.filter((d) => d.blocking).length;

  const lookupPrimary = primary ? LOOKUP_PHASES.has(primary.meta.phase) : true;

  // Solid means substantial *and* complete: a topic explained at length that
  // never mentions how it fails has not been explained from all sides.
  let verdict;
  if (!primary || lookupPrimary) verdict = "gap";
  else if (sectionWords >= 120) verdict = blocking === 0 ? "solid" : "partial";
  else if (sectionWords > 0 || contextWords >= 150) verdict = "partial";
  else verdict = "thin";

  results.push({
    area: topic.area,
    id: topic.id,
    title: topic.title,
    primary: primaryId ?? "—",
    coverage: topic.coverage,
    sectionWords,
    contextWords,
    codeBlocks,
    labs: topic.labs.length,
    verdict,
    sectionTitles,
    missing,
  });
}

const ICON = { solid: "OK  ", partial: "~   ", thin: "THIN", gap: "GAP " };
const order = { gap: 0, thin: 1, partial: 2, solid: 3 };

for (const area of areas) {
  const rows = results.filter((r) => r.area === area.id);
  if (!rows.length) continue;
  if (only && only !== area.id) continue;

  const weak = rows.filter((r) => r.verdict !== "solid").length;
  console.log(`\n${area.title}  (${rows.length} topics, ${weak} need work)`);
  console.log("  " + "-".repeat(76));

  for (const r of rows.sort((a, b) => order[a.verdict] - order[b.verdict])) {
    console.log(
      `  ${ICON[r.verdict]} ${r.id.padEnd(25)} ${r.primary.padEnd(22)}` +
        `${String(r.sectionWords).padStart(5)}w section ${String(r.contextWords).padStart(4)}w ctx` +
        ` ${r.codeBlocks}code ${r.labs}lab`,
    );
    if (r.missing.length) {
      console.log(`       missing: ${r.missing.join(", ")}`);
    }
    if (r.verdict !== "solid" && r.sectionTitles.length) {
      console.log(`       sections: ${r.sectionTitles.slice(0, 3).join(" / ")}`);
    }
  }
}

const totals = results.reduce((acc, r) => ({ ...acc, [r.verdict]: (acc[r.verdict] ?? 0) + 1 }), {});
console.log(
  `\n${results.length} topics — ` +
    `${totals.solid ?? 0} solid, ${totals.partial ?? 0} partial, ` +
    `${totals.thin ?? 0} thin, ${totals.gap ?? 0} gap`,
);
