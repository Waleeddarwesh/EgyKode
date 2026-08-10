import { ExternalLink, ListVideo, Mic, PlaySquare, Tv } from "lucide-react";

import type { Resource } from "@/lib/resources";

/**
 * One external reference, rendered the same way everywhere it appears.
 *
 * The metadata shown here is only what could be read from the source page —
 * runtime, video count, and a level where the material itself claims one. A
 * card that guessed "Best for: intermediate" would be inventing a judgement on
 * the author's behalf, and the reader has no way to tell an invented field from
 * a measured one.
 */

export const KIND = {
  course: { icon: PlaySquare, label: "Course" },
  playlist: { icon: ListVideo, label: "Playlist" },
  channel: { icon: Tv, label: "Channel" },
  talk: { icon: Mic, label: "Talk" },
} as const;

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** "6h 07m" reads faster than "367 minutes". */
export function runtime(minutes?: number): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${String(m).padStart(2, "0")}m` : `${h}h`;
}

export function CourseCard({
  resource,
  arabicLabel,
  tags,
}: {
  resource: Resource;
  arabicLabel: string;
  /** Domains this reference covers — shown on the catalogue, not on a topic. */
  tags?: string[];
}) {
  const kind = KIND[resource.kind];
  const KindIcon = kind.icon;
  const isArabic = resource.language === "ar";
  const length = runtime(resource.minutes);

  const facts = [
    resource.by,
    kind.label,
    length,
    resource.videos ? `${resource.videos} videos` : null,
    resource.level,
    hostOf(resource.url),
  ].filter(Boolean) as string[];

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card card-lift group flex h-full items-start gap-3 p-4"
    >
      <KindIcon size={16} aria-hidden className="mt-0.5 shrink-0 text-content-muted" />

      <span className="min-w-0 flex-1">
        <span
          dir={isArabic ? "rtl" : undefined}
          lang={isArabic ? "ar" : undefined}
          className="block font-medium leading-snug text-content"
        >
          {resource.title}
        </span>

        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-content-muted">
          {facts.map((fact, index) => (
            <span key={fact + index} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden>·</span>}
              <span
                dir={index === 0 && isArabic ? "rtl" : undefined}
                lang={index === 0 && isArabic ? "ar" : undefined}
              >
                {fact}
              </span>
            </span>
          ))}
          {isArabic && (
            <span
              className="badge px-1.5 py-0 text-[11px]"
              style={{ background: "var(--clr-surface-active)" }}
            >
              {arabicLabel}
            </span>
          )}
        </span>

        {tags && tags.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="badge border px-1.5 py-0 font-mono text-[11px]">
                {tag}
              </span>
            ))}
          </span>
        )}
      </span>

      <ExternalLink
        size={14}
        aria-hidden
        className="mt-0.5 shrink-0 text-content-muted transition-colors group-hover:text-content"
      />
    </a>
  );
}
