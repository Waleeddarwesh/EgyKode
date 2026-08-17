"use client";

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
 * It is a position indicator, not a checklist — the criteria are what get
 * ticked. Conflating the two would let someone "complete" a lab by scrolling.
 */
export function LabSteps({
  steps,
  labels,
}: {
  steps: LabStep[];
  labels: { heading: string; position: string };
}) {
  const [activeIndex, setActiveIndex] = useState(0);

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
        className="pointer-events-none fixed inset-y-0 start-0 z-20 hidden w-[max(0px,calc((100vw-48rem)/2-1.5rem))] items-center justify-end pe-4 xl:flex"
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
