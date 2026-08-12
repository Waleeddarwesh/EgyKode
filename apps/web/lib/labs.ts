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
  successCriteria: string[];
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

export interface LabPath {
  title: string;
  summary: string;
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
