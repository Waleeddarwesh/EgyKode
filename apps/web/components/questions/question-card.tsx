"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

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
  const answerId = useId();

  return (
    <article className="card flex h-full flex-col p-5">
      <h3
        dir={contentDir}
        lang={contentDir ? "en" : undefined}
        className="font-display font-semibold leading-snug text-content"
      >
        {question}
      </h3>

      {/* mt-auto pushes the footer down, so cards of different question
          lengths still line their metadata and controls up with each other.
          Without it a two-line question and a five-line one produced the
          ragged rows this grid is meant to avoid. */}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 text-xs text-content-muted">
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
        aria-controls={answerId}
        className="mt-3 inline-flex self-start items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        {open ? hideLabel : revealLabel}
        <ChevronDown
          size={14}
          aria-hidden
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Always in the DOM, hidden rather than unmounted.
          Two reasons: the FAQPage structured data on this page is only
          truthful if every answer is actually present in the HTML, and an
          answer that exists only after a click is invisible to search and to
          in-page find. Collapsed-behind-a-toggle is explicitly permitted. */}
      <p
        id={answerId}
        hidden={!open}
        dir={contentDir}
        lang={contentDir ? "en" : undefined}
        className="mt-3 border-t pt-3 text-sm leading-relaxed text-content-secondary"
      >
        {answer}
      </p>
    </article>
  );
}
