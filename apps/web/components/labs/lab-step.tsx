"use client";

import { AlertTriangle, Check, ChevronDown, Eye, HelpCircle, Lightbulb, Target } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStepMarks } from "@/lib/lab-steps";
import { setCriterion, useLabCriteria } from "@/lib/lab-progress";

/**
 * One step of a lab.
 *
 * A container of optional parts, not a template. The author decides which of
 * `Why`, `Expect`, `Hint`, `ProductionNote` and `Incident` a step needs, and
 * writes ordinary prose and code fences between them — so the existing writing
 * survives being wrapped, which is the whole point. A step with nothing but
 * prose and a command is a valid step.
 *
 * What the component adds is the interaction the prose cannot carry on its
 * own: a heading that states what the step proves before it is attempted, and
 * a place to say "I have run this" so the reader knows where they are.
 *
 * EgyKode is a static export. Nothing here checks anything — "I've run it" is
 * the reader's own claim, exactly as the success criteria are.
 */

const StepContext = createContext<{ labId: string; n: number } | null>(null);

/** Asks one step to open, by number. */
const OPEN_STEP = "egykode:open-step";

/**
 * Move the reader to whatever comes next after finishing a step.
 *
 * Completing a step collapses it, so the page gets shorter while the scroll
 * offset stays where it was — the reader is left further down than they were,
 * looking at something they did not choose. On the last step that meant
 * landing at the very bottom of the page, past the checklist their work had
 * just ticked.
 *
 * Runs after paint, because the element being scrolled to has only just moved.
 */
