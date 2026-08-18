import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";

import type { Locale } from "./i18n";

function contentRoot(): string {
  const candidates = [resolve(process.cwd(), "..", "..", "content"), resolve(process.cwd(), "content")];
  const found = candidates.find(existsSync);
  if (!found) throw new Error("content/ not found");
  return found;
}

/**
 * Three tiers, not two.
 *
 *   guided    — follow the steps
 *   challenge — same objective, steps removed
 *   incident  — something is already broken; find out why
 *
 * The incident tier is the one closest to the job. "Create an Ingress" is an
 * exercise; "the app returns 502 and you have cluster access" is a Tuesday.
 */
export type LabTier = "guided" | "challenge" | "incident";

/**
 * A success criterion, and what backs it up.
 *
 * Most criteria are plain strings — the learner asserts them. Where the text
 * itself names the evidence, the object form records which kind:
 *
 *   command    a command whose output settles it
 *   state      an observable property of the running system
 *   reasoning  an explanation, which no command can check
 *
 * Anything unmarked is self-assessed, and the UI says so rather than implying
 * a verification that never happened.
 */
export type LabCriterion =
  | string
  | { text: string; verify: "command" | "state" | "reasoning" };

export interface LabMeta {
  labId: string;
  title: string;
  description: string;
  domain: string;
  level: "beginner" | "intermediate" | "advanced" | "expert" | "all";
  phase: string;
  order: number;
  tier: LabTier;
  estimatedMinutes: number;
  /** True when the lab provisions billable cloud resources (§6.4). */
  cloudCost: boolean;
  /**
   * How much financial care this lab needs, at a glance.
   *
   * A single "creates billable resources" warning treats a $0.40 secret and a
   * $73/month EKS control plane identically, so learners stop reading it. Three
   * tiers keep the loud one loud.
   */
  costTier?: "free" | "low" | "billable";
  /**
   * What running this actually costs, in the reader's terms — "Free tier",
   * "under $0.10", "billable: NAT Gateway ~$0.045/hour". A learner who leaves
   * a NAT Gateway running overnight because a lab never mentioned it has been
   * failed by the lab, not by AWS.
   */
  costEstimate?: string;
  /** How to destroy everything this lab created. Required when cloudCost. */
  cleanup?: string[];
  /**
   * The lab deletes resources or data as part of the exercise — a dropped
   * table, a killed node, a destroyed cluster. Distinct from `cloudCost`:
   * money is recoverable, a database is not. The UI warns louder for this,
   * and it must never be run against anything that matters.
   */
  destructive?: boolean;
  /** Concrete capabilities proved, for the topic index and for a CV. */
  skills?: string[];
  /** Tools and versions the lab expects. */
  tools?: string[];
  successCriteria: LabCriterion[];
  /**
   * Where this lab can actually be performed.
   *
   * Three peers, not one primary with fallbacks. A lab can legitimately offer
   * all three at once — Kubernetes Workloads runs in a sandbox, on a local
   * kind cluster, and on EKS — and an earlier shape that treated Killercoda as
   * the main concept could not express that without contorting.
   *
   * Every option is absent by default. Absent means "not offered", never
   * "broken": a lab whose subject is IAM has nothing to apologise for by
   * requiring AWS.
   *
   * EgyKode stays static throughout. `online` is a link, `local` is a set of
   * requirements the learner's own machine satisfies, and `cloud` is their
   * account. Nothing here provisions anything.
   */
  handsOn?: {
    /** A hosted sandbox. Free, zero install, and not available for every lab. */
    online?: {
      platform: "killercoda";
      enabled: boolean;
      /**
       * Full https://killercoda.com/… URL, validated by content lint.
       *
       * Optional so a lab can carry `enabled: false` while its scenario exists
       * in `killercoda/` but is unpublished. A URL is written only once it has
       * been opened and confirmed — an invented one renders a button that
       * takes a learner nowhere, which is worse than no button.
       */
      url?: string;
    };
    /**
     * The learner's own machine. Broadest coverage of the three, because a
     * local kind cluster can have as many nodes as it likes and a local VM has
     * a real init system.
     *
     * `tools` and `capabilities` are what `npm run doctor` evaluates, so the
     * lab stays the source of truth — encoding "the Kubernetes labs need kind"
     * inside the tool would put that fact in two places and guarantee drift.
     */
    local?: {
      enabled: boolean;
      /** Compose profile that provides it: base, multinode, k8s, cicd… */
      environment?: string;
      tools?: string[];
      capabilities?: string[];
      /**
       * What differs from the lab text when run locally, in the learner's
       * words rather than ours.
       *
       * Many labs are written against the EKS cluster the AWS phase builds,
       * but their *subject* — Argo CD, Helm, Prometheus — is portable and runs
       * on a local kind cluster unchanged. Offering a local path for those is
       * only honest if the page also says what to substitute, and where the
       * local run genuinely stops short.
       *
       * This matters most where a local run *appears* to succeed: kind's
       * default CNI accepts NetworkPolicy objects and enforces none of them,
       * so a learner would tick "traffic is blocked" having blocked nothing.
       */
      note?: string;
    };
    /** Real infrastructure, when the platform itself is the subject. */
    cloud?: {
      enabled: boolean;
      platform: "aws";
      /** Always true today; explicit so the UI never implies we pay for it. */
      requiresOwnAccount: boolean;
    };
  };
  /**
   * Somebody else's scenarios on the same tool, for extra repetition.
   *
   * Deliberately not part of `handsOn`, and deliberately settling no
   * criterion. A vendor scenario teaches its tool against its own sample app;
   * an EgyKode lab advances one continuous platform. A learner who completes
   * the Argo CD collection has practised Argo CD and has not deployed the
   * cluster this lab is about — so inviting them to tick this lab's criteria
   * afterwards would credit work they did not do.
   *
   * These are outbound links to content nobody here controls, and no automated
   * check can tell a live Killercoda URL from a dead one. Every entry is added
   * only after someone has opened it.
   */
  relatedPractice?: { title: string; url: string; note?: string }[];
  challengeId?: string;
  guidedLabId?: string;
  /** The incident variant of this lab, where one exists. */
  incidentId?: string;
  sourceFile?: string;
  /** Every lab's frontmatter carries this; it feeds `dateModified` in JSON-LD. */
  updated?: string;
}

