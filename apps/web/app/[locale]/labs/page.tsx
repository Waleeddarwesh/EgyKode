import { Clock, DollarSign, Swords, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FilterBar } from "@/components/filters/filter-bar";
import { domainColor } from "@/lib/content";
import { getDomainMeta } from "@/lib/domains";
import { ProjectPath } from "@/components/labs/project-path";
import { costTierOf, getGuidedLabs, getLabPath, getResolvedPath, labNeedsLtr } from "@/lib/labs";
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
    description: t("seo.labsDescription"),
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

  // The ordered journey, resolved from content/labs/path.json. The filter grid
  // below stays as the library — the two answer different questions.
  const pathPhases = getResolvedPath().map(({ phase, labs: phaseLabs }) => ({
    id: phase.id,
    number: phase.number,
    title: phase.title,
    why: phase.why,
    milestone: phase.milestone,
    labs: phaseLabs.map((lab) => ({
      labId: lab.labId,
      title: lab.title,
      href: `/${typed}/labs/${lab.labId}`,
      minutes: t("chapter.minutes", { minutes: formatNumber(lab.estimatedMinutes, typed) }),
      level: t(`level.${lab.level}`),
      domain: lab.domain,
      colour: domainColor(lab.domain),
      costTier: costTierOf(lab),
      criteriaCount: lab.successCriteria?.length ?? 0,
      isIncident: lab.tier === "incident",
    })),
  }));

  // Where the path lands. The phases end at a milestone; without this the last
  // thing a reader sees is "you built it once with no instructions", with
  // nowhere to go. The roadmaps already end at this same project.
  const pathBuild = getLabPath()?.guidedBuild;
  const pathProject = getLabPath()?.productionProject;

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

      {pathPhases.length > 0 && (
        <ProjectPath
          phases={pathPhases}
          build={
            pathBuild && {
              kicker: t("labs.pathBuildKicker"),
              title: isAr ? pathBuild.titleAr : pathBuild.title,
              summary: isAr ? pathBuild.summaryAr : pathBuild.summary,
              cta: t("labs.pathBuildCta"),
              href: `/${typed}/projects/${pathBuild.id}`,
            }
          }
          project={
            pathProject && {
              kicker: t("labs.pathReferenceKicker"),
              title: isAr ? pathProject.titleAr : pathProject.title,
              summary: isAr ? pathProject.summaryAr : pathProject.summary,
              cta: t("labs.pathReferenceCta"),
              href: `/${typed}/projects/${pathProject.id}`,
            }
          }
          labels={{
            heading: t("labs.pathHeading"),
            summary: t("labs.pathSummary"),
            progress: t("labs.pathProgress"),
            of: t("roadmap.of"),
            continueLabel: t("labs.pathContinue"),
            startLabel: t("labs.pathStart"),
            milestone: t("labs.pathMilestone"),
            complete: t("labs.allDone"),
            billable: t("labs.pathBillable"),
            projectEyebrow: t("labs.pathProjectEyebrow"),
          }}
        />
      )}

      <section className="border-t pt-10" aria-labelledby="lab-library">
        <h2 id="lab-library" className="font-display text-xl font-semibold text-content">
          {t("labs.library")}
        </h2>
        <p className="mb-6 mt-1 max-w-2xl text-sm text-content-secondary">
          {t("labs.libraryBody")}
        </p>
      </section>

      <FilterBar
        className="reveal-items list-virtual grid gap-4 md:grid-cols-2 lg:grid-cols-3"
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
