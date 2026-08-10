"use client";

import { FileText, Map, Package, Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

import { search, type SearchDoc, type SearchHit } from "@/lib/search";
import type { Locale } from "@/lib/i18n";

const TYPE_ICON = { chapter: FileText, roadmap: Map, project: Package, section: FileText } as const;

export function CommandPalette({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { search: string; placeholder: string; empty: string; hint: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Marks the moment the keyboard shortcut is actually live (see the effect
  // below). Tests wait on this instead of a timeout.
  const [ready, setReady] = useState(false);
  // The palette must escape the header: `backdrop-filter` on an ancestor
  // creates a containing block for `position: fixed` descendants, so
  // `fixed inset-0` was resolving to the header's box — dimming only that
  // band and pinning the dialog under it. A portal to <body> is the fix.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ⌘K / Ctrl+K anywhere except inside a text field.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === "/" && !typing && !open) {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    setReady(true);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // The index is fetched on first open, never on page load — it must not cost
  // anything to a reader who never searches.
  useEffect(() => {
    if (!open || docs) return;
    let cancelled = false;
    fetch(`/search/${locale}.json`)
      .then((response) => response.json())
      .then((data: SearchDoc[]) => !cancelled && setDocs(data))
      .catch(() => !cancelled && setDocs([]));
    return () => {
      cancelled = true;
    };
  }, [open, docs, locale]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else {
      setQuery("");
      setHits([]);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    setHits(docs ? search(docs, query) : []);
    setActive(0);
  }, [query, docs]);

  const go = useCallback(
    (hit: SearchHit | undefined) => {
      if (!hit) return;
      setOpen(false);
      router.push(hit.url);
    },
    [router],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels.search}
        data-ready={ready ? "true" : undefined}
        className="btn btn-outline h-9 min-w-9 gap-2 px-2.5 text-content-muted sm:min-w-[13rem] sm:justify-start sm:px-3"
      >
        <SearchIcon size={15} aria-hidden />
        {/* Reads as a search field rather than a button, which is what people
            expect at this position — but stays a button, because it opens a
            dialog. The shortcut is discoverable inside the palette instead of
            being advertised as a glyph that means nothing on Windows. */}
        <span className="hidden flex-1 text-start text-sm sm:inline">{labels.search}</span>
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label={labels.search}
        >
          <button
            className="animate-scrim absolute inset-0 bg-black/60"
            aria-label="Close"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />

          <div className="animate-dialog relative w-full max-w-xl overflow-hidden rounded-xl border bg-surface shadow-xl">
            <div className="flex items-center gap-3 border-b px-4">
              <SearchIcon size={17} className="shrink-0 text-content-muted" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActive((i) => Math.min(i + 1, hits.length - 1));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActive((i) => Math.max(i - 1, 0));
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    go(hits[active]);
                  }
                }}
                placeholder={labels.placeholder}
                className="h-14 w-full bg-transparent text-content outline-none placeholder:text-content-muted"
                autoComplete="off"
                spellCheck={false}
                role="combobox"
                aria-expanded={hits.length > 0}
                aria-autocomplete="list"
                aria-controls={hits.length > 0 ? "search-results" : undefined}
                aria-activedescendant={
                  hits.length > 0 && hits[active] ? `hit-${hits[active].id}` : undefined
                }
              />
            </div>

            {hits.length > 0 && (
              <ul id="search-results" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
                {hits.map((hit, index) => {
                  const Icon = TYPE_ICON[hit.type];
                  return (
                    <li key={`${hit.type}-${hit.id}`}>
                      <button
                        id={`hit-${hit.id}`}
                        role="option"
                        aria-selected={index === active}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(hit)}
                        className={`flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-start transition-colors ${
                          index === active ? "bg-surface-hover" : ""
                        }`}
                      >
                        <Icon size={16} className="mt-0.5 shrink-0 text-content-muted" aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-content">
                            {hit.title}
                          </span>
                          {hit.description && (
                            <span className="block truncate text-xs text-content-muted">
                              {hit.description}
                            </span>
                          )}
                        </span>
                        <span className="ms-auto shrink-0 font-mono text-[10px] uppercase text-content-muted">
                          {hit.domain}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {query.length > 1 && hits.length === 0 && docs && (
              <p className="px-4 py-8 text-center text-sm text-content-muted">{labels.empty}</p>
            )}

            {query.length <= 1 && (
              <p className="px-4 py-8 text-center text-sm text-content-muted">{labels.hint}</p>
            )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
