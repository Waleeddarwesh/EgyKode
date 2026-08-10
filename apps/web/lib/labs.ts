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
