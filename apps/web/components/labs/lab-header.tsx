import { Clock, DollarSign, Swords, Target, TriangleAlert, Wrench } from "lucide-react";
import Link from "next/link";

import type { LabMeta } from "@/lib/labs";
import { costTierOf } from "@/lib/labs";

/**
 * The mission card at the top of a lab.
 *
 * The page used to open with a badge, a title, "47 min · Intermediate" and a
 * generic billing warning — everything except the one thing a reader needs
 * first, which is what they are about to build. The lab's own description was
 * rendered nowhere at all.
 *
 * A reader should understand the task, the commitment and the financial risk
 * within a few seconds, and be able to start without scrolling.
 */

const TIER = {
  free: {
    label: "Free",
    detail: "No billable cloud resources",
    icon: DollarSign,
    fg: "var(--clr-success)",
    bg: "var(--clr-success-bg)",
  },
  low: {
    label: "Low cost",
    detail: "Inside the free tier for a short session",
    icon: DollarSign,
    fg: "var(--clr-warning)",
    bg: "var(--clr-warning-bg)",
  },
  billable: {
    label: "Billable",
    detail: "Costs money while it runs — destroy it when you finish",
    icon: TriangleAlert,
    fg: "var(--clr-danger)",
    bg: "var(--clr-danger-bg)",
  },
} as const;

