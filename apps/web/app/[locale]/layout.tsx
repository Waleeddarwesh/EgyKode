import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/topbar";
import { fontVariables } from "@/lib/fonts";
import { PUBLIC_LOCALES, dir, getTranslations, isLocale, type Locale, languageAlternates } from "@/lib/i18n";
import { SITE } from "@/lib/site";

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslations(locale);
  return {
    title: { default: `EgyKode — ${t("brand.tagline")}`, template: "%s · EgyKode" },
    description: t("brand.descriptor"),
    alternates: {
      canonical: `/${locale}`,
      languages: languageAlternates((locale) => `/${locale}`, { xDefault: true }),
    },
    openGraph: {
      siteName: "EgyKode",
      locale: locale === "ar" ? "ar_EG" : "en_US",
      type: "website",
    },
  };
}

/**
 * Applies the saved theme before first paint. Without this the page renders in
 * the wrong theme for one frame — the flash that makes a site feel unfinished.
 */
const THEME_SCRIPT = `(function(){try{
var p=localStorage.getItem('egykode_theme');
var t=p||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
var d=document.documentElement;
d.setAttribute('data-theme',t);
d.setAttribute('data-theme-pref',p||'system');
d.style.colorScheme=t;
}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typed = locale as Locale;
  const t = getTranslations(typed);

  return (
    <html lang={typed} dir={dir(typed)} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={typed === "ar" ? "font-arabic antialiased" : "font-sans antialiased"}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:m-3 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg"
        >
          {t("nav.skipToContent")}
        </a>

        <TopBar locale={typed} />

        {/* pb-20 on mobile so the fixed bottom bar never covers content. */}
        <main id="main" className="animate-page pb-20 md:pb-0">
          {children}
        </main>

        <MobileNav
          locale={typed}
          items={[
            { key: "topics", label: t("nav.topics") },
            { key: "learn", label: t("nav.learn") },
            { key: "labs", label: t("nav.labs") },
            { key: "roadmaps", label: t("nav.roadmaps") },
            { key: "projects", label: t("nav.projects") },
          ]}
        />

        <footer className="mt-24 border-t">
          <div className="mx-auto flex max-w-content flex-col gap-3 px-4 py-10 text-sm text-content-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>
              {t("footer.builtWith")} {t("footer.license")}
            </p>
            <Link
              href={SITE.repo}
              className="transition-colors hover:text-content"
            >
              {t("footer.contribute")} →
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
