"use client";

import { BookOpen, Compass, FolderGit2, HelpCircle, Map, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/lib/i18n";

const ICONS = {
  topics: Compass,
  learn: BookOpen,
  labs: Wrench,
  roadmaps: Map,
  projects: FolderGit2,
  interview: HelpCircle,
};

/**
 * Bottom navigation for small screens (§12.6).
 *
 * The desktop nav is `hidden md:block`, which left phones with no way to reach
 * anything but the current page — and mobile is the majority of MENA traffic,
 * so that was a functional gap rather than a polish item.
 *
 * A bottom bar rather than a hamburger: the destinations are few, they are the
 * whole product, and a thumb reaches the bottom of a phone more easily than
 * the top-left corner.
 */
export function MobileNav({
  locale,
  items,
}: {
  locale: Locale;
  /** `path` overrides the default `/{locale}/{key}` for nested destinations. */
  items: { key: keyof typeof ICONS; label: string; path?: string }[];
}) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Primary"
      // pb-safe keeps the bar clear of the iOS home indicator.
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-bg/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const href = `/${locale}/${item.path ?? item.key}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = ICONS[item.key];

          return (
            <li key={item.key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                // 44px minimum touch target (§12.3).
                className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] transition-colors ${
                  active ? "font-semibold text-content" : "font-medium text-content-muted"
                }`}
              >
                {/* A tinted pill behind the icon, not colour alone.
                    In dark mode the active icon jumps from grey to bright
                    green and reads instantly; in light mode it goes from
                    #576469 grey to #096f40 green — the same visual weight and
                    actually darker, so nothing appeared to light up. A shape
                    change works in both themes, and satisfies WCAG 1.4.1:
                    colour is never the only signal. */}
                <span
                  className="flex h-7 w-12 items-center justify-center rounded-full transition-colors"
                  style={active ? { background: "var(--clr-success-bg)" } : undefined}
                >
                  <Icon
                    size={19}
                    aria-hidden
                    style={active ? { color: "var(--clr-primary)" } : undefined}
                  />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
