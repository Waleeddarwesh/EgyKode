/**
 * The EK monogram — an upward chevron in which the left descender carries the
 * bars of the E and the right carries the legs of the K (MASTER_PROMPT §2.4).
 *
 * The path is a faithful trace of the original artwork produced by
 * `scripts/vectorize_mark.py`, not a redrawing. It uses `currentColor` so it
 * inherits the theme — never hardcode the brand green here.
 */
export function Mark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 110.96"
      fill="currentColor"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path d="M50.14 0.0 L80.27 29.86 L73.7 36.44 L55.89 18.63 L55.34 18.9 L55.34 64.66 L55.89 65.75 L86.85 33.97 L100.0 33.97 L69.04 65.75 L99.45 96.99 L100.0 97.81 L100.0 110.68 L62.47 72.88 L46.3 89.04 L46.03 17.53 L9.32 54.52 L9.59 67.95 L10.14 68.22 L27.4 50.14 L38.63 39.45 L38.63 52.05 L9.59 81.64 L9.86 98.9 L38.36 69.86 L38.63 82.74 L10.96 110.96 L0.0 110.68 L0.0 50.41 L49.86 0.27 Z" />
    </svg>
  );
}

/**
 * Horizontal lockup. The mark leads in both directions — in RTL the whole
 * lockup mirrors as a unit, which is correct; the mark itself never flips.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <Mark className="h-7 w-auto text-brand" title="EgyKode" />
      <span className="font-display text-[1.35rem] font-bold leading-none tracking-tight text-content">
        EgyKode
      </span>
    </span>
  );
}
