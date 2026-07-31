"use client";

import { Check, ChevronDown, Circle, Flag, Lock } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n";
import { readProgress, writeProgress } from "@/lib/progress";

export interface RoadmapNode {
  contentId: string;
  title: string;
  domain: string;
  level: string;
  readingTime: number;
  href: string;
  colour: string;
}

export interface RoadmapPhase {
  id: string;
  number: string;
  title: string;
  nodes: RoadmapNode[];
}

/**
 * Interactive roadmap.
 *
 * Progress is kept in localStorage for now — signed-in sync lands with the
 * accounts API. Nothing is gated: a locked-looking node is still readable,
 * because withholding free learning material to enforce an order is hostile
 * (§6.3). The lock communicates sequence, not permission.
 */
export function RoadmapCanvas({
  phases,
  locale,
  labels,
  projectTitle,
  projectSummary,
}: {
  phases: RoadmapPhase[];
  locale: Locale;
  projectTitle: string;
  projectSummary: string;
  labels: {
    complete: string;
    inProgress: string;
    notStarted: string;
    markDone: string;
    markUndone: string;
    progress: string;
    of: string;
    reset: string;
    minutes: string;
    endsWith: string;
    expandAll: string;
    collapseAll: string;
    remaining: string;
  };
}) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(() => new Set(phases.map((p) => p.id)));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Also re-read when a chapter page marks itself complete in this tab.
    const sync = () => setDone(readProgress());
    sync();
    setLoaded(true);
    window.addEventListener("egykode:progress", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("egykode:progress", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setDone(next);
    writeProgress(next);
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(done);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
    },
    [done, persist],
  );

  const all = useMemo(() => phases.flatMap((p) => p.nodes), [phases]);
  const completed = all.filter((n) => done.has(n.contentId)).length;
  const percent = all.length ? Math.round((completed / all.length) * 100) : 0;
  const remainingMinutes = all
    .filter((n) => !done.has(n.contentId))
    .reduce((sum, n) => sum + n.readingTime, 0);

  const allOpen = open.size === phases.length;

  return (
    <div>
      {/* ── Progress summary ───────────────────────────────────────────── */}
      <div className="card sticky top-20 z-10 mb-8 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-content">{labels.progress}</p>
              <p className="text-sm tabular-nums text-content-secondary">
                {loaded ? completed : 0} {labels.of} {all.length} · {loaded ? percent : 0}%
              </p>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-surface-active"
              role="progressbar"
              aria-valuenow={loaded ? percent : 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={labels.progress}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${loaded ? percent : 0}%`, background: "var(--clr-primary)" }}
              />
            </div>
            {loaded && remainingMinutes > 0 && (
              <p className="mt-2 text-xs text-content-muted">
                {labels.remaining.replace(
                  "{time}",
                  remainingMinutes >= 60
                    ? `${Math.round(remainingMinutes / 60)}h`
                    : `${remainingMinutes}m`,
                )}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(allOpen ? new Set() : new Set(phases.map((p) => p.id)))}
              className="btn btn-outline h-9 px-3 text-xs"
            >
              {allOpen ? labels.collapseAll : labels.expandAll}
            </button>
            {loaded && completed > 0 && (
              <button
                type="button"
                onClick={() => persist(new Set())}
                className="btn btn-outline h-9 px-3 text-xs"
              >
                {labels.reset}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Phases ─────────────────────────────────────────────────────── */}
      <ol className="relative space-y-4">
        {phases.map((phase, index) => {
          const phaseDone = phase.nodes.filter((n) => done.has(n.contentId)).length;
          const phaseComplete = phaseDone === phase.nodes.length && phase.nodes.length > 0;
          // A phase is "reachable" once the one before it is finished. This is
          // advisory only — every link below stays live.
          const previous = phases[index - 1];
          const reachable =
            index === 0 ||
            !previous ||
            previous.nodes.every((n) => done.has(n.contentId));
          const isOpen = open.has(phase.id);

          return (
            <li key={phase.id} className="card overflow-hidden">
              <h3>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(open);
                    if (next.has(phase.id)) next.delete(phase.id);
                    else next.add(phase.id);
                    setOpen(next);
                  }}
                  aria-expanded={isOpen}
                  aria-controls={`phase-${phase.id}`}
                  className="flex w-full items-center gap-4 p-5 text-start transition-colors hover:bg-surface-hover"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums transition-colors"
                    style={
                      phaseComplete
                        ? { background: "var(--clr-primary)", color: "var(--clr-text-inverse)" }
                        : {
                            background: "var(--clr-surface-active)",
                            color: "var(--clr-text-secondary)",
                          }
                    }
                  >
                    {phaseComplete ? <Check size={16} aria-hidden /> : phase.number}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-display font-semibold text-content">
                      {phase.title}
                    </span>
                    <span className="mt-0.5 block text-xs tabular-nums text-content-muted">
                      {loaded ? phaseDone : 0} / {phase.nodes.length}
                      {!reachable && loaded && (
                        <>
                          {" · "}
                          <Lock size={10} className="inline" aria-hidden />
                        </>
                      )}
                    </span>
                  </span>

                  <ChevronDown
                    size={18}
                    aria-hidden
                    className={`shrink-0 text-content-muted transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </h3>

              {isOpen && (
                <ul id={`phase-${phase.id}`} className="border-t px-3 py-2">
                  {phase.nodes.map((node) => {
                    const isDone = done.has(node.contentId);
                    return (
                      <li key={node.contentId} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggle(node.contentId)}
                          aria-pressed={isDone}
                          aria-label={`${isDone ? labels.markUndone : labels.markDone}: ${node.title}`}
                          className="shrink-0 rounded-md p-2 text-content-muted transition-colors hover:text-primary"
                        >
                          {isDone ? (
                            <Check size={16} style={{ color: "var(--clr-primary)" }} aria-hidden />
                          ) : (
                            <Circle size={16} aria-hidden />
                          )}
                        </button>

                        <Link
                          href={node.href}
                          className="group flex min-w-0 flex-1 items-center gap-3 rounded-md py-2 pe-2 transition-colors hover:bg-surface-hover"
                        >
                          <span
                            className="h-4 w-1 shrink-0 rounded-full"
                            style={{ background: node.colour }}
                            aria-hidden
                          />
                          <span
                            className={`min-w-0 flex-1 truncate text-sm transition-colors group-hover:text-content ${
                              isDone
                                ? "text-content-muted line-through decoration-1"
                                : "text-content-secondary"
                            }`}
                          >
                            {node.title}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-content-muted">
                            {labels.minutes.replace("{minutes}", String(node.readingTime))}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}

        {/* The promise, as the terminal node of the path. */}
        <li>
          <div
            className="card border-primary/40 p-5"
            style={{ background: "var(--clr-success-bg)" }}
          >
            <div className="flex items-start gap-4">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--clr-primary)", color: "var(--clr-text-inverse)" }}
              >
                <Flag size={16} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--clr-primary-dark)" }}>
                  {labels.endsWith}
                </p>
                <p className="mt-1 font-display font-semibold text-content">{projectTitle}</p>
                <p className="mt-1 text-sm text-content-secondary">{projectSummary}</p>
              </div>
            </div>
          </div>
        </li>
      </ol>

      <p className="mt-6 text-xs text-content-muted" lang={locale}>
        {labels.notStarted}
      </p>
    </div>
  );
}