export interface Lab extends LabMeta {
  body: string;
  fellBackToEnglish: boolean;
}

let cache: LabMeta[] | null = null;

export function getAllLabs(): LabMeta[] {
  if (cache) return cache;
  const dir = join(contentRoot(), "labs");
  if (!existsSync(dir)) return (cache = []);

  cache = readdirSync(dir)
    .filter((f) => f.endsWith(".en.mdx"))
    .map((f) => matter(readFileSync(join(dir, f), "utf8")).data as LabMeta)
    .sort((a, b) => a.order - b.order || a.tier.localeCompare(b.tier));
  return cache;
}

/**
 * Guided labs only — challenges and incidents are reached from their lab
 * rather than listed alongside it, so the index stays one entry per skill.
 */
/**
 * Cost tier, falling back to something sensible for labs authored before the
 * field existed: no cloud resources is free, and anything the author flagged
 * as billable stays billable until someone says otherwise.
 */
export function costTierOf(lab: LabMeta): "free" | "low" | "billable" {
  if (lab.costTier) return lab.costTier;
  return lab.cloudCost ? "billable" : "free";
}

export function getGuidedLabs(): LabMeta[] {
  return getAllLabs().filter((lab) => lab.tier === "guided");
}

export function getLabsForDomain(domain: string): LabMeta[] {
  return getGuidedLabs().filter((lab) => lab.domain === domain);
}

export function getLabMeta(labId: string): LabMeta | undefined {
  return getAllLabs().find((lab) => lab.labId === labId);
}

export function getLab(labId: string, locale: Locale): Lab | null {
  const dir = join(contentRoot(), "labs");
  const localized = join(dir, `${labId}.${locale}.mdx`);
  const english = join(dir, `${labId}.en.mdx`);
  const path = existsSync(localized) ? localized : existsSync(english) ? english : null;
  if (!path) return null;

  const { data, content } = matter(readFileSync(path, "utf8"));
  return {
    ...(data as LabMeta),
    body: content,
    fellBackToEnglish: locale !== "en" && path === english,
  };
}

/**
 * True when this lab has no translation for the locale, so its title and
 * description are English strings. Rendering those in an RTL container without
 * pinning direction produces ".Terraform (>= 1.6)" — the bidi algorithm moves
 * neutral punctuation to what it believes is the end of the line.
 */
export function labNeedsLtr(labId: string, locale: Locale): boolean {
  if (locale === "en") return false;
  return !existsSync(join(contentRoot(), "labs", `${labId}.${locale}.mdx`));
}

/**
 * The Project Path — one continuous build, laid over the existing labs.
 *
 * The lab index sorts by `order`, which accumulated collisions as labs were
 * added (Terraform Fundamentals landed sixth, after the VPC and EKS labs that
 * depend on it). Rather than renumber ids that appear in URLs, the sequence
 * lives in content/labs/path.json as data: what order the labs make sense in,
 * and why each phase exists at all.
 */
