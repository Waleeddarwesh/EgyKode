"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { useLabCriteria } from "@/lib/lab-progress";

/**
 * What finishing a lab looks like.
 *
 * Completing the last criterion used to turn "3 of 4" into "4 of 4" and
 * nothing else — the strongest moment in the lab produced the weakest signal
 * in the page, and the learner was left at a cleanup block with no sense of
 * having finished anything.
 *
 * This states what they can now do, what evidence backs it, and where the
 * build goes next. No points, no streaks: the reward is the capability and the
 * next step, which is the only reward the platform actually promises.
 */
export function LabComplete({
  labId,
  criteriaCount,
  evidence,
  skills,
  next,
  labels,
}: {
  labId: string;
  criteriaCount: number;
  /** How many criteria are settled by each kind of evidence. */
  evidence: { command: number; state: number; reasoning: number; self: number };
  /** The capabilities this lab claims, from its frontmatter. */
  skills: string[];
  next?: { title: string; href: string };
  labels: {
    heading: string;
    demonstrated: string;
    evidenceHeading: string;
    evidenceCommand: string;
    evidenceState: string;
    evidenceReasoning: string;
    evidenceSelf: string;
    next: string;
    continueLabel: string;
  };
}) {
  const { criteria } = useLabCriteria();

  // `null` while the store is unread — never flash a completion card at
  // someone who has not earned it, and never flash its absence at someone who
  // has.
  if (!criteria) return null;
  const ticked = criteria[labId]?.length ?? 0;
  if (criteriaCount === 0 || ticked < criteriaCount) return null;

  const counts: [number, string][] = [
    [evidence.command, labels.evidenceCommand],
    [evidence.state, labels.evidenceState],
    [evidence.reasoning, labels.evidenceReasoning],
    [evidence.self, labels.evidenceSelf],
  ];

  return (
    <section
      className="card mt-8 overflow-hidden p-0"
      style={{ borderColor: "var(--clr-primary)" }}
      aria-labelledby="lab-complete"
      aria-live="polite"
    >
      <div className="h-1 w-full" style={{ background: "var(--clr-primary)" }} aria-hidden />

      <div className="p-6">
        <p
          id="lab-complete"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--clr-primary-dark)" }}
        >
          <Check size={14} aria-hidden />
          {labels.heading}
        </p>

        {skills.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
              {labels.demonstrated}
            </p>
            <ul className="mt-2 space-y-1">
              {skills.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-content-secondary">
                  <Check
                    size={14}
                    aria-hidden
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--clr-primary)" }}
                  />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* What actually backs the claim. A lab settled entirely by
            self-assessment says so here rather than reading as proven. */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
            {labels.evidenceHeading}
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {counts
              .filter(([n]) => n > 0)
              .map(([n, label]) => (
                <li key={label} className="text-sm text-content-secondary">
                  <span className="font-medium tabular-nums text-content">{n}</span>{" "}
                  <span className="text-xs uppercase tracking-wide text-content-muted">{label}</span>
                </li>
              ))}
          </ul>
        </div>

        {next && (
          <div className="mt-6 border-t pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
              {labels.next}
            </p>
            <p className="mt-1 text-sm text-content-secondary">{next.title}</p>
            <Link href={next.href} className="btn btn-primary mt-3 h-10 px-5">
              {labels.continueLabel}
              <ArrowRight size={15} className="ms-1.5 rtl:-scale-x-100" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
