"use client";

import { ArrowRight, ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { runtime } from "@/components/content/course-card";

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
  /** Kept behind the disclosure rather than shown by default. */
  extra?: boolean;
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
  tail,
  tailLabel,
  project,
  labels,
}: {
  phases: JourneyPhase[];
  /** Project references that close the path. */
  tail?: JourneyResource[];
  tailLabel?: string;
  /** EgyKode's own project — the real ending of the path. */
  project?: { href: string; title: string; body: string; cta: string };
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
  // Arabic by default. It is the scarce half of the collection and the reason
  // most of this audience is here — someone who wants English is one click
  // away, while someone who needs Arabic would otherwise have to find the
  // filter before the page is useful to them. A stored preference still wins.
  const [choice, setChoice] = useState<Choice>("ar");
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

  const tailStep: JourneyStep | null =
    tail && tail.length ? { domain: "__projects", label: tailLabel ?? "Projects", resources: tail } : null;
  const steps = [...phases.flatMap((p) => p.steps), ...(tailStep ? [tailStep] : [])];
  const withCourses = steps.filter((s) => matching(s).length > 0).length;
  const percent = steps.length ? Math.round((withCourses / steps.length) * 100) : 0;

  // No count on these buttons, deliberately.
  //
  // It used to sum resources per roadmap step, so a course recommended at two
  // steps counted twice — "All 50" against a catalogue of 40 courses, three
  // lines below a sentence that said "40 courses". Two true numbers measuring
  // different things, side by side, reading as a contradiction.
  //
  // The number was also answering a question nobody asks: how many
  // course-slots exist across all steps. What a reader wants to know is how
  // much of the journey this language actually covers, and that is the
  // coverage bar directly beneath — which recomputes on every choice.
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
              {/* A course can legitimately serve two steps in a row — a
                  "Helm vs Kustomize" comparison, or a DevOps/SRE/Platform
                  debate. Showing it twice reads as a bug; merging the step
                  names says what it actually covers. */}
              {mergeAdjacent(phase.steps, matching).map((group) => {
                const step = group.steps[0]!;
                const shown = group.resources;
                // Entries flagged `extra` are continuations. They stay behind
                // the disclosure so the default view answers "what do I start
                // with", not "here is everything we have".
                const visible = shown.filter((r) => !r.extra);
                const hidden = shown.filter((r) => r.extra);
                const primary = visible[0] ?? shown[0];
                const alsoVisible = (visible[0] ? visible.slice(1) : shown.slice(1)).filter(
                  (r) => !r.extra,
                );
                const rest = hidden;
                const expanded = open.has(step.domain);
                const otherLanguage = shown.length === 0 && step.resources.length > 0;

                return (
                  <li key={group.steps.map((s) => s.domain).join("+")} className="relative">
                    <span
                      className="absolute -start-[1.42rem] top-2 h-2 w-2 rounded-full"
                      style={{ background: primary ? "var(--clr-primary)" : "var(--clr-surface-border)" }}
                      aria-hidden
                    />
                    <p className="font-medium text-content">
                      {group.steps.map((s) => s.label).join(" · ")}
                    </p>

                    {primary ? (
                      <>
                        <div className="mt-2 space-y-2">
                          <ResourceRow
                            resource={primary}
                            recommendedLabel={labels.recommended}
                            startLabel={labels.start}
                            recommended
                          />
                          {alsoVisible.map((resource) => (
                            <ResourceRow
                              key={resource.url}
                              resource={resource}
                              recommendedLabel={labels.recommended}
                              startLabel={labels.start}
                            />
                          ))}
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

      {/* The path ends where the roadmap does: in a project. */}
      {tailStep && (
        <div className="mt-10">
          <p className="flex items-baseline gap-3">
            <span className="font-mono text-sm tabular-nums text-content-muted">→</span>
            <span className="font-display text-sm font-semibold uppercase tracking-wide text-content">
              {tailStep.label}
            </span>
          </p>
          <div className="mt-4 border-s ps-5">
            {matching(tailStep).length > 0 ? (
              <div className="space-y-2">
                {matching(tailStep).map((resource) => (
                  <ResourceRow
                    key={resource.url}
                    resource={resource}
                    recommendedLabel={labels.recommended}
                    startLabel={labels.start}
                    recommended
                  />
                ))}
              </div>
            ) : null}

            {/* The path does not end at someone else's video. Watching is how
                you learn it; building it is how you prove you did. */}
            {project && (
              <div
                className="mt-2 rounded-lg border p-4"
                style={{ background: "var(--clr-success-bg)", borderColor: "var(--clr-primary)" }}
              >
                <p className="font-medium text-content">{project.title}</p>
                <p className="mt-1 text-sm text-content-secondary">{project.body}</p>
                <Link href={project.href} className="btn btn-primary mt-3 h-10 px-4">
                  {project.cta}
                  <ArrowRight size={15} aria-hidden className="icon-directional" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

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

  const facts = [
    resource.by,
    isArabic ? "العربية" : "English",
    resource.level,
    runtime(resource.minutes),
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
        {/* `dir="auto"` infers direction from the first strong character.
            Deriving it from `language` right-aligned an English title that
            happened to belong to an Arabic course, which is common: creators
            write Arabic content under English titles. */}
        <span
          dir="auto"
          lang={isArabic ? "ar" : undefined}
          className="block font-medium leading-snug text-content"
        >
          {resource.title}
        </span>
        {/* Each fact is isolated. Joined into one string, the bidi algorithm
            reorders around the Arabic label and splits its neighbours — a
            20-minute video rendered as "20العربية · m". */}
        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-content-muted">
          {facts.map((fact, index) => (
            <span key={fact + index} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden>·</span>}
              <bdi>{fact}</bdi>
            </span>
          ))}
        </span>
      </span>
      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-sm text-content-secondary transition-colors group-hover:text-content">
        {startLabel}
        <ExternalLink size={13} aria-hidden />
      </span>
    </a>
  );
}

interface MergedGroup {
  steps: JourneyStep[];
  resources: JourneyResource[];
}

/**
 * Collapse consecutive steps whose recommended course is the same one.
 *
 * Only consecutive steps merge: a course shared by two distant parts of the
 * path is a different situation, and joining them would imply an adjacency the
 * roadmap does not claim.
 */
function mergeAdjacent(
  steps: JourneyStep[],
  matching: (step: JourneyStep) => JourneyResource[],
): MergedGroup[] {
  const groups: MergedGroup[] = [];
  for (const step of steps) {
    const resources = matching(step);
    const previous = groups.at(-1);
    const sameTop =
      previous &&
      previous.resources[0] &&
      resources[0] &&
      previous.resources[0].url === resources[0].url;

    if (sameTop) {
      previous.steps.push(step);
      // Keep any alternative the merged step adds, without duplicating.
      for (const resource of resources) {
        if (!previous.resources.some((r) => r.url === resource.url)) {
          previous.resources.push(resource);
        }
      }
      continue;
    }
    groups.push({ steps: [step], resources });
  }
  return groups;
}