function handOff(n: number) {
  requestAnimationFrame(() => {
    const next = document.querySelector(`section[data-step="${n + 1}"]`);
    if (next) {
      // Ask the next step to open itself. Steps do not know about each other,
      // and every step already listens; the alternative was lifting open/closed
      // state into a parent that MDX gives no place to put.
      window.dispatchEvent(new CustomEvent(OPEN_STEP, { detail: n + 1 }));
      next.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const end = document.getElementById("lab-complete") ?? document.getElementById("success-criteria");
    end?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export function LabStep({
  n,
  title,
  proves,
  criterion,
  labId,
  totalCriteria = 0,
  children,
}: {
  n: number;
  title: string;
  /** What the reader can do afterwards. Shown before the work, not after. */
  proves?: string;
  /**
   * The success criterion this step settles, counted from 1.
   *
   * Marking the step run then ticks that criterion too, so a reader who works
   * through the steps is not asked to re-confirm the same thing in a checklist
   * underneath. Declared rather than inferred from position: steps and criteria
   * align one-to-one in some labs and not in others, and a positional guess
   * would tick the wrong box in every lab where they differ.
   *
   * Optional. A step that proves nothing on the checklist simply omits it.
   */
  criterion?: number | number[];
  labId: string;
  /**
   * How many criteria the lab declares, bound by the MDX component map.
   *
   * Only a step settling none of them reads this, and only to answer one
   * question: is the lab already finished? Defaults to 0, which reads as
   * "unknown" and leaves such a step on its own mark — the behaviour before
   * this prop existed, and the right fallback anywhere the count is absent.
   */
  totalCriteria?: number;
  children: ReactNode;
}) {
  const { marked, ready, toggle } = useStepMarks(labId);
  const { criteria } = useLabCriteria();

  /**
   * Done, from one place.
   *
   * A step that names a criterion *is* that criterion — it does not keep a
   * second opinion about the same fact. Marking the step ticked the criterion
   * but reading its own store meant unticking the criterion in the checklist
   * left the step still showing "done", and the page then disagreed with
   * itself in two visible spots.
   *
   * Steps without a criterion keep their own mark — and, once every criterion
   * is met, follow the lab. Left on the mark alone, an explanatory step sat
   * unticked under a page already showing "all criteria met", so the rail and
   * the completion card disagreed about a lab that was plainly finished.
   */
  // A step can settle more than one criterion: five steps of work commonly
  // prove four criteria, and a lab whose last criterion mapped to no step
  // could never be completed by working through the steps at all.
  const owned = criterion === undefined ? [] : Array.isArray(criterion) ? criterion : [criterion];

  // Counted the way the completion card counts it — length, not membership —
  // so the two cannot reach different answers about the same lab. Criteria are
  // stored deduplicated, so the length is the number of distinct ones ticked.
  const labComplete = totalCriteria > 0 && (criteria?.[labId]?.length ?? 0) >= totalCriteria;

  /**
   * An unowned step whose done-ness comes from the lab rather than the reader.
   *
   * It gets no "I've run this" button: the mark records *where was I*, and
   * once every criterion is met there is no place left to be. Offering the
   * toggle anyway would be offering a control that cannot change what it
   * shows — clicking it would write the mark and leave the step still done.
   */
  const settledByLab = !owned.length && labComplete;

  const done = owned.length
    ? owned.every((c) => Boolean(criteria?.[labId]?.includes(c - 1)))
    : (ready && marked.includes(n)) || labComplete;

  /**
   * Open or closed.
   *
   * `null` means "nobody has said", and the step follows the lab: the first
   * step is open, later ones are closed, and a step closes once it is marked.
   * Once the reader clicks a header, their choice is held — a step that
   * reopened itself because the state behind it changed would be the page
   * arguing with them.
   *
   * The default is deliberately not "everything open". A reader arriving at
   * five expanded steps has the whole lab in front of them at once, which is
   * the working-memory problem the format exists to remove.
   */
  const [choice, setChoice] = useState<boolean | null>(null);

  // Opened by the step before it, on completion.
  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent<number>).detail === n) setChoice(true);
    };
    window.addEventListener(OPEN_STEP, onOpen);
    return () => window.removeEventListener(OPEN_STEP, onOpen);
  }, [n]);

  const open = choice ?? false;

  return (
    <StepContext.Provider value={{ labId, n }}>
      {/* The anchor is the section, so the "Step N" label is inside what the
          rail targets rather than above it. The sticky header needs no handling
          here — `scroll-padding-top` on <html> already offsets every anchor on
          the site, which two attempted tests of it demonstrated by passing
          against a deliberately broken version. */}
      <section
        id={`step-${n}`}
        className="card mt-8 overflow-hidden"
        aria-labelledby={`step-${n}-title`}
        data-step={n}
        data-done={done ? "true" : "false"}
      >
        {/* A rule that fills in when the step is marked, so position in the
            lab is readable from a glance down the page rather than only from
            the rail beside it. */}
        <div
          className="h-1 w-full transition-colors"
          style={{ background: done ? "var(--clr-success)" : "var(--clr-border)" }}
          aria-hidden
        />

        {/* The whole header toggles, not a chevron in the corner. The target
            is the thing the reader is already looking at, and on a phone a
            16px affordance beside a two-line title is a miss waiting to
            happen. */}
        <button
          type="button"
          onClick={() => setChoice(!open)}
          aria-expanded={open}
          aria-controls={`step-${n}-body`}
          className="flex w-full items-start gap-3 p-6 text-start transition-colors hover:bg-surface-active"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
              Step {n}
              {done && (
                <span className="inline-flex items-center gap-1" style={{ color: "var(--clr-success)" }}>
                  <Check size={12} aria-hidden />
                  done
                </span>
              )}
            </span>
            <span
              id={`step-${n}-title`}
              className="mt-1 block font-display text-lg font-semibold text-content"
            >
              {title}
            </span>
            {/* Visible while collapsed too: closed, this is the only thing
                telling the reader whether the step is the one they want. */}
            {proves && !open && (
              <span className="mt-2 block text-sm leading-relaxed text-content-muted">{proves}</span>
            )}
          </span>
          <ChevronDown
            size={18}
            aria-hidden
            className="mt-1 shrink-0 text-content-muted transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          />
        </button>

        <div id={`step-${n}-body`} className="px-6 pb-6" hidden={!open}>
          {proves && (
            <p className="mt-3 flex gap-2 text-sm leading-relaxed text-content-secondary">
              <Target size={15} className="mt-0.5 shrink-0" style={{ color: "var(--clr-primary)" }} aria-hidden />
              <span>
                <span className="font-semibold text-content">What you are proving: </span>
                {proves}
              </span>
            </p>
          )}

          {/* Which criterion this step settles, said out loud.
              Marking a step that settles none fills its circle and moves the
              "0 of 4" count not at all, which reads as the button failing.
              Naming the link makes its absence mean something: this step is
              work the checklist does not score, rather than a broken tick. */}
          <p className="mt-3 text-xs text-content-muted">
            {owned.length
              ? `Marking this settles success ${owned.length === 1 ? "criterion" : "criteria"} ${owned.join(" and ")}.`
              : "This step settles no success criterion on its own."}
          </p>

          <div className="prose prose-sm mt-4 max-w-none">{children}</div>

          {settledByLab ? (
            // Said rather than shown as a pressed button, so the reader can
            // see why this step is ticked when they never ticked it.
            <p className="mt-5 flex items-center gap-2 text-sm text-content-muted">
              <Check size={15} aria-hidden style={{ color: "var(--clr-success)" }} />
              Every success criterion for this lab is met.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                // Write to whichever store backs this step, not to both: a
                // criterion-backed step reads from criteria, so also keeping a
                // step mark would leave a stale record behind it.
                if (owned.length) for (const c of owned) setCriterion(labId, c - 1, !done);
                else toggle(n);
                if (!done) handOff(n);
                // Collapse on completion and hand the page to the next step:
                // `null` returns this step to following the lab, and the step
                // after it becomes the first unmarked one.
                if (!done) setChoice(false);
                else setChoice(null);
              }}
              aria-pressed={done}
              className={`btn mt-5 h-10 px-4 ${done ? "btn-outline" : "btn-primary"}`}
            >
              {done ? (
                <>
                  <Check size={15} aria-hidden />
                  Step {n} complete
                </>
              ) : (
                "I've run this"
              )}
            </button>
          )}
        </div>
      </section>
    </StepContext.Provider>
  );
}

