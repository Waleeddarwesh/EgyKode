import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { contentRoot } from "@/lib/content";

/**
 * Free external video references, keyed by domain.
 *
 * Deliberately not per topic: a channel covers "Kubernetes", not
 * "kubernetes-networkpolicy". Keying by domain means one entry serves the
 * domain hub, every generated topic under it, and every chapter in it — and
 * there is one place to fix a link when it rots.
 */
export interface Resource {
  title: string;
  url: string;
  /** Who publishes it — a YouTube channel, or an organisation like Mahara-Tech. */
  by: string;
  /** BCP-47 primary subtag. Arabic entries render RTL and are labelled. */
  language: "en" | "ar";
  /** What you are actually opening. A channel is not a course. */
  kind: "course" | "playlist" | "channel" | "talk";
  /** Runtime, read from the page. Absent where the source does not expose it. */
  minutes?: number;
  /** For playlists: how many videos, read from the page. */
  videos?: number;
  /**
   * Only set where the material itself says so — a title containing
   * "for beginners", "crash course", "مقدمة". Deciding a level on no evidence
   * would be putting words in the author's mouth.
   */
  level?: "beginner" | "intermediate" | "advanced";
  /** False when the page is login-gated and its title cannot be read. */
  titleFromPage?: boolean;
  /**
   * Hidden behind the disclosure on the path. For a continuation — Red Hat
   * Administration II after I — which is worth listing but should not compete
   * with the entries a newcomer actually needs first.
   */
  extra?: boolean;
}

/** Every reference, flattened, with the domain it belongs to. */
export function getAllResources(): (Resource & { domain: string })[] {
  const all = load();
  const seen = new Set<string>();
  const out: (Resource & { domain: string })[] = [];
  for (const [domain, list] of Object.entries(all)) {
    for (const resource of list) {
      // The same course can serve several domains — Helm vs Kustomize belongs
      // to both. On a catalogue page it should appear once.
      const key = `${resource.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...resource, domain });
    }
  }
  return out.sort(
    (a, b) =>
      Number(b.language === "ar") - Number(a.language === "ar") ||
      a.domain.localeCompare(b.domain),
  );
}

/** Which domains a given url is listed under, for the catalogue's tags. */
export function domainsFor(url: string): string[] {
  return Object.entries(load())
    .filter(([, list]) => list.some((r) => r.url === url))
    .map(([domain]) => domain);
}

let cache: Record<string, Resource[]> | null = null;
/** Steps the guided path skips — a curation decision, kept in the data. */
let excluded = new Set<string>();
/** Project references, shown as the final step of the path. */
let tail: Resource[] = [];

function load(): Record<string, Resource[]> {
  if (cache) return cache;
  const file = join(contentRoot(), "resources.json");
  if (!existsSync(file)) return (cache = {});
  const parsed = JSON.parse(readFileSync(file, "utf8")) as {
    domains?: Record<string, Resource[]>;
    excludeFromPath?: string[];
    pathTail?: Resource[];
  };
  excluded = new Set(parsed.excludeFromPath ?? []);
  tail = parsed.pathTail ?? [];
  return (cache = parsed.domains ?? {});
}

/**
 * References for a domain, Arabic first.
 *
 * Arabic leads because it is the scarce half: an English speaker learning
 * Kubernetes has a hundred good options, and a reader who wants it in Arabic
 * usually has one. Burying that under four English channels wastes the entry
 * that is hardest to replace.
 */
export function getResources(domain: string): Resource[] {
  const all = load()[domain] ?? [];
  return [...all].sort((a, b) => Number(b.language === "ar") - Number(a.language === "ar"));
}

export function hasResources(domain: string): boolean {
  return (load()[domain]?.length ?? 0) > 0;
}

export interface PathStep {
  domain: string;
  resources: Resource[];
}

export interface PathPhase {
  number: string;
  title: string;
  steps: PathStep[];
}

/**
 * The course catalogue, ordered the way the curriculum is.
 *
 * Somebody who wants to learn the whole thing in Arabic should not have to
 * work out that Linux comes before Kubernetes — the roadmap already encodes
 * that, so the order is derived from it rather than restated here. Domains
 * with no course yet are kept in the sequence deliberately: a visible gap is
 * more useful than a tidy list that quietly skips a step.
 */
export function getCoursePath(
  roadmap: { phases: { number: string; title: string; chapters?: string[] }[] },
  domainOf: (contentId: string) => string | undefined,
): PathPhase[] {
  const all = load(); // also populates `excluded`
  const seen = new Set<string>();
  const phases: PathPhase[] = [];

  for (const phase of roadmap.phases) {
    const steps: PathStep[] = [];
    for (const contentId of phase.chapters ?? []) {
      const domain = domainOf(contentId);
      if (!domain || seen.has(domain) || excluded.has(domain)) continue;
      seen.add(domain);
      steps.push({ domain, resources: all[domain] ?? [] });
    }
    if (steps.length) phases.push({ number: phase.number, title: phase.title, steps });
  }
  return phases;
}

/**
 * References that close the path.
 *
 * The roadmap ends in a project, so the course path should too — otherwise it
 * stops at "Platform Engineering" and leaves the learner without the step that
 * ties everything together.
 */
export function getPathTail(): Resource[] {
  load();
  return tail;
}
