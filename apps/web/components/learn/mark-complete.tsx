"use client";

import { Check, Circle } from "lucide-react";

import { useProgress } from "@/lib/progress";

/**
 * "I've finished this" — at the bottom of a chapter.
 *
 * Progress already existed, but only the roadmap page could set it, so a reader
 * who went chapter → chapter never recorded anything and the roadmap stayed at
 * 0%. This writes to the same store, and the roadmap and home-page cards pick
 * the change up immediately (§6.3).
 *
 * Rendered as a real toggle button rather than a checkbox: it performs an
 * action, and `aria-pressed` states the result for screen readers.
 */
export function MarkComplete({
  contentId,
  labels,
}: {
  contentId: string;
  labels: { mark: string; done: string; storedLocally: string };
}) {
  const { done, toggle } = useProgress();

  // Until the store is read, render a placeholder of the same height so the
  // page does not jump when it resolves.
  if (!done) return <div className="h-[42px]" aria-hidden />;

  const complete = done.has(contentId);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => toggle(contentId)}
        aria-pressed={complete}
        className={
          complete
            ? "badge border border-primary/40 bg-primary/10 px-3 py-2 text-primary transition-colors"
            : "badge border px-3 py-2 text-content-secondary transition-colors hover:border-primary/50 hover:text-content"
        }
      >
        {complete ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          <Circle className="h-4 w-4" aria-hidden />
        )}
        {complete ? labels.done : labels.mark}
      </button>
      <span className="text-xs text-content-muted">{labels.storedLocally}</span>
    </div>
  );
}
