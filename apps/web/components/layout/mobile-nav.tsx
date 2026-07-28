"use client";

import { BookOpen, Compass, FolderGit2, Map, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/lib/i18n";

const ICONS = { topics: Compass, learn: BookOpen, labs: Wrench, roadmaps: Map, projects: FolderGit2 };

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
  items: { key: keyof typeof ICONS; label: string }[];
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
          const href = `/${locale}/${item.key}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = ICONS[item.key];

          return (
            <li key={item.key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                // 44px minimum touch target (§12.3).
                className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors ${
                  active ? "text-content" : "text-content-muted"
                }`}
              >
                <Icon
                  size={19}
                  aria-hidden
                  style={active ? { color: "var(--clr-primary)" } : undefined}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