/** Why this step exists, before the commands. */
export function Why({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 border-s-2 ps-4" style={{ borderColor: "var(--clr-primary)" }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--clr-primary-dark)" }}>
        Why
      </p>
      <div className="mt-1 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">{children}</div>
    </div>
  );
}

/**
 * What the reader should see.
 *
 * The gap this fills is specific: a command runs, output appears, and nothing
 * tells the reader whether it was the right output. Left to infer it, a
 * beginner either assumes success or scrolls to the criteria to find out.
 */
export function Expect({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-md border p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
        <Eye size={13} aria-hidden />
        What you should see
      </p>
      <div className="mt-2 text-sm [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>pre]:mb-0">
        {children}
      </div>
    </div>
  );
}

/** Collapsed by default: available when stuck, invisible when not. */
export function Hint({ children, label = "Hint" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="btn btn-outline h-8 px-3 text-xs"
      >
        <HelpCircle size={13} aria-hidden />
        {open ? `Hide ${label.toLowerCase()}` : label}
      </button>
      {open && (
        <div className="mt-2 rounded-md border p-4 text-sm [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
          {children}
        </div>
      )}
    </div>
  );
}

/** Why this matters beyond the exercise. */
export function ProductionNote({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-4 rounded-md p-4"
      style={{ background: "var(--clr-surface-active)" }}
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--clr-primary-dark)" }}>
        <Lightbulb size={13} aria-hidden />
        In production
      </p>
      <div className="mt-2 text-sm [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">{children}</div>
    </div>
  );
}

/**
 * A deliberate failure, in the flow rather than in an appendix.
 *
 * Troubleshooting sat in a "When it goes wrong" block at the end of the page,
 * which meant it was read after the work was finished, if at all — the reader
 * met the failure modes having already stopped looking for them. Here the
 * break happens in the step that created the thing being broken.
 */
export function Incident({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="mt-5 rounded-md border p-4"
      style={{
        background: "var(--clr-warning-bg)",
        borderColor: "color-mix(in srgb, var(--clr-warning) 40%, transparent)",
      }}
    >
      <p
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--clr-warning)" }}
      >
        <AlertTriangle size={13} aria-hidden />
        Incident
      </p>
      <p className="mt-1 font-semibold text-content">{title}</p>
      <div className="mt-2 text-sm [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">{children}</div>
    </div>
  );
}

/** Used by the step components to know which lab and step they sit in. */
export function useStepContext() {
  return useContext(StepContext);
}

/**
 * The lab-level troubleshooting section.
 *
 * Collapsed like a step, and deliberately not looking like one. It carries no
 * number, no "I've run this" and no green completion rule, because it is not
 * work to be completed — it is what you open when something breaks. Left
 * expanded it was also the longest thing on the page, so a reader who had
 * finished the lab scrolled past several screens of failures they had not hit.
 *
 * Failures that belong to a single step live in that step as <Incident>. This
 * is for the ones that span the whole system, where the reader has to work out
 * which layer is at fault before they can even name the problem.
 */
export function Troubleshooting({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section id="troubleshooting" className="card mt-8 scroll-mt-24 overflow-hidden">
      <div className="h-1 w-full" style={{ background: "var(--clr-warning)" }} aria-hidden />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="troubleshooting-body"
        className="flex w-full items-start gap-3 p-6 text-start transition-colors hover:bg-surface-active"
      >
        <span className="min-w-0 flex-1">
          <span
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--clr-warning)" }}
          >
            <AlertTriangle size={13} aria-hidden />
            Reference
          </span>
          <span className="mt-1 block font-display text-lg font-semibold text-content">
            Troubleshooting &amp; Incidents
          </span>
          <span className="mt-2 block text-sm leading-relaxed text-content-muted">
            Not a step. Failures that span the whole system — open this when something breaks.
          </span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          className="mt-1 shrink-0 text-content-muted transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>
      <div id="troubleshooting-body" className="px-6 pb-6" hidden={!open}>
        <div className="prose prose-sm max-w-none">{children}</div>
      </div>
    </section>
  );
}