export function LabHeader({
  lab,
  locale,
  colour,
  contentDir,
  position,
  labels,
}: {
  lab: LabMeta;
  locale: string;
  colour: string;
  contentDir?: "ltr";
  /**
   * Where this lab sits on the project path. Absent for library-only labs,
   * which genuinely have no position to report.
   */
  position?: { phaseNumber: string; phaseTitle: string };
  labels: {
    guided: string;
    challenge: string;
    incident: string;
    /** "Lab 01 / 59", already interpolated. Paired with `position`. */
    counter?: string;
    minutes: string;
    level: string;
    objectives: string;
    start: string;
    tryChallenge: string;
    viewGuided: string;
    destructive: string;
  };
}) {
  const tier = TIER[costTierOf(lab)];
  const TierIcon = tier.icon;

  const kind =
    lab.tier === "challenge" ? labels.challenge : lab.tier === "incident" ? labels.incident : labels.guided;
  const KindIcon = lab.tier === "guided" ? Wrench : Swords;

  return (
    <header className="card overflow-hidden p-0">
      {/* A coloured rule keyed to the domain, so labs are recognisable at a
          glance without another badge competing for attention. */}
      <div className="h-1 w-full" style={{ background: colour }} aria-hidden />

      <div className="p-6 sm:p-7">
        {/* Where you are, before what this is. A lab page that opens with a
            title and a badge answers "what is this" and leaves "am I in the
            right place, and how far along am I" to be reconstructed from the
            labs index. The counter is the whole point: 59 labs is a project,
            and a reader should always be able to see their position in it. */}
        {position && (
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-3">
            <span
              className="font-mono text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: colour }}
            >
              {position.phaseNumber} · {position.phaseTitle}
            </span>
            {labels.counter && (
              <span className="font-mono text-[11px] uppercase tracking-wide tabular-nums text-content-muted">
                {labels.counter}
              </span>
            )}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className="badge px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide"
            style={{ background: "var(--clr-surface-active)", color: colour }}
          >
            <KindIcon size={12} aria-hidden />
            {kind}
          </span>
          <span className="badge border px-2.5 py-1 text-xs text-content-secondary">
            {lab.domain}
          </span>
          {/* Loud, and separate from cost: money is recoverable, data is not. */}
          {lab.destructive && (
            <span
              className="badge px-2.5 py-1 text-xs"
              style={{ background: "var(--clr-danger-bg)", color: "var(--clr-danger)" }}
            >
              <TriangleAlert size={12} aria-hidden />
              {labels.destructive}
            </span>
          )}
        </div>

        <h1
          dir={contentDir}
          lang={contentDir ? "en" : undefined}
          className="font-display text-[clamp(1.7rem,3.6vw,2.3rem)] font-bold leading-tight tracking-tight text-content"
        >
          {lab.title}
        </h1>

        {/* The mission. This is the sentence the page was missing. */}
        {lab.description && (
          <p
            dir={contentDir}
            lang={contentDir ? "en" : undefined}
            className="mt-3 max-w-2xl text-lg leading-relaxed text-content-secondary"
          >
            {lab.description}
          </p>
        )}

        <dl className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <div className="inline-flex items-center gap-1.5 text-content-secondary">
            <Clock size={15} aria-hidden />
            <dt className="sr-only">Time</dt>
            <dd>{labels.minutes}</dd>
          </div>
          <div className="inline-flex items-center gap-1.5 text-content-secondary">
            <dt className="sr-only">Level</dt>
            <dd>{labels.level}</dd>
          </div>
          {(lab.successCriteria?.length ?? 0) > 0 && (
            <div className="inline-flex items-center gap-1.5 text-content-secondary">
              <Target size={15} aria-hidden />
              <dt className="sr-only">Objectives</dt>
              <dd>{labels.objectives}</dd>
            </div>
          )}
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ background: tier.bg, color: tier.fg }}
          >
            <TierIcon size={13} aria-hidden />
            <dt className="sr-only">Cost</dt>
            <dd>{tier.label}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#build" className="btn btn-primary h-10 px-5">
            {labels.start}
          </a>
          {lab.challengeId && (
            <Link href={`/${locale}/labs/${lab.challengeId}`} className="btn btn-outline h-10 px-5">
              <Swords size={15} aria-hidden />
              {labels.tryChallenge}
            </Link>
          )}
          {lab.guidedLabId && (
            <Link href={`/${locale}/labs/${lab.guidedLabId}`} className="btn btn-outline h-10 px-5">
              <Wrench size={15} aria-hidden />
              {labels.viewGuided}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Everything a reader needs *before* they start: tools, what it will cost, and
 * how to undo it.
 *
 * Deliberately above the instructions. Discovering the cost of a NAT Gateway
 * after provisioning one is not a warning, it is an invoice.
 */
/**
 * `costEstimate` is frontmatter, not MDX, so its emphasis markers reach the
 * page as literal asterisks. Strip them, and drop a leading tier word that the
 * heading beside it already says.
 */
function plainCost(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^(Billable(, and never free)?|Free tier|Free|Partly billable|Low cost)[.,—-]*\s*/i, "")
    .trim();
}

export function BeforeYouStart({
  lab,
  labels,
}: {
  lab: LabMeta;
  labels: {
    heading: string;
    tools: string;
    cost: string;
    cleanup: string;
    skills: string;
    toolsProvided: string;
  };
}) {
  const tier = TIER[costTierOf(lab)];
  const hasAnything = lab.tools?.length || lab.costEstimate || lab.cleanup?.length;
  if (!hasAnything) return null;

  // Only claim the tools are provided where an environment actually provides
  // them. On a cloud-only lab they genuinely are the learner's to bring.
  const provided = Boolean(lab.handsOn?.local?.enabled || lab.handsOn?.online?.enabled);

  return (
    <section className="card mt-6 p-6" aria-labelledby="before-you-start">
      <h2 id="before-you-start" className="font-display text-lg font-semibold text-content">
        {labels.heading}
      </h2>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        {(lab.tools?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
              {labels.tools}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-content-secondary">
              {lab.tools?.map((tool) => (
                <li key={tool} className="flex gap-2">
                  <span className="text-primary" aria-hidden>
                    ✓
                  </span>
                  {tool}
                </li>
              ))}
            </ul>

            {/* Where the list stops being a barrier.
                A tick beside "Linux with systemd" and "sudo access" reads as
                a wall: things you must already own before this page is for
                you. For most labs it is not true — the lab environment below
                provides exactly these, and a beginner has no way to know that
                from a checklist. So when there is a way to get them, the list
                says so and points at it. */}
            {provided && (
              <p className="mt-3 text-xs leading-relaxed text-content-muted">
                <a href="#hands-on" className="underline underline-offset-2">
                  {labels.toolsProvided}
                </a>
              </p>
            )}
          </div>
        )}

        {(lab.skills?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
              {labels.skills}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-content-secondary">
              {lab.skills?.map((skill) => (
                <li key={skill} className="flex gap-2">
                  <span className="text-content-muted" aria-hidden>
                    →
                  </span>
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {lab.costEstimate && (
        <div
          className="mt-6 rounded-lg border p-4"
          style={{
            background: tier.bg,
            borderColor: `color-mix(in srgb, ${tier.fg} 40%, transparent)`,
          }}
        >
          <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: tier.fg }}>
            <tier.icon size={15} aria-hidden />
            {labels.cost} — {tier.label}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-content">
            {plainCost(lab.costEstimate)}
          </p>
          {/* The estimate is about the reader's own cloud account. When a
              browser scenario exists it costs nothing at all — the AWS labs
              run against LocalStack, which answers the real API without an
              account behind it. Saying so beside the warning matters: a cost
              notice with no qualification is the thing that stops somebody
              starting a lab they could have done for free. */}
          {lab.handsOn?.online?.enabled && (
            <p className="mt-2 text-sm leading-relaxed text-content">
              <strong>Nothing to pay in the browser.</strong> Open the terminal
              runs this against a simulated cloud — the same API calls and the
              same commands, with no account and no bill. The figure above
              applies only if you build it in your own.
            </p>
          )}
          {(lab.cleanup?.length ?? 0) > 0 && (
            <p className="mt-2 text-sm">
              <a href="#clean-up" className="font-medium underline underline-offset-2 text-content">
                {labels.cleanup} →
              </a>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
