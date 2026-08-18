"use client";

import { Check, Square } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { readLabCriteria, writeLabCriteria } from "@/lib/lab-progress";

/**
 * How strongly a criterion can be settled, expressed as weight rather than
 * hue. `command` and `state` can be shown to someone; `reasoning` is argued;
 * `self` is only asserted. Rendering all four identically told the learner
 * their own say-so carried the same authority as a running system.
 */
const EVIDENCE = {
  command: { rule: "var(--clr-primary)", label: "var(--clr-primary-dark)" },
  state: { rule: "var(--clr-primary)", label: "var(--clr-primary-dark)" },
  reasoning: { rule: "var(--clr-accent)", label: "var(--clr-text-secondary)" },
  self: { rule: "var(--clr-surface-active)", label: "var(--clr-text-muted)" },
} as const;

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
  /**
   * Plain strings for criteria the learner asserts; objects where the text
   * itself names the evidence. Both forms coexist in the frontmatter, so a
   * criterion is only marked verifiable when it genuinely is.
   */
  criteria: (string | { text: string; verify: "command" | "state" | "reasoning" })[];
  /** "ltr" when the criteria are English on an RTL page. */
  contentDir?: "ltr";
  labels: {
    heading: string; done: string; of: string; complete: string;
    /** How this criterion is settled — shown so a claim is not mistaken for a check. */
    evidenceCommand: string; evidenceState: string; evidenceReasoning: string; evidenceSelf: string;
  };
}) {
  // The frontmatter holds plain strings for criteria the learner simply
  // asserts, and objects where the text itself names the evidence. Normalising
  // here keeps every downstream index — including the stored progress — stable.
  const items = criteria.map((c) =>
    typeof c === "string" ? { text: c, verify: "self" as const } : c,
  );

  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Subscribed, not read once.
  //
  // The same criteria are now tickable from the sticky rail beside the work,
  // and this list read the store only on mount — so ticking there left the
  // checklist at the top of the page showing the old count until a reload. The
  // store already broadcasts; this listens.
  useEffect(() => {
    const sync = () => setChecked(new Set(readLabCriteria()[labId] ?? []));
    sync();
    window.addEventListener("egykode:lab-criteria", sync);
    window.addEventListener("storage", sync);
    setLoaded(true);
    return () => {
      window.removeEventListener("egykode:lab-criteria", sync);
      window.removeEventListener("storage", sync);
    };
  }, [labId]);

  const toggle = useCallback(
    (index: number) => {
      // Derived from the store rather than from `checked`, which is a render
      // closure: two toggles in the same tick both read the pre-click value,
      // and the second write erases the first. Storage is the single source of
      // truth here, so read it at the moment of the write.
      const all = readLabCriteria();
      const next = new Set(all[labId] ?? []);
      if (next.has(index)) next.delete(index);
      else next.add(index);

      // An empty entry is removed rather than stored, so a lab cleared here
      // and one never opened are identical on the project path.
      if (next.size === 0) delete all[labId];
      else all[labId] = [...next];
      writeLabCriteria(all);
      setChecked(next);
    },
    [labId],
  );

  if (criteria.length === 0) return null;
  const done = loaded ? checked.size : 0;
  const allDone = done === criteria.length;

  return (
    <section
      id="success-criteria"
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
        {items.map((item, index) => {
          const isDone = checked.has(index);
          const evidence = EVIDENCE[item.verify];
          return (
            <li key={item.text}>
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-pressed={isDone}
                // A left rule keyed to how the criterion is settled. The
                // evidence model already distinguishes four strengths and the
                // page rendered all four identically, so a claim the learner
                // simply asserted looked exactly like one the system can show.
                // Weight, not colour — eleven criteria in four bright colours
                // would read as decoration.
                className="flex w-full items-start gap-3 rounded-md border-s-2 p-2 ps-3 text-start transition-colors hover:bg-surface-hover"
                style={{ borderInlineStartColor: evidence.rule }}
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
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm ${isDone ? "text-content-muted line-through decoration-1" : "text-content-secondary"}`}
                  >
                    {/* Numbered, so a criterion can be referred to out loud
                        and in the completion summary. */}
                    <span className="me-2 font-mono text-xs tabular-nums text-content-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.text}
                  </span>
                  {/* What settles this one. Shown so a ticked box is not read
                      as a verification the platform never performed — "self"
                      says plainly that the learner asserted it. */}
                  <span
                    className="mt-0.5 block text-[11px] uppercase tracking-wide"
                    style={{ color: evidence.label }}
                  >
                    {item.verify === "command"
                      ? labels.evidenceCommand
                      : item.verify === "state"
                        ? labels.evidenceState
                        : item.verify === "reasoning"
                          ? labels.evidenceReasoning
                          : labels.evidenceSelf}
                  </span>
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
