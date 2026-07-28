"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Primary navigation with an active state.
 *
 * "Where am I?" is the first of the three questions every screen must answer,
 * and a nav bar that looks identical on every page answers none of them.
 * The indicator is an underline rather than a filled pill: it marks position
 * without competing with the page's own primary action.
 */
export function NavLinks({
  items,
  className,
}: {
  items: { href: string; label: string }[];
  className?: string;
}) {
  const pathname = usePathname() ?? "";

  return (
    <ul className={className}>
      {items.map((item) => {
        // Exact match, or a descendant — so a chapter still highlights "Learn".
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "text-content"
                  : "text-content-secondary hover:bg-surface-hover hover:text-content"
              }`}
            >
              {item.label}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full"
                  style={{ background: "var(--clr-primary)" }}
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
