import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MobileNav } from "@/components/layout/mobile-nav";
import { StaleBuildGuard } from "@/components/layout/stale-build-guard";
import { TopBar } from "@/components/layout/topbar";
import { fontVariables } from "@/lib/fonts";
import { PUBLIC_LOCALES, dir, getTranslations, isLocale, type Locale, languageAlternates } from "@/lib/i18n";
import { SITE } from "@/lib/site";
import { SW_REGISTER_SCRIPT } from "@/lib/sw-register-script";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { organization } from "@/lib/structured-data";

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
    // Leads with what people search for. The tagline is brand voice and lives
    // on the page itself; a title tag has ~60 characters to earn a click.
    title: { default: t("seo.homeTitle"), template: "%s · EgyKode" },
    description: t("seo.homeDescription"),
    alternates: {
      canonical: `/${locale}`,
      languages: languageAlternates((locale) => `/${locale}`, { xDefault: true }),
    },
    openGraph: {
      siteName: "EgyKode",
      locale: locale === "ar" ? "ar_EG" : "en_US",
      type: "website",
      title: t("seo.homeTitle"),
      description: t("seo.homeDescription"),
      url: `/${locale}`,
      // The dimensions must match the file. Scrapers lay the card out from
      // these numbers before the image arrives, so declaring 800x800 for a
      // 1408x768 file gets the preview cropped or letterboxed by whoever
      // trusted the declaration.
      images: [
        {
          url: "/brand/mark-dark-source.png",
          width: 1408,
          height: 768,
          alt: "EgyKode — Cloud & DevOps, free and in the open",
        },
      ],
    },
  };
}

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

  // Built from SITE rather than a literal, so a preview deployment describes
  // itself instead of claiming to be the production site.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "EgyKode",
    url: SITE.url,
    description: t("seo.homeDescription"),
    inLanguage: typed,
    // The canonical Organization node, not a second thinner copy of it.
    //
    // This block used to declare its own publisher with a name, a url and a
    // logo — and nothing else. `organization()` carries the description and
    // the `sameAs` profile links, which are the properties a search engine
    // uses to decide that "EgyKode" is an entity rather than a misspelling of
    // a better-known word. Google was substituting the query outright, so the
    // signals that establish the brand are worth emitting everywhere.
    publisher: organization(),
  };

  return (
    <html lang={typed} dir={dir(typed)} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SW_REGISTER_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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

        <StaleBuildGuard />

        <MobileNav
          locale={typed}
          // Four primary destinations plus "More". Roadmaps and Learn are how
          // people arrive; Courses and Labs are how they get through it.
          items={[
            { key: "roadmaps", label: t("nav.roadmaps") },
            { key: "learn", label: t("nav.learn") },
            { key: "topics", label: t("nav.topics") },
            { key: "courses", label: t("nav.courses") },
          ]}
          // Labs sits here rather than on the bar, but it is still one tap from
          // every chapter and topic page, which is where someone reaches for it.
          more={[
            { key: "labs", label: t("nav.labs") },
            { key: "projects", label: t("nav.projects") },
            { key: "interview", label: t("nav.interview"), path: "prepare/questions" },
            { key: "jobs", label: t("nav.jobs") },
            { key: "community", label: t("nav.community") },
          ]}
          moreLabel={t("nav.more")}
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
