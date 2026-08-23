import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";

import type { Locale } from "./i18n";

/** Content lives at the repo root (§9.7), outside apps/web. */
export function contentRoot(): string {
  const candidates = [
    resolve(process.cwd(), "..", "..", "content"),
    resolve(process.cwd(), "content"),
  ];
  const found = candidates.find(existsSync);
  if (!found) throw new Error(`content/ not found. Looked in:\n  ${candidates.join("\n  ")}`);
  return found;
}

export type Level = "beginner" | "intermediate" | "advanced" | "expert" | "all";

export interface ChapterMeta {
  contentId: string;
  title: string;
  /** Arabic title. Navigation is localised even where the body is not. */
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  domain: string;
  /**
   * How this chapter relates to the capstone: the capstone is built with it
   * (`core`), it is a valid architecture the capstone did not choose
   * (`alternative`), it is a capability added once the baseline works
   * (`extension`), or it is look-up material outside the ordered path
   * (`reference`). Required on every chapter — `content:lint` enforces it,
   * and `alternative`/`extension` must also explain themselves.
   */
  capstoneRole?: "core" | "alternative" | "extension" | "reference";
  /** Why the capstone went the way it did, shown beside the label. */
  capstoneWhy?: string;
  /**
   * What this chapter contributes to the platform, in the capstone's own terms
   * — "the registry the pipeline pushes to and the cluster pulls from".
   *
   * Every core chapter has declared this from the start and `labs.ts` uses the
   * sibling `capstoneComponent` to build the architecture view, but nothing
   * ever showed the sentence to the person reading the chapter. The whole
   * product promise is that these chapters build one system rather than many
   * tutorials, and this is the line that says so.
   */
  capstonePurpose?: string;
  level: Level;
  type: string;
  phase: string;
  order: number;
  readingTime: number;
  prerequisites: string[];
  relatedChapters: string[];
  objectives: string[];
  status: "complete" | "partial" | "draft";
  translationStatus: "reviewed" | "machine-draft" | "missing";
  sourceFile?: string;
  updated: string;
}

export interface Chapter extends ChapterMeta {
  body: string;
  /** True when `ar` was requested but only `en` exists (§4.4b). */
  fellBackToEnglish: boolean;
}

export interface Phase {
  id: string;
  number: string;
  title: string;
  titleAr: string;
  chapters: string[];
}

export interface Roadmap {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  phases: Phase[];
  reference: string[];
  productionProject: {
    id: string;
    title: string;
    titleAr: string;
    summary: string;
    repo: string;
  };
}

let cachedIndex: ChapterMeta[] | null = null;

/** All chapter metadata, ordered. Cached — the content is static per build. */
export function getAllChapters(): ChapterMeta[] {
  if (cachedIndex) return cachedIndex;

  const learn = join(contentRoot(), "learn");
  const chapters: ChapterMeta[] = [];

  for (const domain of readdirSync(learn, { withFileTypes: true })) {
    if (!domain.isDirectory()) continue;
    for (const file of readdirSync(join(learn, domain.name))) {
      if (!file.endsWith(".en.mdx")) continue;
      const raw = readFileSync(join(learn, domain.name, file), "utf8");
      chapters.push(matter(raw).data as ChapterMeta);
    }
  }

  cachedIndex = chapters.sort((a, b) => a.order - b.order);
  return cachedIndex;
}

export function getRoadmap(): Roadmap {
  const file = join(contentRoot(), "roadmaps", "cloud-devops-engineer.json");
  return JSON.parse(readFileSync(file, "utf8")) as Roadmap;
}

export function getChapterMeta(contentId: string): ChapterMeta | undefined {
  return getAllChapters().find((c) => c.contentId === contentId);
}

/**
 * Load a chapter in the requested locale, falling back to English with an
 * explicit flag — never a silent language switch (§4.4b).
 */
export function getChapter(
  domain: string,
  slug: string,
  locale: Locale,
): Chapter | null {
  const dir = join(contentRoot(), "learn", domain);
  const localized = join(dir, `${slug}.${locale}.mdx`);
  const english = join(dir, `${slug}.en.mdx`);

  const path = existsSync(localized) ? localized : existsSync(english) ? english : null;
  if (!path) return null;

  const { data, content } = matter(readFileSync(path, "utf8"));
  return {
    ...(data as ChapterMeta),
    body: content,
    fellBackToEnglish: locale !== "en" && path === english,
  };
}

/** Ordered neighbours within the roadmap, for prev/next navigation. */
export function getNeighbours(contentId: string): {
  previous?: ChapterMeta;
  next?: ChapterMeta;
} {
  const roadmap = getRoadmap();
  const ordered = roadmap.phases.flatMap((p) => p.chapters);
  const index = ordered.indexOf(contentId);
  if (index === -1) return {};
  const prevId = index > 0 ? ordered[index - 1] : undefined;
  const nextId = index < ordered.length - 1 ? ordered[index + 1] : undefined;
  return {
    previous: prevId ? getChapterMeta(prevId) : undefined,
    next: nextId ? getChapterMeta(nextId) : undefined,
  };
}

/** Domain → colour token (§3.2). Green is reserved for brand and state. */
export const DOMAIN_COLOR: Record<string, string> = {
  linux: "var(--dm-foundation)",
  networking: "var(--dm-foundation)",
  git: "var(--dm-foundation)",
  build: "var(--dm-container)",
  docker: "var(--dm-container)",
  kubernetes: "var(--dm-orchestration)",
  helm: "var(--dm-orchestration)",
  kustomize: "var(--dm-orchestration)",
  terraform: "var(--dm-iac)",
  ansible: "var(--dm-iac)",
  aws: "var(--dm-cloud)",
  jenkins: "var(--dm-cicd)",
  "github-actions": "var(--dm-cicd)",
  nexus: "var(--dm-cicd)",
  gitops: "var(--dm-gitops)",
  argocd: "var(--dm-gitops)",
  observability: "var(--dm-observability)",
  prometheus: "var(--dm-observability)",
  grafana: "var(--dm-observability)",
  logging: "var(--dm-observability)",
  security: "var(--dm-security)",
  // Scanners and gates carry the security colour wherever they appear as a
  // project stack badge; without an entry they fall back to muted grey and
  // read as an afterthought next to the tools they are gating.
  trivy: "var(--dm-security)",
  sonarqube: "var(--dm-security)",
  sre: "var(--dm-platform)",
  cost: "var(--dm-platform)",
  "platform-engineering": "var(--dm-platform)",
  platform: "var(--dm-platform)",
  labs: "var(--dm-platform)",
  troubleshooting: "var(--dm-security)",
  glossary: "var(--dm-foundation)",
  interview: "var(--dm-platform)",
};

export function domainColor(domain: string): string {
  return DOMAIN_COLOR[domain] ?? "var(--clr-text-muted)";
}

/**
 * Localised chapter title.
 *
 * Titles are translated for all 47 chapters even though most bodies are not.
 * Navigation is what an Arabic reader meets first — the Learn page, topic
 * hubs, search, prev/next — and English titles there made the whole
 * experience read as a translated shell. The body still carries its own
 * "not yet translated" banner, so nothing is over-claimed (§4.4b).
 */
export function localizedTitle(chapter: ChapterMeta, locale: Locale): string {
  return locale === "ar" && chapter.titleAr ? chapter.titleAr : chapter.title;
}

export function localizedDescription(chapter: ChapterMeta, locale: Locale): string {
  return locale === "ar" && chapter.descriptionAr
    ? chapter.descriptionAr
    : chapter.description;
}
