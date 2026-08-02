/**
 * Derive topics from the corpus (MASTER_PROMPT §5.3).
 *
 * A topic is published ONLY when the content genuinely teaches or practises it.
 * Candidates live in content/concepts.json; this counts real references across
 * chapters and labs and drops anything that does not clear the threshold.
 *
 * That constraint is the whole point. Hand-authoring sixty topic pages would
 * make the platform look bigger and *be* emptier — every card would promise
 * material that is not there. Deriving them means the topic count is a
 * measurement of the corpus, and it grows on its own as content is added.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");

// A concept ships when a chapter genuinely teaches it, or a lab practises it.
// Counting mentions alone is not enough: it ranked the glossary first for RBAC
// and a Maven chapter first for DNS, because "resolver" contains "resolv" and a
// glossary repeats every term it defines. What a reader needs from a topic page
// is the chapter that *explains* the topic, so the ranking below scores intent
// (does it have a section about this? is it in that domain?) above frequency.
const MIN_CHAPTERS = 2;
const MIN_HITS = 3;

/**
 * Chapters that catalogue the whole corpus rather than teach one part of it.
 * The glossary defines every term, troubleshooting lists every symptom, and the
 * labs index names every exercise — so they match almost every concept, densely.
 * They stay in the topic's chapter list, but they can never be the chapter a
 * topic page sends the reader to first.
 */
const LOOKUP_PHASES = new Set(["reference", "orientation"]);

/**
 * A topic page is an entry point, so when two chapters explain a concept
 * equally well the gentler one goes first — cluster architecture should open
 * the Kubernetes chapter, not the advanced kubeadm HA chapter.
 */
const LEVEL_ORDER = ["beginner", "intermediate", "advanced", "expert"];

const { areas, concepts } = JSON.parse(readFileSync(join(CONTENT, "concepts.json"), "utf8"));

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

function collect(dir, idKey) {
  const out = [];
  if (!existsSync(dir)) return out;
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const path = join(d, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".en.mdx")) {
        const [meta, body] = frontmatter(readFileSync(path, "utf8"));
        if (!meta[idKey]) continue;
        out.push({
          meta,
          text: body.toLowerCase(),
          // Section headings state what a chapter is *about*; prose only shows
          // what it happens to mention.
          headings: (body.match(/^#{2,6} .*$/gm) ?? []).join("\n").toLowerCase(),
          heading: (meta.title ?? "").toLowerCase(),
          subject: (meta.description ?? "").toLowerCase(),
        });
      }
    }
  };
  walk(dir);
  return out;
}

const chapters = collect(join(CONTENT, "learn"), "contentId");
const labs = collect(join(CONTENT, "labs"), "labId").filter((l) => l.meta.tier === "guided");

const roadmaps = readdirSync(join(CONTENT, "roadmaps"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(CONTENT, "roadmaps", f), "utf8")));

const projectsDir = join(CONTENT, "projects");
const projects = existsSync(projectsDir)
  ? readdirSync(projectsDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(join(projectsDir, f), "utf8")))
  : [];

const published = [];
const rejected = [];

/**
 * A heading that names the topic counts as much as a keyword does. The `match`
 * patterns are written for prose and code (`module "`, `tfstate`), which rarely
 * appear in a heading — so "Modules — reusable infrastructure" scored zero for
 * the Modules topic. Significant words from the topic's own title close that
 * gap; short ones are skipped because the acronyms are already in `match`.
 */
const STOPWORDS = new Set(["and", "the", "with", "your", "into"]);
function titlePatterns(title) {
  return title
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word.length >= 5 && !STOPWORDS.has(word.toLowerCase()))
    .map((word) => new RegExp(`\\b${word}s?\\b`, "gi"));
}

