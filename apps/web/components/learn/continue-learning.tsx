"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { useProgress } from "@/lib/progress";

export interface PathNode {
  contentId: string;
  title: string;
  href: string;
  phaseTitle: string;
  phaseNumber: string;
  readingTime: number;
  colour: string;
}

/**
 * "What should I do next?" — answered on the home page.
 *
 * A learning platform that greets a returning reader with the same marketing
 * hero it showed a stranger has forgotten who they are. This reads the same
 * progress store the roadmap writes to, finds the first unfinished node, and
 * makes resuming a single click.
 *
 * Renders nothing until it knows there is progress, so a first-time visitor
 * still gets the pitch rather than an empty widget.
 */
export function ContinueLearning({
  nodes,
  locale,
  labels,
}: {
  nodes: PathNode[];
  locale: Locale;
  labels: {
    heading: string;
    resume: string;
    progress: string;
    of: string;
    phase: string;
    minutes: string;
    done: string;
    restart: string;
  };
}) {
  const { done } = useProgress();

  // Nothing rendered on the server or before the store is read: showing a
  // "0% complete" card to a first-time visitor is worse than showing nothing.
  if (!done || done.size === 0) return null;

  const completed = nodes.filter((n) => done.has(n.contentId)).length;
  const next = nodes.find((n) => !done.has(n.contentId));
  const percent = nodes.length ? Math.round((completed / nodes.length) * 100) : 0;

  return (
    <section
      className="card mb-12 overflow-hidden p-0"
      aria-labelledby="continue-heading"
      lang={locale}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <h2 id="continue-heading" className="font-display font-semibold text-content">
          {labels.heading}
        </h2>
        <p className="text-sm tabular-nums text-content-secondary">
          {completed} {labels.of} {nodes.length} · {percent}%
        </p>
      </div>

      <div
        className="h-1 w-full bg-surface-active"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={labels.progress}
      >
        <div
          className="h-full transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%`, background: "var(--clr-primary)" }}
        />
      </div>

      {next ? (
        <div className="flex flex-wrap items-center gap-5 p-6">
          <span
            className="h-10 w-1 shrink-0 rounded-full"
            style={{ background: next.colour }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-content-muted">
              {labels.phase} {next.phaseNumber} · {next.phaseTitle}
            </p>
            <p className="mt-1 truncate font-display text-lg font-semibold text-content">
              {next.title}
            </p>
            <p className="mt-0.5 text-sm text-content-muted">
              {labels.minutes.replace("{minutes}", String(next.readingTime))}
            </p>
          </div>
          <Link href={next.href} className="btn btn-primary group h-11 shrink-0 px-5">
            {labels.resume}
            <ArrowRight
              size={17}
              aria-hidden
              className="icon-directional transition-transform duration-150 group-hover:translate-x-1"
            />
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4 p-6">
          <p className="min-w-0 flex-1 font-display text-lg font-semibold text-content">
            {labels.done}
          </p>
          <Link href={`/${locale}/projects`} className="btn btn-primary h-11 px-5">
            {labels.restart}
            <RotateCcw size={16} aria-hidden />
          </Link>
        </div>
      )}
    </section>
  );
}