export interface LabPhase {
  id: string;
  number: string;
  title: string;
  why: string;
  milestone: string;
  labs: string[];
}

/**
 * The platform the path is building toward.
 *
 * The site's promise is one production platform rather than a catalogue, so
 * the path has to arrive somewhere. Every roadmap already carries the same
 * block, and both routes point at the same project — a reader who came through
 * the labs and a reader who came through a roadmap end up in the same place.
 */
export interface LabPathProject {
  id: string;
  title: string;
  titleAr: string;
  summary: string;
  summaryAr: string;
  repo: string;
}

/** A node in the dependency graph: what a lab leaves behind, and what it needs. */
export interface LabGraphNode {
  produces: string[];
  requires: string[];
}

export interface LabPath {
  title: string;
  summary: string;
  /**
   * What each lab contributes to the platform, and which earlier labs produced
   * the things it consumes. An edge is a real dependency rather than "the
   * previous lab", which is what makes it worth showing: the ordering is
   * already visible, the reason is not.
   */
  graph?: Record<string, LabGraphNode>;
  /**
   * The same platform with the files removed, offered ahead of the reference
   * implementation. The site promises "you build it, phase by phase", and a
   * link to a finished repository is not that — it is the answer key. Both are
   * shown, in that order: derive it first, check yourself second.
   */
  guidedBuild?: LabPathProject;
  productionProject?: LabPathProject;
  phases: LabPhase[];
}

let pathCache: LabPath | null = null;

export function getLabPath(): LabPath | null {
  if (pathCache) return pathCache;
  const file = join(contentRoot(), "labs", "path.json");
  if (!existsSync(file)) return null;
  pathCache = JSON.parse(readFileSync(file, "utf8")) as LabPath;
  return pathCache;
}

/** Phases with their labs resolved, dropping any id that no longer exists. */
export function getResolvedPath(): { phase: LabPhase; labs: LabMeta[] }[] {
  const path = getLabPath();
  if (!path) return [];
  const byId = new Map(getAllLabs().map((lab) => [lab.labId, lab]));

  return path.phases.map((phase) => ({
    phase,
    labs: phase.labs
      .map((id) => byId.get(id))
      .filter((lab): lab is LabMeta => Boolean(lab)),
  }));
}

/** One lab's place in the build: what it adds, and what that lets you do. */
export interface LabContribution {
  /** What exists after this lab that did not before. */
  produces: string[];
  /** Earlier labs whose output this one consumes. */
  requires: { labId: string; title: string }[];
  /** Later labs that consume this one's output — the reverse edges. */
  unlocks: { labId: string; title: string }[];
  /** The phase and position, so this block does not depend on path lookup. */
  phaseNumber: string;
  phaseTitle: string;
  position: number;
  total: number;
  /** True when these edges came from the guided pair rather than this lab. */
  viaPair: boolean;
}

/**
 * Resolve a lab's dependency edges from the graph in path.json.
 *
 * `unlocks` is derived rather than stored: it is exactly the reverse of
 * `requires`, and storing both would mean two places to update and one of them
 * eventually wrong. The graph is small enough that scanning it costs nothing,
 * and it is read once per build.
 *
 * A challenge inherits its guided pair's contribution. It is not a different
 * step in the build — it is the same step with the instructions removed, and
 * it produces exactly the same thing. Without this fallback, half the lab
 * pages on the site would say where they fit and half would say nothing,
 * which is the inconsistency a reader notices first.
 */
export function getLabContribution(labId: string): LabContribution | null {
  const path = getLabPath();
  if (!path?.graph) return null;

  // Fall back to the guided pair for a challenge.
  const meta = getLabMeta(labId);
  const sourceId = path.graph[labId] ? labId : meta?.guidedLabId;
  const node = sourceId ? path.graph[sourceId] : undefined;
  if (!sourceId || !node) return null;

  const order = path.phases.flatMap((p) => p.labs);
  const phase = path.phases.find((p) => p.labs.includes(sourceId));
  if (!phase) return null;

  const titleOf = (id: string) => getLabMeta(id)?.title ?? id;

  return {
    produces: node.produces ?? [],
    requires: (node.requires ?? []).map((id) => ({ labId: id, title: titleOf(id) })),
    unlocks: Object.entries(path.graph)
      .filter(([, other]) => other.requires?.includes(sourceId))
      .map(([id]) => ({ labId: id, title: titleOf(id) })),
    phaseNumber: phase.number,
    phaseTitle: phase.title,
    position: order.indexOf(sourceId) + 1,
    total: order.length,
    viaPair: sourceId !== labId,
  };
}

