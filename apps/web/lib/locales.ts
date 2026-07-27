/**
 * Locale configuration, with no imports of its own.
 *
 * Kept separate from `i18n.ts` so the Playwright suite can read it directly:
 * `i18n.ts` pulls in the message catalogues through the `@/` alias, which does
 * not resolve outside the Next build. Tests that need to know which languages
 * the site publishes import this file relatively.
 */
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Locales the site actually offers, as opposed to those the code can render.
 *
 * The platform is English-first (§4.1). Arabic translation exists for the UI
 * and two pilot chapters, but until the corpus is genuinely bilingual there is
 * no honest way to advertise it: a language switcher that leads to
 * mostly-English pages is worse than no switcher.
 *
 * Everything derived from this stays consistent — the language switcher,
 * `hreflang`, the sitemap, which pages are pre-rendered, where the middleware
 * sends a bare path, and which locales the test suite exercises. Adding "ar"
 * back here is the single change needed to restore the Arabic experience; the
 * translations, routes and RTL handling all remain in place.
 */
export const PUBLIC_LOCALES: readonly Locale[] = ["en"];

export const isPublicLocale = (locale: Locale): boolean =>
  PUBLIC_LOCALES.includes(locale);
