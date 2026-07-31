"use client";

import { Check, Square } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "egykode_lab_criteria";

/**
 * The success criteria checklist.
 *
 * A lab is finished when its criteria are met, not when the page is scrolled
 * to the bottom — so the criteria are the progress indicator, ticked by the
 * learner as they verify each one. State is per-lab in localStorage until
 * accounts sync it.
 *
 * On a challenge this is the entire instruction set: the goal and the bar,
 * with the steps deliberately absent (§6.0).
 */
export function SuccessCriteria({
  labId,
  criteria,
  labels,
  contentDir,
}: {
  labId: string;
  criteria: string[];
  /** "ltr" when the criteria are English on an RTL page. */
  contentDir?: "ltr";
  labels: { heading: string; done: string; of: string; complete: string };
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, number[]>;
      setChecked(new Set(all[labId] ?? []));
    } catch {
      /* storage unavailable */
    }
    setLoaded(true);
  }, [labId]);

  const toggle = useCallback(
    (index: number) => {
      const next = new Set(checked);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      setChecked(next);
      try {
        const all = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, number[]>;
        all[labId] = [...next];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch {
        /* ignore */
      }
    },
    [checked, labId],
  );

  if (criteria.length === 0) return null;
  const done = loaded ? checked.size : 0;
  const allDone = done === criteria.length;

  return (
    <section
      className="card p-5"
      style={allDone ? { borderColor: "var(--clr-primary)", background: "var(--clr-success-bg)" } : undefined}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display font-semibold text-content">{labels.heading}</h2>
        <p className="text-sm tabular-nums text-content-secondary">
          {done} {labels.of} {criteria.length}
        </p>
      </div>

      <ul dir={contentDir} lang={contentDir ? "en" : undefined} className="space-y-1">
        {criteria.map((criterion, index) => {
          const isDone = checked.has(index);
          return (
            <li key={criterion}>
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-pressed={isDone}
                className="flex w-full items-start gap-3 rounded-md p-2 text-start transition-colors hover:bg-surface-hover"
              >
                {isDone ? (
                  <Check
                    size={16}
                    aria-hidden
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--clr-primary)" }}
                  />
                ) : (
                  <Square size={16} aria-hidden className="mt-0.5 shrink-0 text-content-muted" />
                )}
                <span
                  className={`text-sm ${isDone ? "text-content-muted line-through decoration-1" : "text-content-secondary"}`}
                >
                  {criterion}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {allDone && (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-primary" aria-live="polite">
          <Check size={15} aria-hidden />
          {labels.complete}
        </p>
      )}
    </section>
  );
}
