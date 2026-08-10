import { ArrowRight, Video } from "lucide-react";
import Link from "next/link";

import { CourseCard } from "@/components/content/course-card";
import type { Resource } from "@/lib/resources";

/**
 * Curated external courses on a topic page.
 *
 * Placed high enough to be found — somebody who wants to watch a course will
 * not scroll past the whole curriculum first — but rendered as a compact,
 * visually secondary block so the page still reads as EgyKode's own material
 * with alternatives beside it, not as a directory of other people's links.
 *
 * Capped at three. Twenty options is not curation, and the catalogue at
 * /courses exists for anyone who wants the rest.
 *
 * Arabic entries lead because they are the scarce half: an English speaker
 * learning Kubernetes has a hundred good options, and a reader who wants it in
 * Arabic usually has one.
 */
const SHOWN = 3;

export function Resources({
  resources,
  coursesHref,
  labels,
}: {
  resources: Resource[];
  coursesHref: string;
  labels: { heading: string; body: string; arabic: string; more: string };
}) {
  if (resources.length === 0) return null;
  const shown = resources.slice(0, SHOWN);

  return (
    <section className="mt-10" aria-labelledby="free-courses">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="free-courses"
          className="flex items-center gap-2 font-display text-lg font-semibold text-content"
        >
          <Video size={17} aria-hidden className="text-content-muted" />
          {labels.heading}
        </h2>
        <Link
          href={coursesHref}
          className="group inline-flex items-center gap-1 text-sm text-content-secondary transition-colors hover:text-content"
        >
          {labels.more}
          <ArrowRight
            size={14}
            aria-hidden
            className="icon-directional transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <p className="mt-1 max-w-2xl text-sm text-content-secondary">{labels.body}</p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((resource) => (
          <li key={resource.url}>
            <CourseCard resource={resource} arabicLabel={labels.arabic} />
          </li>
        ))}
      </ul>
    </section>
  );
}
