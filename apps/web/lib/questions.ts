import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

function contentRoot(): string {
  const candidates = [resolve(process.cwd(), "..", "..", "content"), resolve(process.cwd(), "content")];
  const found = candidates.find(existsSync);
  if (!found) throw new Error("content/ not found");
  return found;
}

export interface Question {
  id: string;
  question: string;
  answer: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  kind: "conceptual" | "scenario";
  domain: string;
  chapter: string;
  chapterTitle: string;
}

let cache: Question[] | null = null;

/**
 * The question bank, extracted from the chapters (scripts/migrate_questions.py).
 *
 * Deliberately not called "popular": there is no usage data yet, and labelling
 * curated content popular would be a claim the platform cannot support.
 */
export function getQuestions(): Question[] {
  if (cache) return cache;
  const dir = join(contentRoot(), "questions");
  if (!existsSync(dir)) return (cache = []);

  cache = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Question[]);
  return cache;
}

export function getQuestionsForDomain(domain: string): Question[] {
  return getQuestions().filter((q) => q.domain === domain);
}

export function getQuestionsForChapter(contentId: string): Question[] {
  return getQuestions().filter((q) => q.chapter === contentId);
}
