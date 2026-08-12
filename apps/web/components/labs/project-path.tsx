"use client";

import { ArrowRight, Check, ChevronDown, Circle, Flag, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const CRITERIA_KEY = "egykode_lab_criteria";

export interface PathLab {
  labId: string;
  title: string;
  href: string;
  minutes: string;
  level: string;
  domain: string;
  colour: string;
  costTier: "free" | "low" | "billable";
  criteriaCount: number;
  isIncident: boolean;
}

export interface PathPhase {
  id: string;
  number: string;
  title: string;
  why: string;
  milestone: string;
  labs: PathLab[];
}

/**
 * The Project Path — one continuous build rather than a catalogue.
 *
 * The lab index was ordered by a numeric field that had accumulated
 * collisions, so Terraform Fundamentals appeared after the VPC and EKS labs
 * that depend on it. Worse, a grid of forty cards answers "what labs exist"
 * and never answers "where do I start, and what comes next" — which is the
 * question someone learning actually has.
 *
 * A lab counts as complete when its success criteria are ticked, reusing the
 * store the lab pages already write to. Nothing new is tracked.
 */
/** The production platform the whole path is building toward. */
export interface PathProject {
  /** "Build it yourself" / "The reference" — which of the two routes this is. */
  kicker: string;
  title: string;
  summary: string;
  cta: string;
  href: string;
}

export function ProjectPath({
  phases,
  build,
  project,
  labels,
}: {
  phases: PathPhase[];
  /** The guided build. Rendered first: the promise is that you build it. */
  build?: PathProject;
  project?: PathProject;
  labels: {
    heading: string;
    summary: string;
    progress: string;
    of: string;
    continueLabel: string;
    startLabel: string;
    milestone: string;
    complete: string;
    billable: string;
    projectEyebrow: string;
  };
}) {
  const [done, setDone] = useState<Set<string> | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    const read = () => {
      try {
        const all = JSON.parse(localStorage.getItem(CRITERIA_KEY) ?? "{}") as Record<string, number[]>;
        const complete = new Set<string>();
        for (const phase of phases) {
          for (const lab of phase.labs) {
            const ticked = all[lab.labId]?.length ?? 0;
            if (lab.criteriaCount > 0 && ticked >= lab.criteriaCount) complete.add(lab.labId);
          }
        }
        setDone(complete);
      } catch {
        setDone(new Set());
      }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [phases]);

  const all = phases.flatMap((p) => p.labs);
  const completed = done ? all.filter((l) => done.has(l.labId)).length : 0;
  const percent = all.length ? Math.round((completed / all.length) * 100) : 0;
  const next = done ? all.find((l) => !done.has(l.labId)) : undefined;

  // Open the phase containing the next lab, so the page lands where you are.
  useEffect(() => {
    if (!next) return;
    const phase = phases.find((p) => p.labs.some((l) => l.labId === next.labId));
    if (phase) setOpen((current) => new Set(current).add(phase.id));
  }, [next, phases]);

  return (
    <section className="mb-14" aria-labelledby="project-path">
      <div className="card overflow-hidden p-0">
        <div className="h-1 w-full" style={{ background: "var(--clr-primary)" }} aria-hidden />

        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p
                className="mb-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--clr-primary-dark)" }}
              >
                <Flag size={12} className="me-1 inline" aria-hidden />
                {labels.heading}
              </p>
              <h2 id="project-path" className="font-display text-2xl font-bold text-content">
                {labels.summary}
              </h2>
            </div>
          </div>

          {/* Progress renders only once the store has been read: a "0%" flashed
              at someone who is 60% through reads as lost work. */}
          {done && completed > 0 && (
            <div className="mt-6">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-content-secondary">{labels.progress}</span>
                <span className="tabular-nums text-content-secondary">
                  {completed} {labels.of} {all.length} · {percent}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-active">
                <div
                  className="progress-fill h-full w-full rounded-full"
                  style={{
                    transform: `scaleX(${percent / 100})`,
                    background: "var(--clr-primary)",
                  }}
                />
              </div>
            </div>
          )}

          {next && (
            <div className="mt-6">
              <Link href={next.href} className="btn btn-primary h-10 px-5">
                {completed > 0 ? labels.continueLabel : labels.startLabel}
              </Link>
              <p className="mt-2 text-sm text-content-muted">
                {next.title} · {next.minutes} · {next.level}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Phases ───────────────────────────────────────────────────────── */}
      <ol className="mt-6 space-y-3">
        {phases.map((phase) => {
          const phaseDone = done ? phase.labs.filter((l) => done.has(l.labId)).length : 0;
          const phaseComplete = done !== null && phaseDone === phase.labs.length;
          const isOpen = open.has(phase.id);

          return (
            <li key={phase.id} className="card overflow-hidden">
              <h3>
                <button
                  type="button"
                  onClick={() =>
                    setOpen((current) => {
                      const nextOpen = new Set(current);
                      if (nextOpen.has(phase.id)) nextOpen.delete(phase.id);
                      else nextOpen.add(phase.id);
                      return nextOpen;
                    })
                  }
                  aria-expanded={isOpen}
                  aria-controls={`phase-${phase.id}`}
                  className="flex w-full items-center gap-4 p-5 text-start transition-colors hover:bg-surface-hover"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums"
                    style={
                      phaseComplete
                        ? { background: "var(--clr-primary)", color: "var(--clr-text-inverse)" }
                        : { background: "var(--clr-surface-active)", color: "var(--clr-text-secondary)" }
                    }
                  >
                    {phaseComplete ? <Check size={16} aria-hidden /> : phase.number}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-display font-semibold text-content">
                      {phase.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-content-muted">
                      {phase.labs.length} labs
                      {done && phaseDone > 0 && ` · ${phaseDone}/${phase.labs.length}`}
                    </span>
                  </span>

                  <ChevronDown
                    size={18}
                    aria-hidden
                    className={`shrink-0 text-content-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </h3>

              {isOpen && (
                <div id={`phase-${phase.id}`} className="border-t px-5 pb-5 pt-4">
                  {/* Why this phase exists at all — the question a linear list
                      never answers. */}
                  <p className="mb-4 max-w-2xl text-sm leading-relaxed text-content-secondary">
                    {phase.why}
                  </p>

                  <ol className="space-y-1">
                    {phase.labs.map((lab, index) => {
                      const isDone = done?.has(lab.labId) ?? false;
                      return (
                        <li key={lab.labId}>
                          <Link
                            href={lab.href}
                            className="group flex min-w-0 items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-hover"
                          >
                            <span className="shrink-0">
                              {isDone ? (
                                <Check size={16} style={{ color: "var(--clr-primary)" }} aria-hidden />
                              ) : (
                                <Circle size={16} className="text-content-muted" aria-hidden />
                              )}
                            </span>
                            <span
                              className="h-4 w-1 shrink-0 rounded-full"
                              style={{ background: lab.colour }}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate text-sm text-content-secondary transition-colors group-hover:text-content">
                              <span className="me-2 font-mono text-xs text-content-muted">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              {lab.title}
                            </span>
                            {lab.isIncident && (
                              <span
                                className="badge shrink-0 px-2 text-[10px] uppercase"
                                style={{ background: "var(--clr-danger-bg)", color: "var(--clr-danger)" }}
                              >
                                incident
                              </span>
                            )}
                            {lab.costTier === "billable" && (
                              <TriangleAlert
                                size={13}
                                aria-label={labels.billable}
                                className="shrink-0"
                                style={{ color: "var(--clr-danger)" }}
                              />
                            )}
                            <span className="shrink-0 text-xs tabular-nums text-content-muted">
                              {lab.minutes}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>

                  <p
                    className="mt-4 rounded-lg px-3 py-2.5 text-sm"
                    style={{ background: "var(--clr-success-bg)", color: "var(--clr-text)" }}
                  >
                    <strong style={{ color: "var(--clr-primary-dark)" }}>{labels.milestone}</strong>{" "}
                    {phase.milestone}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Where the path lands.
          The site's promise is one production platform, not a catalogue, and
          the phases above end at a milestone — the last thing a reader saw was
          "you built it once with no instructions", with nothing to go to next.
          Every roadmap already ends at this project; the labs route to the
          same place, so both journeys converge rather than stopping. It is
          deliberately the *last* thing here: read afterwards as a reference,
          not copied from while you work. */}
      {(build || project) && (
        <div className="mt-6">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--clr-primary-dark)" }}
          >
            <Flag size={12} className="me-1 inline" aria-hidden />
            {labels.projectEyebrow}
          </p>

          {/* Two routes to the same platform, and the order is the argument:
              build it yourself first, and treat the finished repository as the
              answer key rather than the starting point. Handing over a working
              repo is what turns "you build it" into "you read it". */}
          <div className="grid gap-4 md:grid-cols-2">
            {[build, project].filter((p): p is PathProject => Boolean(p)).map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="card group flex flex-col p-6 transition-colors hover:border-[var(--clr-primary)]"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                  {p.kicker}
                </p>
                <h3 className="mt-1.5 font-display text-lg font-bold text-content">{p.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-content-secondary">
                  {p.summary}
                </p>
                <span
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
                  style={{ color: "var(--clr-primary-dark)" }}
                >
                  {p.cta}
                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100"
                    aria-hidden
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
