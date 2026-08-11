"use client";

import {
  BookOpen,
  Briefcase,
  Compass,
  FolderGit2,
  GraduationCap,
  HelpCircle,
  Map,
  MessageSquare,
  MoreHorizontal,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n";

const ICONS = {
  topics: Compass,
  courses: GraduationCap,
  learn: BookOpen,
  labs: Wrench,
  roadmaps: Map,
  projects: FolderGit2,
  interview: HelpCircle,
  jobs: Briefcase,
  community: MessageSquare,
};

export type NavKey = keyof typeof ICONS;
export interface NavItem {
  key: NavKey;
  label: string;
  /** Overrides the default `/{locale}/{key}` for nested destinations. */
  path?: string;
}

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
 *
 * Four destinations plus "More", rather than cramming everything in. The bar
 * carried five of nine sections, so Topics, Jobs and Community had no mobile
 * route at all — a gap that predated Courses and stayed invisible because
 * nobody looks for what is not there. Six items also overflowed 320px. This
 * holds the bar at five targets, keeps Labs, and leaves nothing unreachable.
 */
export function MobileNav({
  locale,
  items,
  more,
  moreLabel,
}: {
  locale: Locale;
  /** The primary destinations, shown directly. */
  items: NavItem[];
  /** Everything else, behind the fifth button. */
  more?: NavItem[];
  moreLabel?: string;
}) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  const hrefFor = (item: NavItem) => `/${locale}/${item.path ?? item.key}`;
  const isActive = (item: NavItem) =>
    pathname === hrefFor(item) || pathname.startsWith(`${hrefFor(item)}/`);

  // A panel left open over the page you just navigated to is the classic
  // mobile-menu bug.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const hasMore = Boolean(more && more.length > 0);
  const moreActive = (more ?? []).some(isActive);

  const tab = (active: boolean) =>
    `flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] transition-colors ${
      active ? "font-semibold text-content" : "font-medium text-content-muted"
    }`;

  /* A tinted pill behind the icon, not colour alone. In dark mode the active
     icon jumps from grey to bright green and reads instantly; in light mode it
     goes from #576469 grey to #096f40 green — the same visual weight and
     actually darker, so nothing appeared to light up. A shape change works in
     both themes, and satisfies WCAG 1.4.1: colour is never the only signal.

     The pill is fixed-width, so six destinations at 320px overflowed the bar
     and pushed two off-screen. Narrower below 360px, roomier above. */
  const pill = "flex h-7 w-10 items-center justify-center rounded-full transition-colors sm:w-12";

  return (
    <>
      {/* A scrim, so a tap anywhere dismisses. Without it the only way out is
          the button itself, which is a small target to hunt for. */}
      {open && (
        <button
          type="button"
          aria-label={moreLabel}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      {open && hasMore && (
        <div
          id="mobile-more"
          className="fixed inset-x-0 bottom-[3.6rem] z-40 border-t bg-bg md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="mx-auto grid max-w-lg grid-cols-3 gap-1 p-3">
            {more!.map((item) => {
              const Icon = ICONS[item.key];
              const active = isActive(item);
              return (
                <li key={item.key}>
                  <Link
                    href={hrefFor(item)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[4rem] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs transition-colors ${
                      active
                        ? "font-semibold text-content"
                        : "font-medium text-content-secondary hover:bg-surface-hover"
                    }`}
                    style={active ? { background: "var(--clr-success-bg)" } : undefined}
                  >
                    <Icon
                      size={20}
                      aria-hidden
                      style={active ? { color: "var(--clr-primary)" } : undefined}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <nav
        aria-label="Primary"
        // pb-safe keeps the bar clear of the iOS home indicator.
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-bg/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-lg items-stretch">
          {items.map((item) => {
            const active = isActive(item);
            const Icon = ICONS[item.key];

            return (
              <li key={item.key} className="flex-1">
                <Link
                  href={hrefFor(item)}
                  aria-current={active ? "page" : undefined}
                  // 44px minimum touch target (§12.3).
                  className={tab(active)}
                >
                  <span
                    className={pill}
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

          {hasMore && (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls="mobile-more"
                className={`w-full ${tab(open || moreActive)}`}
              >
                <span
                  className={pill}
                  style={open || moreActive ? { background: "var(--clr-success-bg)" } : undefined}
                >
                  <MoreHorizontal
                    size={19}
                    aria-hidden
                    style={open || moreActive ? { color: "var(--clr-primary)" } : undefined}
                  />
                </span>
                <span className="truncate">{moreLabel}</span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}
