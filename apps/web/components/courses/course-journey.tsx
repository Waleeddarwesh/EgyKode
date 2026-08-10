"use client";

import { ArrowRight, ChevronDown, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

const LANGUAGE_KEY = "egykode_course_language";

export interface JourneyResource {
  title: string;
  url: string;
  by: string;
  language: "en" | "ar";
  kind: string;
  minutes?: number;
  videos?: number;
  level?: string;
}

export interface JourneyStep {
  domain: string;
  label: string;
  resources: JourneyResource[];
}

export interface JourneyPhase {
  number: string;
  title: string;
  steps: JourneyStep[];
}

type Choice = "all" | "ar" | "en";

/**
 * The catalogue as a path rather than a directory.
 *
 * The order is the roadmap's, so this cannot drift from the curriculum: a
 * learner is told where to start and what follows, instead of being handed
 * thirty links and asked to sequence them.
 *
 * Language is the primary control, not a filter tucked into a sidebar —
 * choosing Arabic changes which collection you are browsing, and the choice
 * persists, because someone who wants Arabic wants it every visit.
 *
 * Switching language never rebuilds the page or moves you: only the cards
 * under each step change, so your scroll position and place in the path
 * survive the switch.
 */
export function CourseJourney({
  phases,
  labels,
}: {
  phases: JourneyPhase[];
  labels: {
    heading: string;
    body: string;
    language: string;
    all: string;
    arabic: string;
    english: string;
    coverage: string;
    covered: string;
    none: string;
    noneBody: string;
    showOther: string;
    more: string;
    recommended: string;
    start: string;
  };
}) {
  const [choice, setChoice] = useState<Choice>("all");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(LANGUAGE_KEY) as Choice | null;
    if (stored === "ar" || stored === "en" || stored === "all") setChoice(stored);
    setReady(true);
  }, []);

  const pick = (next: Choice) => {
    setChoice(next);
    localStorage.setItem(LANGUAGE_KEY, next);
  };

  const matching = (step: JourneyStep) =>
    choice === "all" ? step.resources : step.resources.filter((r) => r.language === choice);

  const steps = phases.flatMap((p) => p.steps);
  const withCourses = steps.filter((s) => matching(s).length > 0).length;
  const percent = steps.length ? Math.round((withCourses / steps.length) * 100) : 0;

  const count = (language: Choice) =>
    steps.reduce(
      (n, s) =>
        n + (language === "all" ? s.resources.length : s.resources.filter((r) => r.language === language).length),
      0,
    );

  const options: { value: Choice; label: string }[] = [
    { value: "all", label: labels.all },
    { value: "ar", label: labels.arabic },
    { value: "en", label: labels.english },
  ];

  return (
    <section className="mt-12" aria-labelledby="journey">
      <h2 id="journey" className="font-display text-2xl font-bold text-content">
        {labels.heading}
      </h2>
      <p className="mt-2 max-w-2xl text-content-secondary">{labels.body}</p>

      {/* ── Language: the primary control ──────────────────────────────── */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
          {labels.language}
        </p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={labels.language}>
          {options.map((option) => {
            const active = choice === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => pick(option.value)}
                aria-pressed={active}
                className={`btn h-10 px-4 ${active ? "btn-primary" : "btn-outline"}`}
              >
                {option.label}
                <span className="ms-1.5 tabular-nums opacity-70">{count(option.value)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Coverage is stated rather than hidden: a path with gaps is more
          useful than one that pretends to be complete. */}
      <div className="mt-5 max-w-md">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-content-secondary">{labels.coverage}</span>
          <span className="tabular-nums text-content-secondary">
            {labels.covered
              .replace("{covered}", String(withCourses))
              .replace("{total}", String(steps.length))}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-active">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${percent}%`, background: "var(--clr-primary)" }}
          />
        </div>
      </div>

      {/* ── The path ───────────────────────────────────────────────────── */}
      <ol className="mt-10 space-y-10">
        {phases.map((phase) => (
          <li key={phase.number}>
            <p className="flex items-baseline gap-3">
              <span className="font-mono text-sm tabular-nums text-content-muted">
                {phase.number}
              </span>
              <span className="font-display text-sm font-semibold uppercase tracking-wide text-content">
                {phase.title}
              </span>
            </p>

            <ol className="mt-4 space-y-3 border-s ps-5">
              {phase.steps.map((step) => {
                const shown = matching(step);
                const primary = shown[0];
                const rest = shown.slice(1);
                const expanded = open.has(step.domain);
                const otherLanguage = shown.length === 0 && step.resources.length > 0;

                return (
                  <li key={step.domain} className="relative">
                    <span
                      className="absolute -start-[1.42rem] top-2 h-2 w-2 rounded-full"
                      style={{ background: primary ? "var(--clr-primary)" : "var(--clr-surface-border)" }}
                      aria-hidden
                    />
                    <p className="font-medium text-content">{step.label}</p>

                    {primary ? (
                      <>
                        <div className="mt-2">
                          <ResourceRow
                            resource={primary}
                            recommendedLabel={labels.recommended}
                            startLabel={labels.start}
                            recommended
                          />
                        </div>

                        {rest.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setOpen((current) => {
                                  const next = new Set(current);
                                  if (next.has(step.domain)) next.delete(step.domain);
                                  else next.add(step.domain);
                                  return next;
                                })
                              }
                              aria-expanded={expanded}
                              className="mt-2 inline-flex items-center gap-1 text-sm text-content-muted transition-colors hover:text-content"
                            >
                              {labels.more.replace("{n}", String(rest.length))}
                              <ChevronDown
                                size={14}
                                aria-hidden
                                className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                              />
                            </button>
                            {expanded && (
                              <div className="mt-2 space-y-2">
                                {rest.map((resource) => (
                                  <ResourceRow
                                    key={resource.url}
                                    resource={resource}
                                    recommendedLabel={labels.recommended}
                                    startLabel={labels.start}
                                  />
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      // A language with no course here must not look like a
                      // broken path. Say what is missing and offer the way on.
                      <div className="mt-2 rounded-lg border border-dashed p-3 text-sm">
                        <p className="text-content-secondary">
                          {otherLanguage ? labels.none : labels.noneBody}
                        </p>
                        {otherLanguage && (
                          <button
                            type="button"
                            onClick={() => pick("all")}
                            className="mt-1.5 inline-flex items-center gap-1 font-medium text-content underline underline-offset-2"
                          >
                            {labels.showOther}
                            <ArrowRight size={13} aria-hidden className="icon-directional" />
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>

      {!ready && <span className="sr-only">loading</span>}
    </section>
  );
}

function ResourceRow({
  resource,
  recommended,
  recommendedLabel,
  startLabel,
}: {
  resource: JourneyResource;
  recommended?: boolean;
  recommendedLabel: string;
  startLabel: string;
}) {
  const isArabic = resource.language === "ar";
  const hours = resource.minutes
    ? resource.minutes >= 60
      ? `${Math.floor(resource.minutes / 60)}h ${String(resource.minutes % 60).padStart(2, "0")}m`
      : `${resource.minutes}m`
    : null;

  const facts = [
    resource.by,
    isArabic ? "العربية" : "English",
    resource.level,
    hours,
    resource.videos ? `${resource.videos} videos` : null,
  ].filter(Boolean) as string[];

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card card-lift group flex items-start gap-3 p-3"
    >
      <span className="min-w-0 flex-1">
        {recommended && (
          <span
            className="mb-1 inline-block text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--clr-primary-dark)" }}
          >
            ★ {recommendedLabel}
          </span>
        )}
        <span
          dir={isArabic ? "rtl" : undefined}
          lang={isArabic ? "ar" : undefined}
          className="block font-medium leading-snug text-content"
        >
          {resource.title}
        </span>
        <span className="mt-1 block text-xs text-content-muted">{facts.join(" · ")}</span>
      </span>
      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-sm text-content-secondary transition-colors group-hover:text-content">
        {startLabel}
        <ExternalLink size={13} aria-hidden />
      </span>
    </a>
  );
}
