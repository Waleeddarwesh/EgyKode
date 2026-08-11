import type { Metadata } from "next";

import { CourseCard } from "@/components/content/course-card";
import { FilterBar } from "@/components/filters/filter-bar";
import { notFound } from "next/navigation";

import { CourseJourney } from "@/components/courses/course-journey";
import { getChapterMeta } from "@/lib/content";
import { getDomainMeta } from "@/lib/domains";
import { getRoadmaps } from "@/lib/projects";
import { domainsFor, getAllResources, getCoursePath, getPathTail } from "@/lib/resources";
import {
  PUBLIC_LOCALES,
  formatNumber,
  getTranslations,
  isLocale,
  type Locale,
  languageAlternates,
} from "@/lib/i18n";

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
  const t = getTranslations(locale as Locale);
  return {
    title: t("courses.title"),
    description: t("seo.coursesDescription"),
    alternates: {
      canonical: `/${locale}/courses`,
      languages: languageAlternates((locale) => `/${locale}/courses`),
    },
  };
}

/**
 * Every external course, in one filterable place.
 *
 * Topic pages show three; this is where the rest live. Kept deliberately small
 * — the aim is curation, not a directory. Fifty Linux courses would make the
 * choice harder rather than easier, and sites for that already exist.
 *
 * `FilterBar` offers two facets, keyed `level` and `domain`. Language is what
 * actually matters when choosing here, so it rides in the `level` slot rather
 * than inventing a third facet nothing else would use.
 */
export default async function CoursesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typed = locale as Locale;
  const t = getTranslations(typed);
  const resources = getAllResources();
  const arabic = resources.filter((r) => r.language === "ar").length;

  const count = (predicate: (r: (typeof resources)[number]) => boolean) =>
    resources.filter(predicate).length;

  const domains = [...new Set(resources.map((r) => r.domain))].sort();

  // The path's order is the roadmap's, derived rather than restated, so it
  // cannot drift from the curriculum it is meant to mirror.
  const roadmap = getRoadmaps().find((r) => r.id === "cloud-devops-engineer");
  const journey = roadmap
    ? getCoursePath(roadmap, (contentId) => getChapterMeta(contentId)?.domain).map((phase) => ({
        number: phase.number,
        title: phase.title,
        steps: phase.steps.map((step) => ({
          domain: step.domain,
          label: getDomainMeta(step.domain)?.title ?? step.domain,
          resources: step.resources,
        })),
      }))
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-content">
          {t("courses.title")}
        </h1>
        <p className="mt-3 text-lg text-content-secondary">{t("courses.subtitle")}</p>
        <p className="mt-3 text-sm text-content-muted">
          {t("courses.provenance", {
            count: formatNumber(resources.length, typed),
            arabic: formatNumber(arabic, typed),
          })}
        </p>
      </header>

      {journey.length > 0 && (
        <CourseJourney
          phases={journey}
          tail={getPathTail()}
          tailLabel={t("courses.projectsStep")}
          project={{
            href: `/${typed}/projects/${roadmap?.productionProject?.id ?? "ivolve-cloud-devops-capstone"}`,
            title: t("courses.projectTitle"),
            body: t("courses.projectBody"),
            cta: t("courses.projectCta"),
          }}
          labels={{
            heading: t("courses.journeyHeading"),
            body: t("courses.journeyBody"),
            language: t("courses.language"),
            all: t("courses.allLanguages"),
            arabic: t("courses.arabicOnly"),
            english: t("courses.englishOnly"),
            coverage: t("courses.coverage"),
            covered: t("courses.covered"),
            none: t("courses.noneInLanguage"),
            noneBody: t("courses.noneYet"),
            showOther: t("courses.showAllLanguages"),
            more: t("courses.moreOptions"),
            recommended: t("courses.recommended"),
            start: t("courses.start"),
          }}
        />
      )}

      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-content">
          {t("courses.browseHeading")}
        </h2>
        <p className="mt-2 max-w-2xl text-content-secondary">{t("courses.browseBody")}</p>
      </section>

      <div className="mt-6">
        <FilterBar
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          items={resources.map((resource) => ({
            id: resource.url,
            level: resource.language,
            domain: resource.domain,
            title: resource.title,
            search: `${resource.title} ${resource.by} ${resource.domain} ${resource.kind}`,
            node: (
              <CourseCard
                resource={resource}
                arabicLabel={t("resources.arabic")}
                tags={domainsFor(resource.url)}
              />
            ),
          }))}
          groups={[
            {
              key: "level",
              label: t("courses.language"),
              options: [
                { value: "ar", label: t("courses.arabicOnly"), count: count((r) => r.language === "ar") },
                { value: "en", label: t("courses.englishOnly"), count: count((r) => r.language === "en") },
              ],
            },
            {
              key: "domain",
              label: t("filter.domain"),
              options: domains.map((domain) => ({
                value: domain,
                label: domain,
                count: count((r) => r.domain === domain),
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
    </div>
  );
}
