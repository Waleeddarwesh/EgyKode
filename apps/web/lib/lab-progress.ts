"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Lab progress, stored in the browser.
 *
 * A lab is complete when its success criteria are ticked — there is no second
 * "done" flag, because two stores would eventually disagree about the same
 * lab. The checklist on a lab page and the circle on the project path are two
 * views of this one record.
 *
 * The key and the shape were duplicated in the checklist and the path, which
 * is how the two could drift apart; they live here now.
 *
 * `storage` events only fire in *other* tabs, so a custom event carries the
 * change to listeners in this one — without it, ticking a lab on the path
 * leaves the progress bar directly above it showing a stale count.
 *
 * Signed-in sync lands with accounts; until then this is device-local.
 */
export const LAB_CRITERIA_KEY = "egykode_lab_criteria";
const LAB_CRITERIA_EVENT = "egykode:lab-criteria";

/** Ticked criterion indices, keyed by lab id. */
export type LabCriteria = Record<string, number[]>;

export function readLabCriteria(): LabCriteria {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LAB_CRITERIA_KEY) ?? "{}") as LabCriteria;
  } catch {
    // Corrupt or unavailable storage (private mode, quota) is not an error
    // worth showing anyone — it just means no progress yet.
    return {};
  }
}

export function writeLabCriteria(all: LabCriteria): void {
  try {
    localStorage.setItem(LAB_CRITERIA_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable — progress simply does not persist */
  }
  window.dispatchEvent(new CustomEvent(LAB_CRITERIA_EVENT));
}

/**
 * Mark a whole lab done, or clear it.
 *
 * Completing writes every index, which is what "I did all of it" means in a
 * store keyed by ticked criteria. Clearing removes the lab's entry entirely
 * rather than writing an empty array, so an untouched lab and a deliberately
 * cleared one are stored identically — there is no third state to explain.
 */
export function setLabDone(labId: string, criteriaCount: number, done: boolean): void {
  const all = readLabCriteria();
  if (done) all[labId] = Array.from({ length: criteriaCount }, (_, i) => i);
  else delete all[labId];
  writeLabCriteria(all);
}

/**
 * Subscribe to the store.
 *
 * `null` until it has been read, so a first render can show nothing rather
 * than flashing an empty checklist at someone who is mid-way through.
 */
export function useLabCriteria(): {
  criteria: LabCriteria | null;
  setDone: (labId: string, criteriaCount: number, done: boolean) => void;
} {
  const [criteria, setCriteria] = useState<LabCriteria | null>(null);

  useEffect(() => {
    const sync = () => setCriteria(readLabCriteria());
    sync();
    window.addEventListener(LAB_CRITERIA_EVENT, sync);
    window.addEventListener("storage", sync); // another tab changed it
    return () => {
      window.removeEventListener(LAB_CRITERIA_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setDone = useCallback((labId: string, criteriaCount: number, done: boolean) => {
    setLabDone(labId, criteriaCount, done);
    setCriteria(readLabCriteria());
  }, []);

  return { criteria, setDone };
}
