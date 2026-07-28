"use client";

import { Languages } from "lucide-react";
import { usePathname } from "next/navigation";

import type { Locale } from "@/lib/i18n";

/**
 * Language switch.
 *
 * Swaps the locale segment of the current path, preserving the rest — so a
 * reader on a chapter lands on the same chapter, not the home page. Rendered
 * as a real <Link> so it works without JS and is crawlable (§12.2).
 *
 * The label names the language you would switch TO, in its own script, with an
 * icon so it is recognisable before it is read. A fixed min-width keeps the
 * header from reflowing when the label changes width between locales — and the
 * Arabic font is applied to the button itself, because a bare Arabic glyph in
 * a Latin face falls back unpredictably and renders undersized.
 */
export function LangToggle({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname() || `/${locale}`;
  const other: Locale = locale === "en" ? "ar" : "en";
  const target = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${other}`);
  const isArabicTarget = other === "ar";

  return (
    // Deliberately a plain <a>, not next/link: a soft navigation swaps the
    // <html> element and loses the data-theme attribute set before paint, so
    // the page fell back to the CSS default (dark). A full load re-runs the
    // theme script and guarantees lang/dir are correct in the served markup.
    <a
      href={target || `/${other}`}
      hrefLang={other}
      title={label}
      aria-label={`${label}: ${isArabicTarget ? "العربية" : "English"}`}
      onClick={() => {
        try {
          document.cookie = `egykode_locale=${other}; path=/; max-age=31536000; samesite=lax`;
        } catch {
          /* cookies disabled — the path prefix still carries the locale */
        }
      }}
      className="btn btn-outline h-9 min-w-[4.75rem] gap-1.5 px-2.5"
    >
      <Languages size={15} aria-hidden className="shrink-0" />
      <span
        // Arabic renders optically smaller at the same px (§4.5).
        className={isArabicTarget ? "font-arabic text-[0.95rem] leading-none" : "text-xs font-semibold"}
      >
        {isArabicTarget ? "عربي" : "EN"}
      </span>
    </a>
  );
}
