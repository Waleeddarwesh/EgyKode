import { Clock, DollarSign, Swords, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FilterBar } from "@/components/filters/filter-bar";
import { domainColor } from "@/lib/content";
import { getDomainMeta } from "@/lib/domains";
import { getGuidedLabs, labNeedsLtr } from "@/lib/labs";
import { formatNumber, getTranslations, isLocale, type Locale, languageAlternates } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslations(locale);
  return {
    title: t("labs.title"),
    description: t("labs.subtitle"),
    alternates: { canonical: `/${locale}/labs`, languages: languageAlternates((locale) => `/${locale}/labs`) },
  };
}

export default async function LabsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typed = locale as Locale;
  const t = getTranslations(typed);
  const isAr = typed === "ar";
  const labs = getGuidedLabs();

  const count = <T extends string>(key: (l: (typeof labs)[number]) => T) =>
    labs.reduce<Record<string, number>>((acc, lab) => {
      const k = key(lab);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

  const byLevel = count((l) => l.level);
  const byDomain = count((l) => l.domain);

  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:px-8">
      <header className="mb-10 max-w-2xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-content">
          {t("labs.title")}
        </h1>
        <p className="mt-3 text-lg text-content-secondary">{t("labs.subtitle")}</p>
        <p className="mt-3 text-sm text-content-muted">{t("labs.pairNote")}</p>
      </header>

      <FilterBar
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        items={labs.map((lab) => {
          const colour = domainColor(lab.domain);
          const ltr = labNeedsLtr(lab.labId, typed);
          return {
            id: lab.labId,
            level: lab.level,
            domain: lab.domain,
            search: `${lab.title} ${lab.description} ${lab.domain}`,
            node: (
              <Link
                href={`/${typed}/labs/${lab.labId}`}
                className="card card-lift group flex h-full flex-col p-5"
              >
                <span className="flex items-center gap-2">
                  <Wrench size={14} aria-hidden style={{ color: colour }} />
                  <span className="font-mono text-[11px] uppercase tracking-wide text-content-muted">
                    {lab.domain}
                  </span>
                  {lab.cloudCost && (
                    <DollarSign
                      size={13}
                      aria-label={t("labs.costTitle")}
                      className="ms-auto"
                      style={{ color: "var(--clr-accent)" }}
                    />
                  )}
                </span>

                <span
                  dir={ltr ? "ltr" : undefined}
                  lang={ltr ? "en" : undefined}
                  className="mt-2 block font-display font-semibold leading-snug text-content"
                >
                  {lab.title}
                </span>
                <span
                  dir={ltr ? "ltr" : undefined}
                  lang={ltr ? "en" : undefined}
                  className="mt-2 block text-sm text-content-secondary"
                >
                  {lab.description}
                </span>

                <span className="mt-auto flex items-center gap-3 pt-4 text-xs text-content-muted">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock size={12} aria-hidden />
                    {formatNumber(lab.estimatedMinutes, typed)}m
                  </span>
                  <span>{t(`level.${lab.level}`)}</span>
                  {lab.challengeId && (
                    <span className="ms-auto inline-flex items-center gap-1 text-content-secondary">
                      <Swords size={12} aria-hidden style={{ color: "var(--clr-accent)" }} />
                      {t("labs.hasChallenge")}
                    </span>
                  )}
                </span>
              </Link>
            ),
          };
        })}
        groups={[
          {
            key: "level",
            label: t("filter.level"),
            // Ordered by difficulty, not alphabetically — a level filter that
            // reads advanced/beginner/intermediate is a sorting bug.
            options: (["beginner", "intermediate", "advanced", "expert"] as const)
              .filter((level) => byLevel[level])
              .map((level) => ({
                value: level,
                label: t(`level.${level}`),
                count: byLevel[level] ?? 0,
              })),
          },
          {
            key: "domain",
            label: t("filter.topic"),
            options: Object.keys(byDomain)
              .sort()
              .map((domain) => ({
                value: domain,
                label:
                  (isAr ? getDomainMeta(domain)?.titleAr : getDomainMeta(domain)?.title) ?? domain,
                count: byDomain[domain] ?? 0,
              })),
          },
        ]}
        labels={{
          all: t("filter.all"),
          clear: t("filter.clear"),
          showing: t("filter.search"),
          of: t("roadmap.of"),
          empty: t("filter.empty"),
          filters: t("filter.filters"),
        }}
      />
    </div>
  );
}
