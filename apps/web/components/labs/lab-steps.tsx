"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import type { LabStep } from "@/lib/labs";
import { readLabCriteria, useLabCriteria, writeLabCriteria } from "@/lib/lab-progress";

/**
 * Where you are inside a long lab.
 *
 * A lab runs to several thousand pixels, and the only way to know how far
 * through the work you were was to scroll and guess. This tracks the section
 * currently in view: a rail beside the content on a wide screen, a single line
 * of "Step 3 of 8" with a bar on a narrow one.
 *
 * Position and criteria are shown together but stay distinct: scrolling moves
 * the indicator, and only a deliberate tick marks a criterion. Conflating them
 * would let someone "complete" a lab by scrolling to the bottom.
 *
 * The criteria are repeated here because the checklist sits above the work.
 * Finishing a step meant scrolling back up the page to record it, and then
 * scrolling down again to find your place — every single time. This is the
 * same record, reachable from wherever the reader actually is.
 */
export function LabSteps({
  steps,
  labId,
  criteria,
  labels,
}: {
  steps: LabStep[];
  labId: string;
  /** Criterion text only; the evidence label lives with the full checklist. */
  criteria: string[];
  labels: { heading: string; position: string; criteria: string; of: string; railHint: string };
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { criteria: store } = useLabCriteria();

  // Reads and writes the same record as the checklist above and the circles on
  // the labs index, so a tick here is not a second source of truth. Derived
  // from storage at the moment of the write for the same reason the checklist
  // is: two toggles in one tick would otherwise both read the pre-click value.
  const ticked = new Set(store?.[labId] ?? []);
  const toggle = (index: number) => {
    const all = readLabCriteria();
    const next = new Set(all[labId] ?? []);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    if (next.size === 0) delete all[labId];
    else all[labId] = [...next];
    writeLabCriteria(all);
  };

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
        <ol className="pointer-events-auto max-h-[70vh] w-full max-w-[13rem] overflow-y-auto">
          {steps.map((step, i) => {
            const active = i === activeIndex;
            return (
              <li key={step.id}>
                <a
                  href={`#${step.id}`}
                  aria-current={active ? "step" : undefined}
                  className={`flex items-start gap-2 border-s-2 py-1.5 text-xs transition-colors ${
                    step.depth === 3 ? "ps-6" : "ps-3"
                  }`}
                  style={{
                    borderInlineStartColor: active ? "var(--clr-primary)" : "var(--clr-surface-active)",
                    color: active ? "var(--clr-text)" : "var(--clr-text-muted)",
                    // Sub-steps sit quieter than the section that contains them.
                    fontWeight: step.depth === 2 ? 500 : 400,
                  }}
                >
                  <span className="line-clamp-2">{step.title}</span>
                </a>
              </li>
            );
          })}
        </ol>

        {/* Criteria as numbered chips, not text.
            The rail is ~13rem wide; full criterion sentences truncated
            mid-word and, struck through when done, became unreadable. A
            number carries the same identity as the checklist above — which is
            numbered 01-04 — and the full text is one hover away. */}
        {criteria.length > 0 && (
          <div className="pointer-events-auto mt-6 w-full max-w-[13rem]">
            <p className="mb-2 flex items-baseline justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-content-muted">
              {labels.criteria}
              <span className="tabular-nums">
                {ticked.size}/{criteria.length}
              </span>
            </p>
            {/* Says the chips are pressable. Discovered by nobody
                otherwise — the same reason the labs index carries a hint over
                its circles. */}
            <p className="mb-2 text-[10px] leading-snug text-content-muted">{labels.railHint}</p>
            <div className="flex flex-wrap gap-1.5">
              {criteria.map((text, i) => {
                const done = ticked.has(i);
                return (
                  <button
                    key={text}
                    type="button"
                    onClick={() => toggle(i)}
                    aria-pressed={done}
                    aria-label={text}
                    title={text}
                    // Hover state and a pointer cursor, because a bordered
                    // number reads as a badge rather than a control — nothing
                    // about it says it can be pressed until you touch it.
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border font-mono text-[11px] tabular-nums transition-colors hover:border-[var(--clr-primary)] hover:text-content"
                    style={
                      done
                        ? { background: "var(--clr-primary)", borderColor: "var(--clr-primary)", color: "var(--clr-text-inverse)" }
                        : { borderColor: "var(--clr-surface-border)", color: "var(--clr-text-muted)" }
                    }
                  >
                    {done ? <Check size={13} aria-hidden /> : String(i + 1).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
            {/* Criteria progress travels with the position on a phone, where
                the rail cannot fit — so the count is visible without scrolling
                back to the checklist even if ticking still happens there. */}
            {criteria.length > 0 && (
              <span className="ms-2" style={{ color: "var(--clr-primary)" }}>
                {ticked.size}/{criteria.length}
              </span>
            )}
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
