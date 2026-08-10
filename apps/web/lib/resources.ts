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
  kind: "course" | "playlist" | "channel";
}

let cache: Record<string, Resource[]> | null = null;

function load(): Record<string, Resource[]> {
  if (cache) return cache;
  const file = join(contentRoot(), "resources.json");
  if (!existsSync(file)) return (cache = {});
  const parsed = JSON.parse(readFileSync(file, "utf8")) as {
    domains?: Record<string, Resource[]>;
  };
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
