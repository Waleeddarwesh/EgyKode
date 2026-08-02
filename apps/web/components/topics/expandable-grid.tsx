import type { ReactNode } from "react";

/**
 * A grid that shows the first few items and expands to show the rest.
 *
 * Built on `<details>` deliberately, with no client component involved.
 *
 * The first version was a `useState` client component receiving pre-rendered
 * cards. React serialises the rendered output of anything crossing a client
 * boundary into the RSC flight payload, so all 74 topic cards appeared twice —
 * once as HTML and once as inline script — and the topics page reached 1.05 MB,
 * two thirds of it inline payload. Native disclosure removes the boundary
 * entirely: same behaviour, no JavaScript, no duplication, and it works before
 * hydration.
 *
 * The area sections used to end with "+7 more in this area, use the filters
 * below" — naming something the reader wanted and then sending them elsewhere
 * to find it.
 */
export function ExpandableGrid({
  items,
  initial = 3,
  labels,
}: {
  items: ReactNode[];
  initial?: number;
  labels: { more: string; less: string };
}) {
  const hidden = items.length - initial;
  const shown = items.slice(0, initial);
  const rest = items.slice(initial);

  const grid = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";

  if (hidden <= 0) {
    return <ul className={`mt-3 ${grid}`}>{shown.map(cell)}</ul>;
  }

  return (
    <details className="group mt-3">
      <ul className={grid}>{shown.map(cell)}</ul>

      {/* Rendered inside <details> so it is revealed by the native toggle. */}
      <ul className={`mt-3 hidden ${grid} group-open:grid`}>{rest.map(cell)}</ul>

      <summary
        className="mt-3 inline-flex cursor-pointer list-none items-center gap-1.5 text-sm
          text-primary transition-colors hover:underline
          [&::-webkit-details-marker]:hidden"
      >
        <span className="group-open:hidden">{labels.more.replace("{count}", String(hidden))}</span>
        <span className="hidden group-open:inline">{labels.less}</span>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="transition-transform duration-200 group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
    </details>
  );
}

function cell(item: ReactNode, index: number) {
  return <li key={index}>{item}</li>;
}
