"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import type { LabStep } from "@/lib/labs";

/**
 * Where you are inside a long lab.
 *
 * A lab runs to several thousand pixels, and the only way to know how far
 * through the work you were was to scroll and guess. This tracks the section
 * currently in view: a rail beside the content on a wide screen, a single line
 * of "Step 3 of 8" with a bar on a narrow one.
 *
 * Position only. Scrolling moves the indicator and marks nothing — conflating
 * the two would let someone "complete" a lab by scrolling to the bottom.
 *
 * It used to carry the criteria checklist as well, because that checklist sat
 * above the work and recording a finished step meant scrolling back up to it.
 * The checklist now sits below the work and steps settle their own criteria,
 * so the copy here was redundant and, with a different total from the step
 * numbering beside it, actively confusing.
 */
export function LabSteps({
  steps,
  labId,
  labels,
}: {
  steps: LabStep[];
  labId: string;
  /** Criterion text only; the evidence label lives with the full checklist. */
  labels: { heading: string; position: string; of: string };
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  /**
   * Which steps are complete, read from the steps on the page.
   *
   * Not from a store. A step is done when its criterion is ticked, or when its
   * own mark is set if it declares no criterion — the rail would have to know
   * each step's criterion mapping to work that out again, which is the mapping
   * living in two places and eventually disagreeing.
   *
   * `data-done` is what the step already renders, so this observes the answer
   * rather than recomputing it.
   */
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const read = () =>
      setDoneIds(
        new Set(
          Array.from(document.querySelectorAll("section[data-step][data-done='true']")).map(
            (el) => `step-${el.getAttribute("data-step")}`,
          ),
        ),
      );
    read();

    /**
     * Watch the attribute, not the store that eventually changes it.
     *
     * Listening for the store's own event read the DOM before React had
     * re-rendered the step, so the rail was always one mark behind: completing
     * step 1 filled nothing, and completing all five filled four. A
     * MutationObserver fires after the attribute actually changes, which is
     * the moment the rail is asking about.
     */
    // Store events too, read after paint. The observer covers attribute
    // changes on steps that exist; this covers the first render, where the
    // stores are read during hydration and the attributes settle a frame
    // later than the event that caused them.
    const onStore = () => requestAnimationFrame(read);
    for (const e of ["egykode:lab-criteria", "egykode:lab-steps", "storage"]) {
      window.addEventListener(e, onStore);
    }

    const observer = new MutationObserver(read);
    for (const el of document.querySelectorAll("section[data-step]")) {
      observer.observe(el, { attributes: true, attributeFilter: ["data-done"] });
    }
    return () => {
      observer.disconnect();
      for (const e of ["egykode:lab-criteria", "egykode:lab-steps", "storage"]) {
        window.removeEventListener(e, onStore);
      }
    };
  }, [steps]);

  // Reads and writes the same record as the checklist above and the circles on
  // the labs index, so a tick here is not a second source of truth. Derived
  // from storage at the moment of the write for the same reason the checklist

  useEffect(() => {
    if (steps.length === 0) return;

    const headings = steps
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    // IntersectionObserver alone reports whichever heading crosses the line,
    // which flickers between neighbours on a fast scroll and reports nothing
    // at all once you are inside a long section with no heading on screen.
    // Reading positions on scroll answers the actual question: which heading
    // did I most recently pass?
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.25;
      let current = 0;
      for (let i = 0; i < headings.length; i += 1) {
        const el = headings[i];
        if (el && el.getBoundingClientRect().top <= line) current = i;
      }
      setActiveIndex(current);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [steps]);

  if (steps.length < 3) return null; // too short to get lost in

  const percent = Math.round(((activeIndex + 1) / steps.length) * 100);
  const position = labels.position
    .replace("{n}", String(activeIndex + 1))
    .replace("{total}", String(steps.length));

  return (
    <>
      {/* Wide screens: the rail sits in the margin beside the content, which
          on this layout is empty. `xl` and up only — below that the column is
          the whole viewport and a rail would sit on top of the prose. */}
      <nav
        aria-label={labels.heading}
        // flex-col, not the default row: a second child was landing beside the
        // section list rather than under it, so the rail rendered as two
        // columns spilling into the page margin.
        className="pointer-events-none fixed inset-y-0 start-0 z-20 hidden w-[max(0px,calc((100vw-48rem)/2-1.5rem))] flex-col justify-center pe-4 ps-4 xl:flex"
      >
        {/* A pipeline, not a list.
            Start at the top, End at the bottom, one node per step, filling in
            as the work is done — the shape a CI pipeline uses, because a lab is
            the same thing: an ordered run where you want to see how far it got
            at a glance. The line makes the order explicit, which a list of
            links only implied. */}
        <ol className="pointer-events-auto relative max-h-[78vh] w-full max-w-[13rem] overflow-y-auto py-1">
          <li className="relative flex items-center gap-3 ps-[7px]">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border"
              style={{ borderColor: "var(--clr-surface-border)", background: "var(--clr-bg)" }}
              aria-hidden
            />
            <span className="text-[10px] uppercase tracking-wide text-content-muted">Start</span>
          </li>

          {steps.map((step, i) => {
            const active = i === activeIndex;
            const done = doneIds.has(step.id);
            return (
              <li key={step.id} className="relative">
                {/* The connector, drawn behind the node. */}
                <span
                  className="absolute start-[12px] top-0 h-full w-px"
                  style={{ background: "var(--clr-surface-border)" }}
                  aria-hidden
                />
                <a
                  href={`#${step.id}`}
                  aria-current={active ? "step" : undefined}
                  className="relative flex items-center gap-3 py-2 text-xs transition-colors"
                  style={{ color: active ? "var(--clr-text)" : "var(--clr-text-muted)" }}
                >
                  <span
                    className="z-10 flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                    style={{
                      background: done ? "var(--clr-primary)" : "var(--clr-bg)",
                      borderColor: done
                        ? "var(--clr-primary)"
                        : active
                          ? "var(--clr-primary)"
                          : "var(--clr-surface-border)",
                      // The current step gets a halo rather than a fill, so it
                      // is never mistaken for a completed one.
                      boxShadow: active && !done ? "0 0 0 3px var(--clr-primary-pale)" : undefined,
                    }}
                    aria-hidden
                  >
                    {done && <Check size={11} strokeWidth={3} style={{ color: "var(--clr-text-inverse)" }} />}
                  </span>
                  <span className="line-clamp-2">{step.title}</span>
                </a>
              </li>
            );
          })}

          <li className="relative flex items-center gap-3 ps-[7px]">
            <span
              className="absolute start-[12px] top-0 h-1/2 w-px"
              style={{ background: "var(--clr-surface-border)" }}
              aria-hidden
            />
            <span
              className="z-10 h-2.5 w-2.5 shrink-0 rounded-full border"
              style={{ borderColor: "var(--clr-surface-border)", background: "var(--clr-bg)" }}
              aria-hidden
            />
            <span className="text-[10px] uppercase tracking-wide text-content-muted">End</span>
          </li>
        </ol>

      </nav>

      {/* Narrow screens: one line, pinned under the header. Anything taller
          competes with the content it is meant to help you read. */}
      {/* Not aria-hidden: the rail above is `display:none` below xl, which
          removes it from the accessibility tree entirely. Hiding this one too
          would leave a phone user with no position at all. Exactly one of the
          two is ever displayed, so neither needs to be suppressed. */}
      <div
        role="status"
        aria-label={labels.heading}
        className="sticky top-14 z-20 -mx-4 mb-4 border-b bg-surface/95 px-4 py-2 backdrop-blur xl:hidden"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-xs font-medium text-content-secondary">
            {steps[activeIndex]?.title}
          </p>
          <p className="shrink-0 font-mono text-[11px] tabular-nums text-content-muted">
            {position}
          </p>
        </div>
        <div
          className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full"
          style={{ background: "var(--clr-surface-active)" }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{ width: `${percent}%`, background: "var(--clr-primary)" }}
          />
        </div>
      </div>
    </>
  );
}
