#!/usr/bin/env node
/**
 * Concept integrity audit.
 *
 * The curriculum can pass every lint and still fail the reader: a concept can
 * be introduced once and never practised, practised but never used in the
 * platform, or explained in a chapter nothing downstream depends on. None of
 * that is visible from counting chapters.
 *
 * This traces each concept through the journey it is supposed to make —
 *
 *     introduced -> reinforced -> practised (with evidence) -> used in the
 *     capstone -> met again as a failure
 *
 * — and reports where the chain breaks. Everything is derived from the content
 * itself: the roadmap ordering, chapter capstone mappings, the lab dependency
 * graph and the lab evidence types. Nothing here is written from memory, which
 * is the point; a hand-maintained matrix would be out of date within a week.
 *
 * Run: node scripts/audit-concepts.mjs [--json]
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");

/**
 * The concepts the platform depends on, and how to recognise them in prose.
 *
 * Patterns are deliberately specific. Matching "network" would hit every
 * chapter and prove nothing; the point is to find where a concept is actually
 * being taught, not where the word appears.
 */
const CONCEPTS = {
  processes: /\bprocess(es)?\b.{0,40}\b(PID|daemon|foreground|background)\b|\bPID\b/i,
  signals: /\bSIGTERM\b|\bSIGKILL\b|graceful (shutdown|termination)/i,
  cgroups: /\bcgroups?\b/i,
  // "namespace" is overloaded — a Kubernetes namespace is a different thing
  // from a kernel namespace, and the corpus uses both heavily. Match the
  // kernel sense: the named namespace types, or the word beside "kernel"
  // or "isolation".
  namespaces: /\b(PID|network|mount|UTS|IPC|user) namespaces?\b|\bnamespaces?\b[^.]{0,80}\b(kernel|isolat)|kernel[^.]{0,40}\bnamespaces?\b/i,
  filesystem: /\bfilesystem\b|\bmount point\b|\/etc\/fstab\b|\binode\b/i,
  permissions: /\bchmod\b|\bchown\b|\brunAsUser\b|\bfsGroup\b|least privilege/i,
  networking: /\bCIDR\b|\bsubnet\b|\brouting table\b|\broute table\b|\bDNS\b/i,
  storage: /\bPersistentVolume|\bPVC\b|\bvolume(s)?\b.{0,40}\b(mount|persist)|\bEBS\b/i,
  health: /\breadiness\b|\bliveness\b|\bHEALTHCHECK\b|health (check|probe)/i,
  identity: /\bIAM\b|\bIRSA\b|\bServiceAccount\b|workload identity|\bOIDC\b/i,
  secrets: /\bSecrets? Manager\b|\bKubernetes Secret|\bVault\b|secret (management|scanning|rotation)/i,
  artifacts: /\bimmutable tag|\bdigest\b|\bregistry\b|\bECR\b|\bartifact\b/i,
  git: /\bgit (commit|branch|revert|log)\b|\bpull request\b|\bGitOps\b/i,
  "desired-state": /desired state|\bdeclarative\b|\bidempoten/i,
  reconciliation: /\breconcil|\bdrift\b|\bselfHeal\b|\bsync wave/i,
  observability: /\bPrometheus\b|\bGrafana\b|\bgolden signal|\bmetric(s)?\b.{0,30}\balert/i,
  failure: /\bincident\b|\bpostmortem\b|\bMTTR\b|\bSLO\b|\berror budget\b/i,
  recovery: /\bbackup\b|\brestore\b|\bRTO\b|\bRPO\b|disaster recovery/i,
};

