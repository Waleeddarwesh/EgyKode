import { ArrowRight, Check, Flag } from "lucide-react";
import Link from "next/link";

/**
 * What this lab adds to the platform, and why it sits here.
 *
 * The site's promise is one production system built in steps, not a catalogue
 * of exercises. The path already shows the *order*; what it could not show is
 * the *reason* — that this lab consumes something three labs back produced,
 * and that four later labs are waiting on its output. Without that, a reader
 * on a Terraform lab is doing "a Terraform lab", which is exactly the feeling
 * the platform exists to replace.
 *
 * Rendered from the graph in path.json, so it cannot drift from the ordering
 * it describes — a `requires` edge pointing forward fails the content lint.
 */
export function ProjectContribution({
  produces,
  requires,
  unlocks,
  labHref,
  labels,
}: {
  produces: string[];
  requires: { labId: string; title: string }[];
  unlocks: { labId: string; title: string }[];
  labHref: (labId: string) => string;
  labels: {
    heading: string;
    builtAlready: string;
    youAdd: string;
    unlocks: string;
  };
}) {
  return (
    <section
      className="card mb-8 p-5 sm:p-6"
      aria-labelledby="project-contribution"
      style={{ background: "var(--clr-surface-subtle, transparent)" }}
    >
      {/* The phase and step counter used to repeat here. The lab header now
          carries "01 · FOUNDATIONS" and "LAB 1 / 59" directly above, so
          restating it made two lines say one thing — the same duplication the
          platform card created on the labs index. This block's job is the
          dependency chain, not the address. */}
      <p
        id="project-contribution"
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--clr-primary-dark)" }}
      >
        <Flag size={12} className="me-1 inline" aria-hidden />
        {labels.heading}
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-3">
        {/* Where the platform already is. Empty on the very first lab, which
            is itself informative: nothing has been built yet. */}
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted">
            {labels.builtAlready}
          </h3>
          {requires.length ? (
            <ul className="mt-2 space-y-1.5">
              {requires.map((r) => (
                <li key={r.labId} className="text-sm leading-snug">
                  <Link
                    href={labHref(r.labId)}
                    className="text-content-secondary underline-offset-2 hover:text-content hover:underline"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-content-muted">—</p>
          )}
        </div>

        {/* The point of the lab, in the platform's terms rather than the
            tool's. */}
        <div className="min-w-0">
          <h3
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--clr-primary-dark)" }}
          >
            {labels.youAdd}
          </h3>
          <ul className="mt-2 space-y-1.5">
            {produces.map((p) => (
              <li key={p} className="flex gap-1.5 text-sm leading-snug text-content">
                <Check size={14} className="mt-0.5 shrink-0" style={{ color: "var(--clr-success)" }} aria-hidden />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Reverse edges. "Nothing is waiting on this" is true only of the
            capstone, and there it is the right thing to say. */}
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted">
            {labels.unlocks}
          </h3>
          {unlocks.length ? (
            <ul className="mt-2 space-y-1.5">
              {unlocks.map((u) => (
                <li key={u.labId} className="flex gap-1.5 text-sm leading-snug">
                  <ArrowRight
                    size={14}
                    className="mt-0.5 shrink-0 text-content-muted rtl:-scale-x-100"
                    aria-hidden
                  />
                  <Link
                    href={labHref(u.labId)}
                    className="text-content-secondary underline-offset-2 hover:text-content hover:underline"
                  >
                    {u.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-content-muted">—</p>
          )}
        </div>
      </div>
    </section>
  );
}
