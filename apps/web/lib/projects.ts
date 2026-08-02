import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

function contentRoot(): string {
  const candidates = [
    resolve(process.cwd(), "..", "..", "content"),
    resolve(process.cwd(), "content"),
  ];
  const found = candidates.find(existsSync);
  if (!found) throw new Error("content/ not found");
  return found;
}

export interface Author {
  id: string;
  name: string;
  nameAr?: string;
  handle: string;
  headline?: string;
  headlineAr?: string;
  location?: string;
  locationAr?: string;
  bio?: string;
  bioAr?: string;
  avatar?: string;
  links?: Partial<Record<"github" | "linkedin" | "website" | "email", string>>;
  /** `native` = written here; `github` = imported metadata (§ importer). */
  source: "native" | "github";
  role: "maintainer" | "contributor";
}

export interface Project {
  id: string;
  title: string;
  titleAr?: string;
  summary: string;
  summaryAr?: string;
  why?: string;
  author: string;
  repo?: string;
  repoStatus?: "unpublished";
  license: string;
  level: "beginner" | "intermediate" | "advanced";
  featured?: boolean;
  roadmap?: string;
  stack: string[];
  highlights?: string[];
  highlightsAr?: string[];
  decisions?: { question: string; answer: string }[];
  phases?: string[];
  source?: { kind: "github"; stars: number; forks: number; importedAt: string };
  updated: string;
}

function readJsonDir<T>(dir: string): T[] {
  const path = join(contentRoot(), dir);
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(path, f), "utf8")) as T);
}

let projectCache: Project[] | null = null;
let authorCache: Author[] | null = null;

export function getProjects(): Project[] {
  projectCache ??= readJsonDir<Project>("projects").sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return b.updated.localeCompare(a.updated);
  });
  return projectCache;
}

export function getProject(id: string): Project | undefined {
  return getProjects().find((p) => p.id === id);
}

export function getAuthors(): Author[] {
  authorCache ??= readJsonDir<Author>("authors");
  return authorCache;
}

export function getAuthor(id: string): Author | undefined {
  return getAuthors().find((a) => a.id === id);
}

/** All roadmaps, the flagship first. */
export function getRoadmaps() {
  const path = join(contentRoot(), "roadmaps");
  const all = readdirSync(path)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(path, f), "utf8")));
  return all.sort((a, b) =>
    a.id === "cloud-devops-engineer" ? -1 : b.id === "cloud-devops-engineer" ? 1 : 0,
  );
}
