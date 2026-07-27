import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_LOCALE, LOCALES, PUBLIC_LOCALES, type Locale } from "@/lib/i18n";

/**
 * Locale routing (§4.2): every page is served under an explicit /en or /ar
 * prefix. A bare path is redirected once, using the stored preference first
 * and Accept-Language second — never a cookie-driven ambiguous URL.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  // Only ever route to a locale the site actually offers. A visitor who chose
  // Arabic before it was withdrawn, or whose browser asks for it, must land on
  // English rather than on a language that is no longer published.
  const stored = request.cookies.get("egykode_locale")?.value;
  const header = request.headers.get("accept-language") ?? "";
  const preferred = PUBLIC_LOCALES.find((locale) =>
    new RegExp(`(^|,)\\s*${locale}\\b`, "i").test(header),
  );

  const locale =
    stored && PUBLIC_LOCALES.includes(stored as Locale)
      ? stored
      : (preferred ?? DEFAULT_LOCALE);

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Skip static assets, API routes and files with an extension.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
