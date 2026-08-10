import { ArrowLeft, ArrowRight, Clock, Flag, TriangleAlert } from "lucide-react";
import Link from "next/link";

import type { PathNeighbours } from "@/lib/labs";
import { costTierOf } from "@/lib/labs";

/**
 * What to open next, at the bottom of a lab.
 *
 * A lab that ends at its cleanup block ends the session too — the reader has to
 * go back to the index and work out where they were, which is exactly the
 * friction the Project Path was meant to remove. The path already knows the
 * sequence, so the page can just say it.
 *
 * Crossing a phase boundary is called out rather than smoothed over. Finishing
 * a phase is the moment the milestone means something, and it is the natural
 * place to stop for the day — so the card says what you can now do before it
 * says what is next.
 */
export function NextLab({
  neighbours,
  locale,
  colour,
  labels,
}: {
  neighbours: PathNeighbours;
  locale: string;
  colour: string;
  labels: {
    nextUp: string;
    nextPhase: string;
    phaseComplete: string;
    milestone: string;
    position: string;
    previous: string;
    minutes: (n: number) => string;
    level: (level: string) => string;
    billable: string;
    pathEnd: string;
    pathEndBody: string;
    browseLibrary: string;
    labsHref: string;
  };
}) {
  const { next, previous, completesPhase, entersNewPhase, position, total } = neighbours;

  return (
    <section className="mt-14 border-t pt-8" aria-labelledby="next-lab">
      {/* The milestone lands here, not on the index: this is the moment it was
          earned, and the moment someone is deciding whether to keep going. */}
      {completesPhase && (
        <div
          className="mb-5 rounded-lg px-4 py-3"
          style={{ background: "var(--clr-success-bg)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--clr-primary-dark)" }}
          >
            <Flag size={12} className="me-1 inline" aria-hidden />
            {labels.phaseComplete} · {completesPhase.number} {completesPhase.title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-content">
            <strong>{labels.milestone}</strong> {completesPhase.milestone}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="next-lab" className="font-display text-lg font-semibold text-content">
          {next ? (entersNewPhase ? labels.nextPhase : labels.nextUp) : labels.pathEnd}
        </h2>
        <p className="text-xs tabular-nums text-content-muted">{labels.position}</p>
      </div>

      {next ? (
        <>
          <Link
            href={`/${locale}/labs/${next.lab.labId}`}
            className="card card-lift group mt-3 flex items-center gap-4 p-5"
          >
            <span
              className="h-full w-1 shrink-0 self-stretch rounded-full"
              style={{ background: colour }}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              {entersNewPhase && (
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-content-muted">
                  {next.phase.number} · {next.phase.title}
                </span>
              )}
              <span className="block font-display font-semibold text-content">
                {next.lab.title}
              </span>
              {next.lab.description && (
                <span className="mt-1 block text-sm leading-relaxed text-content-secondary">
                  {next.lab.description}
                </span>
              )}
              <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} aria-hidden />
                  {labels.minutes(next.lab.estimatedMinutes)}
                </span>
                <span>{labels.level(next.lab.level)}</span>
                {costTierOf(next.lab) === "billable" && (
                  <span
                    className="inline-flex items-center gap-1"
                    style={{ color: "var(--clr-danger)" }}
                  >
                    <TriangleAlert size={12} aria-hidden />
                    {labels.billable}
                  </span>
                )}
              </span>
            </span>
            <ArrowRight
              size={18}
              aria-hidden
              className="icon-directional shrink-0 text-content-muted transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          {previous && (
            <p className="mt-3">
              <Link
                href={`/${locale}/labs/${previous.lab.labId}`}
                className="inline-flex items-center gap-1.5 text-sm text-content-muted transition-colors hover:text-content"
              >
                <ArrowLeft size={14} aria-hidden className="icon-directional" />
                {labels.previous}: {previous.lab.title}
              </Link>
            </p>
          )}
        </>
      ) : (
        <div className="card mt-3 p-5">
          <p className="text-sm leading-relaxed text-content-secondary">{labels.pathEndBody}</p>
          <Link href={labels.labsHref} className="btn btn-outline mt-4 h-9 px-4">
            {labels.browseLibrary}
          </Link>
        </div>
      )}
    </section>
  );
}