export interface PathNeighbours {
  previous?: { lab: LabMeta; phase: LabPhase };
  next?: { lab: LabMeta; phase: LabPhase };
  /** The phase the *current* lab sits in, so a page can say where you are. */
  phase: LabPhase;
  /** 1-based position across the whole path, for "12 of 58". */
  position: number;
  total: number;
  /** True when `next` opens a phase the current lab is not in. */
  entersNewPhase: boolean;
  /** Set when this is the last lab of its phase — the phase's milestone. */
  completesPhase?: LabPhase;
}

/**
 * Where a lab sits in the Project Path, and what comes next.
 *
 * The path is the sequence, not the `order` frontmatter — `order` had
 * accumulated collisions and describes a lab's slot within its domain, which is
 * a different question from what a learner should open next.
 *
 * Challenge labs are not listed in the path; they resolve through their guided
 * counterpart, so someone working only in challenge mode still moves forward
 * rather than hitting a dead end at the bottom of every page.
 */
export function getPathNeighbours(labId: string): PathNeighbours | null {
  const resolved = getResolvedPath();
  if (!resolved.length) return null;

  const flat = resolved.flatMap(({ phase, labs }) => labs.map((lab) => ({ lab, phase })));

  let index = flat.findIndex((entry) => entry.lab.labId === labId);
  let viaCounterpart = false;

  if (index === -1) {
    const guided = getLabMeta(labId)?.guidedLabId;
    if (!guided) return null;
    index = flat.findIndex((entry) => entry.lab.labId === guided);
    if (index === -1) return null;
    viaCounterpart = true;
  }

  const current = flat[index]!;
  const previous = index > 0 ? flat[index - 1] : undefined;
  const next = index < flat.length - 1 ? flat[index + 1] : undefined;

  return {
    // A challenge sits *at* its guided lab's position, so its own guided
    // counterpart is not a useful "previous" — that link already exists above.
    previous: viaCounterpart ? undefined : previous,
    next,
    phase: current.phase,
    position: index + 1,
    total: flat.length,
    entersNewPhase: Boolean(next && next.phase.id !== current.phase.id),
    completesPhase: next && next.phase.id !== current.phase.id ? current.phase : undefined,
  };
}

/**
 * The architecture, projected from the chapters' own capstone mappings.
 *
 * Each build phase maps to a capstone phase; the components of that phase are
 * whatever the core chapters declared in `capstoneComponent`. That keeps this
 * a *view* of the canonical mapping rather than a second architecture to
 * maintain — add a chapter with a new component and it appears here.
 */
const BUILD_TO_CAPSTONE: Record<string, string> = {
  foundations: "foundations",
  containers: "application",
  cloud: "aws",
  iac: "infrastructure",
  config: "infrastructure",
  kubernetes: "kubernetes",
  packaging: "kubernetes",
  cicd: "delivery",
  gitops: "gitops",
  observability: "observability",
  operations: "operations",
};

/** Components that name the chapter's own genre rather than a platform part. */
const NOT_A_COMPONENT = new Set(["orientation"]);

export interface ArchitectureLayer {
  phaseId: string;
  label: string;
  nodes: string[];
}

export function getArchitectureLayers(
  componentsByCapstonePhase: Record<string, string[]>,
): ArchitectureLayer[] {
  const path = getLabPath();
  if (!path) return [];
  const seen = new Set<string>();

  return path.phases.flatMap((phase): ArchitectureLayer[] => {
    const capstonePhase = BUILD_TO_CAPSTONE[phase.id];
    const all: string[] = capstonePhase ? (componentsByCapstonePhase[capstonePhase] ?? []) : [];
    // A capstone phase can back two build phases (iac/config, kubernetes/
    // packaging). Show each component once, at the first phase that builds it.
    const nodes = all.filter((n: string) => !NOT_A_COMPONENT.has(n) && !seen.has(n));
    nodes.forEach((n: string) => seen.add(n));
    return nodes.length ? [{ phaseId: phase.id, label: phase.title, nodes }] : [];
  });
}

/**
 * Split a lab body into its mission and the work that follows.
 *
 * Every lab opens with one section that says what the task is — "The scenario"
 * on a guided lab, "The goal" on a challenge, "The incident" on an incident —
 * and the rest is the procedure. Splitting at the second top-level heading
 * lets the page put the success criteria between them, so a reader learns what
 * they are doing before being told what they must prove.
 *
 * The scan tracks fences, because a `## ` inside a code block is a shell
 * comment, not a heading, and cutting there would split a snippet in half.
 */
