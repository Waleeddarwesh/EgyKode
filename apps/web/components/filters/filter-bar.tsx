"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

export interface FilterableItem {
  id: string;
  level: string;
  domain: string;
  /** Free-text haystack for the inline filter box. */
  search: string;
  /**
   * The already-rendered card. React elements serialise across the
   * server/client boundary; a render-prop function does not — which is why
   * this takes nodes rather than a callback.
   */
  node: React.ReactNode;
  /** Numeric fields the sort control can order by. */
  metrics?: Record<string, number>;
  /** Used for the alphabetical sort. */
  title?: string;
}

export interface SortOption {
  value: string;
  label: string;
  /** A metrics key to sort by, descending. Omit for "title" or "default". */
  metric?: string;
}

export interface FilterGroup {
  key: "level" | "domain";
  label: string;
  options: { value: string; label: string; count: number }[];
}

/**
 * Client-side faceted filtering.
 *
 * Filtering happens in the browser over an already-rendered list, so it costs
 * no request and works on a static page. The counts come from the data, not
 * from a guess — a filter that offers a choice leading to zero results is
 * worse than no filter.
 *
 * Children are rendered for every item; this component only toggles their
 * visibility, which keeps the markup server-rendered and crawlable.
 */
export function FilterBar({
  items,
  groups,
  labels,
  className,
  sorts,
}: {
  items: FilterableItem[];
  groups: FilterGroup[];
  /** Optional sort control; the first entry is the default order. */
  sorts?: SortOption[];
  labels: {
    all: string;
    clear: string;
    showing: string;
    of: string;
    empty: string;
    sortBy?: string;
    count?: string;
    filters?: string;
  };
  /** Applied to the results grid, so each page controls its own columns. */
  className?: string;
}) {
  const [selected, setSelected] = useState<Record<string, string | null>>({});
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(sorts?.[0]?.value ?? "default");
  const [openOnMobile, setOpenOnMobile] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      for (const group of groups) {
        const value = selected[group.key];
        if (value && item[group.key] !== value) return false;
      }
      return !q || item.search.toLowerCase().includes(q);
    });

    const active = sorts?.find((s) => s.value === sort);
    if (!active || sort === (sorts?.[0]?.value ?? "default")) return filtered;
    if (active.metric) {
      return [...filtered].sort(
        (a, b) => (b.metrics?.[active.metric!] ?? 0) - (a.metrics?.[active.metric!] ?? 0),
      );
    }
    if (sort === "title") {
      return [...filtered].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    }
    return filtered;
  }, [items, groups, selected, query, sort, sorts]);

  const active = Object.values(selected).some(Boolean) || query.length > 0;

  const activeCount = Object.values(selected).filter(Boolean).length;

  return (
    <div>
      {/* Search first on mobile: it is the fastest path when you know the
          name, and it costs one line instead of six rows of chips. */}
      <div className="mb-4 flex items-center gap-2 md:hidden">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.showing}
          aria-label={labels.showing}
          className="h-10 min-w-0 flex-1 rounded-md border bg-transparent px-3 text-sm text-content outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => setOpenOnMobile((v) => !v)}
          aria-expanded={openOnMobile}
          // Icon-only, so it needs a name. The count is decoration on top of
          // the label, not a substitute for it.
          aria-label={
            activeCount > 0
              ? `${labels.filters ?? "Filters"} (${activeCount})`
              : (labels.filters ?? "Filters")
          }
          className="btn btn-outline h-10 shrink-0 gap-1.5 px-3"
        >
          <SlidersHorizontal size={15} aria-hidden />
          {activeCount > 0 && (
            <span
              className="rounded-full px-1.5 text-[11px] tabular-nums"
              style={{ background: "var(--clr-primary)", color: "var(--clr-text-inverse)" }}
            >
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <div className={`mb-8 space-y-4 ${openOnMobile ? "" : "hidden md:block"}`}>
        {groups.map((group) => (
          <div key={group.key} className="flex flex-wrap items-center gap-2">
            <span className="me-1 text-xs font-semibold uppercase tracking-wide text-content-muted">
              {group.label}
            </span>

            <button
              type="button"
              onClick={() => setSelected((s) => ({ ...s, [group.key]: null }))}
              aria-pressed={!selected[group.key]}
              className={`badge border px-3 py-1 text-content transition-colors ${
                selected[group.key] ? "hover:border-primary/40" : "border-primary/60"
              }`}
              style={
                selected[group.key] ? undefined : { background: "var(--clr-success-bg)" }
              }
            >
              {labels.all}
            </button>

            {group.options.map((option) => {
              const isOn = selected[group.key] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setSelected((s) => ({
                      ...s,
                      [group.key]: isOn ? null : option.value,
                    }))
                  }
                  aria-pressed={isOn}
                  className={`badge border px-3 py-1 text-content transition-colors ${
                    isOn ? "border-primary/60" : "hover:border-primary/40"
                  }`}
                  style={isOn ? { background: "var(--clr-success-bg)" } : undefined}
                >
                  {option.label}
                  <span className="tabular-nums text-content-secondary">{option.count}</span>
                </button>
              );
            })}
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            // Duplicated for mobile above; hidden here to avoid two inputs
            // sharing one label in the accessibility tree.
            hidden={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.showing}
            aria-label={labels.showing}
            className="hidden h-9 w-full max-w-xs rounded-md border bg-transparent px-3 text-sm text-content outline-none transition focus:border-primary md:block"
          />

          {sorts && sorts.length > 1 && (
            <label className="flex items-center gap-2 text-xs text-content-secondary">
              {labels.sortBy ?? "Sort"}
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="h-9 rounded-md border bg-transparent px-2 text-xs text-content outline-none focus:border-primary"
              >
                {sorts.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <p className="text-xs tabular-nums text-content-muted" aria-live="polite">
            {(labels.count ?? "{n}").replace("{n}", String(visible.length))}
          </p>

          {active && (
            <button
              type="button"
              onClick={() => {
                setSelected({});
                setQuery("");
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <X size={12} aria-hidden />
              {labels.clear}
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-content-muted">{labels.empty}</p>
      ) : (
        <ul className={className}>
          {visible.map((item) => (
            <li key={item.id}>{item.node}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
