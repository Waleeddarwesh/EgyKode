"use client";

import { useEffect, useState } from "react";

import type { Heading } from "@/lib/toc";

/**
 * "On this page" — a sticky contents rail with scroll-spy.
 *
 * Long-form prose is capped at a 72ch measure for readability, which on a wide
 * screen leaves the rest of the row empty. This puts that space to work rather
 * than widening the text, which would make it harder to read.
 *
 * The active heading is marked with a filled rail segment and a weight change,
 * not colour alone — a reader scanning a forty-entry list needs position to be
 * detectable at a glance, and colour-only state fails for anyone who cannot
 * distinguish it (§3.2).
 */
export function TableOfContents({
  headings,
  label,
  contentDir,
  contentLang,
}: {
  headings: Heading[];
  label: string;
  /** Set to "ltr" when the headings came from English source on an RTL page. */
  contentDir?: "ltr";
  contentLang?: string;
}) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (headings.length === 0) return;

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // rootMargin pins the "active" line near the top of the viewport: without
    // it, the last heading on screen wins and the marker lags a screenful
    // behind where the reader actually is.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav
      aria-labelledby="toc-heading"
      className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto"
    >
      <h2
        id="toc-heading"
        className="mb-3 text-xs font-semibold uppercase tracking-wide text-content-muted"
      >
        {label}
      </h2>

      <ul dir={contentDir} lang={contentLang} className="text-sm">
        {headings.map((heading) => {
          const isActive = heading.id === activeId;
          return (
            <li key={heading.id} className="relative">
              <a
                href={`#${heading.id}`}
                aria-current={isActive ? "location" : undefined}
                className={`block border-s py-1.5 transition-colors ${
                  heading.depth === 3 ? "ps-7" : "ps-4"
                } ${
                  isActive
                    ? "font-medium text-content"
                    : "text-content-secondary hover:text-content"
                }`}
                style={{
                  borderInlineStartColor: isActive
                    ? "var(--clr-primary)"
                    : "var(--clr-surface-border)",
                  borderInlineStartWidth: isActive ? "2px" : "1px",
                }}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
