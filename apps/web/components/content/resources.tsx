import { ExternalLink, ListVideo, PlaySquare, Tv } from "lucide-react";

import type { Resource } from "@/lib/resources";

/**
 * Free references from elsewhere.
 *
 * EgyKode teaches by writing and by labs; a lot of people learn faster by
 * watching first. Pointing at the good free material costs nothing and is more
 * honest than pretending this is the only place to learn — someone who follows
 * a link and comes back understands the chapter better.
 *
 * Arabic entries lead, because they are the scarce half. An English speaker
 * learning Kubernetes has a hundred options; a reader who wants it in Arabic
 * usually has one, and burying that under four English channels wastes the
 * entry hardest to replace.
 */

const KIND = {
  course: { icon: PlaySquare, label: "Course" },
  playlist: { icon: ListVideo, label: "Playlist" },
  channel: { icon: Tv, label: "Channel" },
} as const;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function Resources({
  resources,
  labels,
}: {
  resources: Resource[];
  labels: { heading: string; body: string; arabic: string };
}) {
  if (resources.length === 0) return null;

  return (
    <section className="mt-14" aria-labelledby="free-references">
      <h2 id="free-references" className="font-display text-xl font-semibold text-content">
        {labels.heading}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-content-secondary">{labels.body}</p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {resources.map((resource) => {
          const kind = KIND[resource.kind];
          const KindIcon = kind.icon;
          const isArabic = resource.language === "ar";

          return (
            <li key={resource.url}>
              <a
                href={resource.url}
                target="_blank"
                // noreferrer as well as noopener: these are other people's
                // sites and they do not need our traffic graph.
                rel="noopener noreferrer"
                className="card card-lift group flex h-full items-start gap-3 p-4"
              >
                <KindIcon
                  size={16}
                  aria-hidden
                  className="mt-0.5 shrink-0 text-content-muted"
                />
                <span className="min-w-0 flex-1">
                  <span
                    // Arabic titles must render RTL or they read as mangled.
                    dir={isArabic ? "rtl" : undefined}
                    lang={isArabic ? "ar" : undefined}
                    className="block font-medium leading-snug text-content"
                  >
                    {resource.title}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-content-muted">
                    <span dir={isArabic ? "rtl" : undefined} lang={isArabic ? "ar" : undefined}>
                      {resource.by}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{kind.label}</span>
                    <span aria-hidden>·</span>
                    <span>{hostOf(resource.url)}</span>
                    {isArabic && (
                      <span
                        className="badge px-1.5 py-0 text-[11px]"
                        style={{ background: "var(--clr-surface-active)" }}
                      >
                        {labels.arabic}
                      </span>
                    )}
                  </span>
                </span>
                <ExternalLink
                  size={14}
                  aria-hidden
                  className="mt-0.5 shrink-0 text-content-muted transition-colors group-hover:text-content"
                />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
