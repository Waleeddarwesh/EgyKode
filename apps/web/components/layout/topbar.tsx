import Link from "next/link";

import { Mark } from "@/components/brand/logo";
import { LangToggle } from "@/components/layout/lang-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NavLinks } from "@/components/layout/nav-links";
import { CommandPalette } from "@/components/search/command-palette";
import { PUBLIC_LOCALES, getTranslations, type Locale } from "@/lib/i18n";

export function TopBar({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);

  const nav = [
    // Ordered as an engineer's path, not alphabetically: find the route, learn
    // it, practise it, build with it, prepare for the interview, get the job —
    // and community last, because it is what you join once you are in it.
    { href: `/${locale}/roadmaps`, label: t("nav.roadmaps") },
    { href: `/${locale}/learn`, label: t("nav.learn") },
    { href: `/${locale}/topics`, label: t("nav.topics") },
    // Before labs: watching a course and then practising is a common order,
    // so it sits between reading and doing rather than after the projects.
    { href: `/${locale}/courses`, label: t("nav.courses") },
    { href: `/${locale}/labs`, label: t("nav.labs") },
    { href: `/${locale}/projects`, label: t("nav.projects") },
    { href: `/${locale}/prepare/questions`, label: t("nav.interview") },
    { href: `/${locale}/jobs`, label: t("nav.jobs") },
    { href: `/${locale}/community`, label: t("nav.community") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href={`/${locale}`}
          className="flex shrink-0 items-center gap-2.5"
          aria-label={t("nav.home")}
        >
          <Mark className="h-7 w-auto text-brand" />
          <span className="font-display text-lg font-bold leading-none tracking-tight">
            EgyKode
          </span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <NavLinks items={nav} className="flex items-center gap-1" />
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <CommandPalette
            locale={locale}
            labels={{
              search: t("search.label"),
              placeholder: t("search.placeholder"),
              empty: t("search.empty"),
              hint: t("search.hint"),
            }}
          />
          {/* Only offered once there is more than one language to offer. */}
          {PUBLIC_LOCALES.length > 1 && (
            <LangToggle locale={locale} label={t("action.language")} />
          )}
          <ThemeToggle
            labels={{
              action: t("action.theme"),
              system: t("action.themeSystem"),
              light: t("action.themeLight"),
              dark: t("action.themeDark"),
            }}
          />
        </div>
      </div>
    </header>
  );
}