export function splitLabMission(body: string): { mission: string; rest: string } {
  const lines = body.split(/\r?\n/);
  let inFence = false;
  let seen = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    // The work begins at the first step, whatever the headings do.
    //
    // Splitting purely on the second `##` broke labs whose steps *were* the
    // `##` headings: once converted to components, the only headings left were
    // "The scenario" and "Troubleshooting", so the split landed at the end and
    // every step rendered inside the mission — above the hands-on panel, and
    // invisible to the progress rail, which reads what comes after the split.
    if (/^\s*<LabStep\b/.test(line)) {
      return { mission: lines.slice(0, i).join("\n").trimEnd(), rest: lines.slice(i).join("\n") };
    }
    if (/^## +\S/.test(line)) {
      seen += 1;
      if (seen === 2) {
        return { mission: lines.slice(0, i).join("\n").trimEnd(), rest: lines.slice(i).join("\n") };
      }
    }
  }
  // One section only: it is all mission, and there is nothing to hoist above.
  return { mission: "", rest: body };
}

/** A top-level section of a lab body, for the progress rail. */
export interface LabStep {
  /** Matches the id rehype-slug generates, so the rail can link to it. */
  id: string;
  title: string;
  /** 2 for a section, 3 for a step inside one — the rail indents the latter. */
  depth: 2 | 3;
}

/**
 * The `##` sections of a lab, in order.
 *
 * A long lab is several thousand pixels tall and gave the reader nothing to
 * hold their place — the only way to know how far through the work you were
 * was to scroll. These feed a rail that tracks position.
 *
 * Slugs are generated the same way rehype-slug does (lowercase, non-word runs
 * to hyphens) so the rail's links resolve against the ids already in the DOM,
 * and fenced blocks are skipped for the same reason as the mission split.
 */
export function getLabSteps(body: string): LabStep[] {
  const steps: LabStep[] = [];
  const seen = new Map<string, number>();
  let inFence = false;

  for (const raw of body.split(/\r?\n/)) {
    if (/^\s*(?:```|~~~)/.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    // A step written as a component rather than a heading.
    //
    // `<LabStep>` renders its own heading, so there is no `###` line for this
    // loop to find — a lab converted to the component form would have silently
    // lost every entry in its rail, leaving a reader with no sense of where
    // they were in exactly the labs meant to be easiest to follow.
    //
    // The id matches the `step-N` anchor LabStep renders, so the rail scrolls
    // to the right place.
    const component = raw.match(/^\s*<LabStep\s+n=\{(\d+)\}\s+title="([^"]+)"/);
    if (component?.[1] && component[2]) {
      steps.push({ id: `step-${component[1]}`, title: component[2], depth: 3 });
      continue;
    }

    // The troubleshooting section is a component too, for the same reason.
    if (/^\s*<Troubleshooting/.test(raw)) {
      steps.push({ id: "troubleshooting", title: "Troubleshooting & Incidents", depth: 2 });
      continue;
    }

    // Both levels: some labs number their steps as `##`, others put them as
    // `###` under a single `## The work`. Taking only `##` gave the second
    // shape a two-item rail that said nothing about where you were.
    const heading = raw.match(/^(##|###) +(.+?)\s*$/);
    if (!heading?.[2]) continue;
    const depth = heading[1]?.length === 3 ? 3 : 2;

    // Strip the inline markup a heading may carry before slugging it.
    const title = heading[2].replace(/[*_`]/g, "").trim();
    const base = title
      .toLowerCase()
      .replace(/[^\w؀-ۿ\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "-");

    // rehype-slug appends -1, -2 … to repeats; mirror that or the rail will
    // send two different steps to the same place.
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    steps.push({ id: n === 0 ? base : `${base}-${n}`, title, depth });
  }

  /**
   * Once a lab has steps, the rail shows only those.
   *
   * A converted lab still has section headings around the steps — "The work",
   * "What you built" — and listing them alongside put entries in the rail that
   * are not steps and cannot be completed. On screen that read as a step whose
   * circle never fills, sitting between two that do.
   *
   * Troubleshooting survives the filter: it is a real destination, and the
   * component marks it as reference rather than as work.
   */
  const hasSteps = steps.some((s) => s.id.startsWith("step-"));
  if (!hasSteps) return steps;
  return steps.filter((s) => s.id.startsWith("step-") || s.id === "troubleshooting");
}
