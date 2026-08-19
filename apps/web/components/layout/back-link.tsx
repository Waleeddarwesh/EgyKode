import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * Back navigation to a named parent section.
 *
 * It goes where the label says, always. It used to call `router.back()` when
 * the reader appeared to have arrived from inside the site, on the grounds
 * that history returns them to the exact list position they were scrolled to.
 * That was worth having and still cost more than it was worth: a link labelled
 * "Labs" that lands on a different lab is a link that lied. Move between a
 * guided lab and its challenge a few times and the arrow ping-pongs between
 * the two, never reaching the index it names.
 *
 * The browser's own back button already does history, and does it better —
 * it is not claiming to do anything else. So this does the one thing the
 * browser has no button for: go up a level.
 *
 * The label names the destination rather than saying "Back", because a reader
 * who arrived from a search result has no idea what "back" would mean here.
 */
export function BackLink({
  href,
  label,
  className,
}: {
  /** Parent section. Where this always goes. */
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-1.5 text-sm text-content-secondary transition-colors hover:text-content ${className ?? ""}`}
    >
      <ArrowLeft
        size={15}
        aria-hidden
        // Mirrors in RTL: "back" points the way the reader came from.
        className="icon-directional transition-transform group-hover:-translate-x-0.5"
      />
      {label}
    </Link>
  );
}