// ── Load the corpus ─────────────────────────────────────────────────────────
const chapters = [];
for (const dir of readdirSync(join(CONTENT, "learn"), { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  for (const file of readdirSync(join(CONTENT, "learn", dir.name))) {
    if (!file.endsWith(".en.mdx")) continue;
    const raw = readFileSync(join(CONTENT, "learn", dir.name, file), "utf8");
    const { data, content } = matter(raw);
    chapters.push({ id: data.contentId, title: data.title, role: data.capstoneRole,
                    phase: data.capstonePhase, text: content });
  }
}

const labs = [];
for (const file of readdirSync(join(CONTENT, "labs")).filter((f) => f.endsWith(".en.mdx"))) {
  const { data, content } = matter(readFileSync(join(CONTENT, "labs", file), "utf8"));
  const evidence = (data.successCriteria ?? []).some(
    (c) => typeof c === "object" && (c.verify === "command" || c.verify === "state"),
  );
  labs.push({ id: data.labId, tier: data.tier, evidence,
              text: `${data.title} ${data.description} ${content}` });
}

// Curriculum order, so "first taught" means first *in the journey*.
const roadmap = JSON.parse(readFileSync(join(CONTENT, "roadmaps", "cloud-devops-engineer.json"), "utf8"));
const order = new Map(roadmap.phases.flatMap((p, pi) => p.chapters.map((c, ci) => [c, pi * 100 + ci])));

// ── Trace each concept ──────────────────────────────────────────────────────
/**
 * Mentioning a concept is not teaching it.
 *
 * Orientation chapters name almost everything in passing, so "first occurrence
 * in the ordered corpus" reported `start-here` for most concepts — true, and
 * useless as a pedagogical answer. A chapter counts as *teaching* a concept
 * when it either gives it a heading or returns to it repeatedly; one mention
 * in a sentence is a reference, not an introduction.
 */
const TEACHES_MIN_MENTIONS = 3;
const teaches = (chapter, pattern) => {
  const headings = chapter.text.match(/^#{2,4} .*$/gm) ?? [];
  if (headings.some((h) => pattern.test(h))) return true;
  const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  return (chapter.text.match(global) ?? []).length >= TEACHES_MIN_MENTIONS;
};

const rows = [];
for (const [concept, pattern] of Object.entries(CONCEPTS)) {
  const mentions = chapters
    .filter((c) => pattern.test(c.text))
    .sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
  const taught = mentions.filter((c) => teaches(c, pattern));

  const inPath = taught.filter((c) => order.has(c.id));
  const first = inPath[0] ?? taught[0];
  const firstMention = mentions.find((c) => order.has(c.id)) ?? mentions[0];
  const practised = labs.filter((l) => pattern.test(l.text));
  const withEvidence = practised.filter((l) => l.evidence);
  const incidents = practised.filter((l) => l.tier === "incident");
  // "Used in the capstone" means a *core* chapter carrying a capstone mapping
  // teaches it — an alternative chapter mentioning it does not count.
  const core = taught.filter((c) => c.role === "core" && c.phase);

  let status;
  if (!first) status = "missing";
  else if (core.length === 0) status = taught.every((c) => c.role === "alternative" || c.role === "extension")
    ? "alternative" : "isolated";
  else if (practised.length === 0) status = "weak";
  else if (withEvidence.length === 0) status = "weak";
  else status = "complete";

  rows.push({
    concept,
    mentioned: firstMention ? firstMention.id : "—",
    first: first ? first.id : "—",
    reinforced: Math.max(0, inPath.length - 1),
    labs: practised.length,
    evidence: withEvidence.length,
    capstone: core.length,
    incidents: incidents.length,
    status,
  });
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  console.log("concept          first taught                first mentioned          labs evid cap inc  status");
  console.log("─".repeat(104));
  for (const r of rows.sort((a, b) => a.status.localeCompare(b.status) || a.concept.localeCompare(b.concept))) {
    console.log(
      `${pad(r.concept, 16)} ${pad(r.first.slice(0, 26), 27)} ${pad(r.mentioned.slice(0, 23), 24)} ` +
      `${pad(r.labs, 4)} ${pad(r.evidence, 4)} ${pad(r.capstone, 3)} ${pad(r.incidents, 4)} ${r.status}`,
    );
  }
  const bad = rows.filter((r) => r.status === "missing" || r.status === "weak" || r.status === "isolated");
  console.log("─".repeat(104));
  console.log(`${rows.length} concepts — ${rows.length - bad.length} complete/alternative, ${bad.length} needing review`);
}

process.exit(0);
