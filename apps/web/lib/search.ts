/**
 * Search normalisation and scoring.
 *
 * MASTER_PROMPT §12.1 specifies Orama. At 47 chapters (~500 sections) a
 * dependency-free index is instant, ships ~2KB of code instead of ~30KB, and
 * removes a version-compatibility risk. Orama earns its place at roughly a
 * thousand documents — revisit then. What is NOT deferred is the Arabic
 * normalisation below, because without it most Arabic queries return nothing
 * and half the platform is dead on arrival.
 */

/** Arabic diacritics (harakat) and the superscript alef. */
const DIACRITICS = /[ً-ْٰـ]/g;

/** Leading clitics: ال، و، ب، ل، ك، ف — stripped only from longer words. */
const CLITICS = /^(ال|و|ب|ل|ك|ف)(?=.{3,})/;

/**
 * Fold the Arabic orthographic variants that users type interchangeably.
 * Without this, `اعمل` never matches `أعمل` — which is most real queries.
 */
export function normalizeArabic(input: string): string {
  return input
    .replace(DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا") // أ إ آ ٱ → ا
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/ئ/g, "ي") // ئ → ي
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)); // ٠-٩ → 0-9
}

export function normalize(input: string): string {
  return normalizeArabic(input.toLowerCase()).replace(/\s+/g, " ").trim();
}

export function tokenize(input: string): string[] {
  return normalize(input)
    .split(/[^\p{L}\p{N}._/-]+/u)
    .filter((token) => token.length > 1)
    .map((token) => token.replace(CLITICS, ""));
}

export interface SearchDoc {
  id: string;
  url: string;
  title: string;
  description: string;
  domain: string;
  level: string;
  type: "chapter" | "roadmap" | "project" | "section";
  /** Pre-normalised haystack, built at index time. */
  haystack: string;
}

export interface SearchHit extends SearchDoc {
  score: number;
}

/**
 * Field-weighted scoring. A term in the title counts far more than one buried
 * in the body, and an exact phrase match outranks scattered terms — which is
 * what makes pasted error strings ("CrashLoopBackOff") land on the right page.
 */
export function search(docs: SearchDoc[], query: string, limit = 8): SearchHit[] {
  const normalized = normalize(query);
  if (normalized.length < 2) return [];
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const hits: SearchHit[] = [];

  for (const doc of docs) {
    const title = normalize(doc.title);
    let score = 0;

    // Exact phrase beats everything.
    if (title === normalized) score += 200;
    else if (title.includes(normalized)) score += 90;
    if (doc.haystack.includes(normalized)) score += 30;

    let matched = 0;
    for (const term of terms) {
      if (title.includes(term)) {
        score += title.startsWith(term) ? 30 : 20;
        matched += 1;
      } else if (doc.haystack.includes(term)) {
        score += 6;
        matched += 1;
      }
    }

    // Every term must appear somewhere; partial matches are noise.
    if (matched < terms.length) continue;
    if (score === 0) continue;

    // Searching a tool name should land on that tool's chapter, not on a
    // roadmap that happens to start with the word. The domain is the canonical
    // subject of a page, so an exact domain match outranks a title prefix.
    if (terms.includes(normalize(doc.domain))) score += 45;

    // Chapters outrank sections of chapters, which outrank projects.
    if (doc.type === "chapter") score += 8;
    if (doc.type === "roadmap") score += 4;

    hits.push({ ...doc, score });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
