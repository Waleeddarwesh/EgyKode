import { Check, Clock } from "lucide-react";
import Link from "next/link";

/**
 * Roadmap coverage.
 *
 * States what the path teaches and what it does not, side by side. A roadmap
 * that names its own edges is more trustworthy than one padded to a target
 * phase count — and framing the gaps as planned turns "why is this
 * incomplete?" into "here is what is coming".
 *
 * The counts are derived from the roadmap file, so they cannot drift from the
 * phases actually shipped.
 */
export function RoadmapCoverage({
  phaseCount,
  chapterCount,
  gaps,
  repo,
  labels,
}: {
  phaseCount: number;
  chapterCount: number;
  gaps: string[];
  repo: string;
  labels: {
    title: string;
    covered: string;
    planned: string;
    phases: string;
    chapters: string;
    body: string;
    cta: string;
  };
}) {
  if (gaps.length === 0) return null;

  return (
    <section className="card mb-8 p-5">
      <h2 className="font-display font-semibold text-content">{labels.title}</h2>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <p className="inline-flex items-center gap-2 text-content-secondary">
          <Check size={15} aria-hidden style={{ color: "var(--clr-primary)" }} />
          <span className="tabular-nums text-content">{phaseCount}</span> {labels.phases}
          <span aria-hidden>·</span>
          <span className="tabular-nums text-content">{chapterCount}</span> {labels.chapters}
          <span className="text-content-muted">{labels.covered}</span>
        </p>
        <p className="inline-flex items-center gap-2 text-content-secondary">
          <Clock size={15} aria-hidden style={{ color: "var(--clr-accent)" }} />
          <span className="tabular-nums text-content">{gaps.length}</span> {labels.planned}
        </p>
      </div>

      <p className="mt-3 text-sm text-content-secondary">{labels.body}</p>

      <ul className="mt-3 space-y-2">
        {gaps.map((gap) => (
          <li key={gap} className="flex gap-2.5 text-sm text-content-secondary">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: "var(--clr-accent)" }}
              aria-hidden
            />
            <span>{gap}</span>
          </li>
        ))}
      </ul>

      <Link
        href={repo}
        className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {labels.cta} →
      </Link>
    </section>
  );
}
