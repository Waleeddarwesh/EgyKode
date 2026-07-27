import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

// Imported *and* re-exported: a bare `export ... from` would not bring these
// into this module's scope, and the helpers below use them.
import {
  DEFAULT_LOCALE,
  LOCALES,
  PUBLIC_LOCALES,
  isPublicLocale,
  type Locale,
} from "@/lib/locales";

export { DEFAULT_LOCALE, LOCALES, PUBLIC_LOCALES, isPublicLocale, type Locale };

/**
 * `hreflang` map for a page, covering only the locales actually offered.
 * Google treats an alternate pointing at an unoffered language as a mistake,
 * so this collapses to a single entry while the site is English-only.
 */
export function languageAlternates(
  path: (locale: Locale) => string,
  options: { xDefault?: boolean } = {},
): Record<string, string> {
  const languages = Object.fromEntries(
    PUBLIC_LOCALES.map((locale) => [locale, path(locale)]),
  );
  if (options.xDefault) languages["x-default"] = path(DEFAULT_LOCALE);
  return languages;
}

const CATALOGUES: Record<Locale, Record<string, string>> = { en, ar };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function dir(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * Semantic-key lookup (§4.4a). Keys are `namespace.key`, never the English
 * string, so a copy edit is not a translation invalidation.
 *
 * A missing Arabic value falls back to English *and warns in development* —
 * CI turns that warning into a build failure once the catalogues are complete.
 */
export function getTranslations(locale: Locale) {
  const catalogue = CATALOGUES[locale] ?? CATALOGUES[DEFAULT_LOCALE];
  const fallback = CATALOGUES[DEFAULT_LOCALE];

  return function t(key: string, vars?: Record<string, string | number>): string {
    let value = catalogue[key] ?? fallback[key];
    if (value === undefined) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[i18n] missing key "${key}" (${locale})`);
      }
      return key;
    }
    if (vars) {
      for (const [name, replacement] of Object.entries(vars)) {
        value = value.replaceAll(`{${name}}`, String(replacement));
      }
    }
    return value;
  };
}

/** Western Arabic numerals everywhere, including `ar` (§4.3 Rule 3). */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US").format(value);
}

export function formatDate(value: string | Date, locale: Locale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Plural selection.
 *
 * English has two forms. Arabic has six (`zero`, `one`, `two`, `few`, `many`,
 * `other`) — a two-form string is a bug there, not a simplification. Keys are
 * `<base>.<form>`, and lookup falls back to `.other`.
 */
export function plural(
  t: (key: string, vars?: Record<string, string | number>) => string,
  base: string,
  count: number,
  locale: Locale,
): string {
  const form = new Intl.PluralRules(locale === "ar" ? "ar-EG" : "en-US").select(count);
  const value = t(`${base}.${form}`);
  // `t` returns the key itself when missing, which is how we detect a gap.
  const resolved = value === `${base}.${form}` ? t(`${base}.other`) : value;
  return resolved.replace("{count}", formatNumber(count, locale));
}
