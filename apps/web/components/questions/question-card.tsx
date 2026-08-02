"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/**
 * A question with its answer hidden behind a reveal.
 *
 * Showing the answer immediately turns the bank into a reading list. Making
 * the reader attempt it first — even silently — is what makes it practice
 * rather than review.
 */
export function QuestionCard({
  question,
  answer,
  meta,
  revealLabel,
  hideLabel,
  contentDir,
}: {
  question: string;
  answer: string;
  /**
   * Plain data, not a rendered fragment. A server-rendered `meta` node
   * serialised into the RSC payload once per question — 215 of them made the
   * page 621 KB. Props cross the boundary as data.
   */
  meta: {
    domain: string;
    domainColour: string;
    level: string;
    kind: string;
    chapterHref: string;
    chapterLabel: string;
  };
  revealLabel: string;
  hideLabel: string;
  /** "ltr" when the question is English on an RTL page. */
  contentDir?: "ltr";
}) {
  const [open, setOpen] = useState(false);

  return (
    <article className="card p-5">
      <h3
        dir={contentDir}
        lang={contentDir ? "en" : undefined}
        className="font-display font-semibold leading-snug text-content"
      >
        {question}
      </h3>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-content-muted">
        <span
          className="badge border px-2 py-0.5 font-mono text-[11px]"
          style={{ color: meta.domainColour }}
        >
          {meta.domain}
        </span>
        <span>{meta.level}</span>
        <span>{meta.kind}</span>
        {/* Every question points back at the chapter that answers it — the
            bank is an entry point to the curriculum, not a parallel system. */}
        <Link href={meta.chapterHref} className="ms-auto text-primary hover:underline">
          {meta.chapterLabel} →
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        {open ? hideLabel : revealLabel}
        <ChevronDown
          size={14}
          aria-hidden
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <p
          dir={contentDir}
          lang={contentDir ? "en" : undefined}
          className="mt-3 border-t pt-3 text-sm leading-relaxed text-content-secondary"
        >
          {answer}
        </p>
      )}
    </article>
  );
}
