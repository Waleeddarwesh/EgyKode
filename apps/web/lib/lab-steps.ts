"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * "I've run it" marks, stored in the browser.
 *
 * Deliberately a different store from `lab-progress`, and deliberately not a
 * second definition of "done".
 *
 * A lab is complete when its success criteria are ticked — that is the one
 * record, and the comment in lab-progress.ts exists because two stores for the
 * same fact drifted apart once already. Step marks answer a different
 * question: *where was I*. A learner who marks four steps has not completed the
 * lab, and a learner who completes the lab need never have touched a step mark.
 *
 * Keeping them apart means neither has to be reconciled with the other, and
 * losing this one costs a reader their place rather than their progress.
 */
const STEP_KEY = "egykode_lab_steps";
const STEP_EVENT = "egykode:lab-steps";

/** Marked step numbers, keyed by lab id. */
export type LabStepMarks = Record<string, number[]>;

export function readStepMarks(): LabStepMarks {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STEP_KEY) ?? "{}") as LabStepMarks;
  } catch {
    return {};
  }
}

function writeStepMarks(all: LabStepMarks): void {
  try {
    localStorage.setItem(STEP_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable — the mark simply does not persist */
  }
  window.dispatchEvent(new CustomEvent(STEP_EVENT));
}

/**
 * Read and toggle one lab's step marks.
 *
 * `ready` distinguishes "no steps marked" from "not read yet". Without it the
 * first paint says nothing is done, and a reader returning to step 4 watches
 * every step flick from unmarked to marked — which reads as the page losing
 * their progress and then finding it again.
 */
export function useStepMarks(labId: string) {
  const [marked, setMarked] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setMarked(readStepMarks()[labId] ?? []);
    sync();
    setReady(true);
    window.addEventListener(STEP_EVENT, sync);
    // Fires only in other tabs; the custom event covers this one.
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STEP_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [labId]);

  const toggle = useCallback(
    (step: number) => {
      const all = readStepMarks();
      const current = new Set(all[labId] ?? []);
      if (current.has(step)) current.delete(step);
      else current.add(step);
      if (current.size) all[labId] = [...current].sort((a, b) => a - b);
      else delete all[labId];
      writeStepMarks(all);
    },
    [labId],
  );

  return { marked, ready, toggle };
}