for (const concept of concepts) {
  const patterns = concept.match.map((m) => new RegExp(m, "gi"));
  const named = [...patterns, ...titlePatterns(concept.title)];

  const tally = (haystack, res) => {
    let n = 0;
    for (const re of res) {
      re.lastIndex = 0;
      n += (haystack.match(re) ?? []).length;
    }
    return n;
  };
  /** Body prose: keyword patterns only, so a topic's own title cannot inflate it. */
  const count = (haystack) => tally(haystack, patterns);
  /** Headings and titles: the topic's name counts too. */
  const countNamed = (haystack) => tally(haystack, named);

  const matchedChapters = [];
  let hits = 0;
  for (const { meta, text, headings, heading, subject } of chapters) {
    const local = count(text);
    if (local === 0) continue;

    const teaches = !LOOKUP_PHASES.has(meta.phase);
    // Deliberately keyword-only: the derived title words are loose ("Cluster"),
    // which is fine for finding a section but would let any Kubernetes chapter
    // claim to be *named after* a Kubernetes topic.
    const titled = count(heading) > 0; // the chapter is named after this topic
    const described = count(subject) > 0; // its description lists it
    const sectioned = countNamed(headings) > 0; // it has a section under that name
    const onTopic = meta.domain === concept.domain;

    // 6 the chapter is named after this — the IAM chapter, for the IAM topic
    // 5 its own domain, and its description promises it
    // 4 its own domain, with a section on it
    // 3 a dedicated section, from a neighbouring domain
    // 2 the right domain, discussed in prose
    // 1 a teaching chapter that mentions it in passing
    // 0 a lookup chapter: listed, never explained
    const rank = !teaches
      ? 0
      : titled && onTopic
        ? 6
        : described && onTopic
          ? 5
          : titled || described || sectioned
            ? onTopic
              ? 4
              : 3
            : onTopic
              ? 2
              : 1;

    matchedChapters.push({
      id: meta.contentId,
      domain: meta.domain,
      weight: local,
      rank,
      depth: LEVEL_ORDER.indexOf(meta.level),
    });
    hits += local;
  }

  const matchedLabs = [];
  for (const { meta, text } of labs) {
    let local = 0;
    for (const re of patterns) {
      re.lastIndex = 0;
      local += (text.match(re) ?? []).length;
    }
    if (local > 0) matchedLabs.push({ id: meta.labId, weight: local });
  }

  // Explained by a chapter that owns the subject, or practised in a lab.
  // A pile of passing mentions is not coverage, however large the pile.
  const explained = matchedChapters.some((c) => c.rank >= 2);
  const qualifies =
    explained ||
    matchedLabs.length > 0 ||
    (matchedChapters.filter((c) => c.rank >= 1).length >= MIN_CHAPTERS && hits >= MIN_HITS);

  if (!qualifies) {
    rejected.push({ id: concept.id, chapters: matchedChapters.length, labs: 0, hits });
    continue;
  }

  // Intent first, frequency only as the tie-break within a rank.
  matchedChapters.sort(
    (a, b) => b.rank - a.rank || a.depth - b.depth || b.weight - a.weight,
  );
  matchedLabs.sort((a, b) => b.weight - a.weight);

  const chapterIds = matchedChapters.slice(0, 8).map((c) => c.id);
  const relatedRoadmaps = roadmaps
    .filter((r) => r.phases.some((p) => p.chapters.some((id) => chapterIds.includes(id))))
    .map((r) => r.id);
  const relatedProjects = projects
    .filter((p) => p.stack?.includes(concept.domain))
    .map((p) => p.id);

  published.push({
    id: concept.id,
    area: concept.area,
    domain: concept.domain,
    title: concept.title,
    titleAr: concept.titleAr,
    // How well the corpus actually covers this, so a thin topic can say so
    // instead of promising a chapter that only mentions it in passing.
    coverage: explained ? "explained" : matchedLabs.length ? "practised" : "mentioned",
    chapters: chapterIds,
    labs: matchedLabs.slice(0, 8).map((l) => l.id),
    roadmaps: relatedRoadmaps,
    projects: relatedProjects,
  });
}

writeFileSync(
  join(CONTENT, "topics.generated.json"),
  JSON.stringify({ areas, topics: published }, null, 2),
  "utf8",
);

console.log(
  `topics: ${published.length} published of ${concepts.length} candidates ` +
    `(${rejected.length} lacked material)`,
);
const byArea = published.reduce((acc, t) => ({ ...acc, [t.area]: (acc[t.area] ?? 0) + 1 }), {});
for (const area of areas) {
  if (byArea[area.id]) console.log(`  ${area.title.padEnd(26)} ${byArea[area.id]}`);
}
if (rejected.length) {
  console.log(`\n  not published (add content, then they appear on their own):`);
  for (const r of rejected.slice(0, 12)) {
    console.log(`    ${r.id.padEnd(28)} ${r.chapters} chapter(s), ${r.hits} mention(s)`);
  }
}
