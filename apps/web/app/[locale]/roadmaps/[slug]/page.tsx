import type { Metadata } from "next";
import Link from "next/link";

import { BackLink } from "@/components/layout/back-link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbs, course, graph } from "@/lib/structured-data";

import { RoadmapCanvas, type RoadmapPhase } from "@/components/roadmap/roadmap-canvas";
import { RoadmapCoverage } from "@/components/roadmap/coverage";
import { domainColor, getChapterMeta } from "@/lib/content";
import { getRoadmaps } from "@/lib/projects";
import { PUBLIC_LOCALES, getTranslations, isLocale, type Locale, languageAlternates } from "@/lib/i18n";
import { SITE } from "@/lib/site";

export function generateStaticParams() {
  return PUBLIC_LOCALES.flatMap((locale) =>
    getRoadmaps().map((roadmap: { id: string }) => ({ locale, slug: roadmap.id })),
  );
}

function find(slug: string) {
  return getRoadmaps().find((r: { id: string }) => r.id === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const roadmap = find(slug);
  if (!roadmap || !isLocale(locale)) return {};
  const isAr = locale === "ar";
  return {
    title: isAr ? roadmap.titleAr : roadmap.title,
    description: isAr ? roadmap.descriptionAr : roadmap.description,
    alternates: {
      canonical: `/${locale}/roadmaps/${slug}`,
      languages: languageAlternates((locale) => `/${locale}/roadmaps/${slug}`),
    },
  };
}

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const roadmap = find(slug);
  if (!roadmap) notFound();

  const typed = locale as Locale;
  const t = getTranslations(typed);
  const isAr = typed === "ar";

  const phases: RoadmapPhase[] = roadmap.phases.map(
    (phase: { id: string; number: string; title: string; titleAr: string; chapters: string[] }) => ({
      id: phase.id,
      number: phase.number,
      title: isAr ? phase.titleAr : phase.title,
      nodes: phase.chapters
        .map((id: string) => getChapterMeta(id))
        .filter(Boolean)
        .map((chapter) => ({
          contentId: chapter!.contentId,
          title: chapter!.title,
          domain: chapter!.domain,
          level: chapter!.level,
          readingTime: chapter!.readingTime,
          href: `/${typed}/learn/${chapter!.domain}/${chapter!.contentId}`,
          colour: domainColor(chapter!.domain),
        })),
    }),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd
        data={graph(
          course({
            title: isAr ? roadmap.titleAr : roadmap.title,
            description: isAr ? roadmap.descriptionAr : roadmap.description,
            path: `/${typed}/roadmaps/${roadmap.id}`,
            locale: typed,
            chapters: phases.reduce((n, phase) => n + phase.nodes.length, 0),
          }),
          breadcrumbs([
            { name: "EgyKode", path: `/${typed}` },
            { name: t("roadmaps.title"), path: `/${typed}/roadmaps` },
            {
              name: isAr ? roadmap.titleAr : roadmap.title,
              path: `/${typed}/roadmaps/${roadmap.id}`,
            },
          ]),
        )}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-content-muted">
        <BackLink href={`/${typed}/roadmaps`} label={t("roadmaps.title")} />
      </nav>

      <header className="mb-10">
        <h1 className="font-display text-4xl font-bold tracking-tight text-content">
          {isAr ? roadmap.titleAr : roadmap.title}
        </h1>
        <p className="mt-3 text-lg text-content-secondary">
          {isAr ? roadmap.descriptionAr : roadmap.description}
        </p>
      </header>

      <RoadmapCoverage
        phaseCount={phases.length}
        chapterCount={phases.reduce((n, p) => n + p.nodes.length, 0)}
        gaps={Array.isArray(roadmap.contentGaps) ? roadmap.contentGaps : []}
        repo={SITE.repo}
        labels={{
          title: t("roadmap.coverageTitle"),
          covered: t("roadmap.covered"),
          planned: t("roadmap.planned"),
          phases: t("roadmaps.phases"),
          chapters: t("learn.chapters"),
          body: t("roadmap.gapsBody"),
          cta: t("roadmap.gapsCta"),
        }}
      />

      <RoadmapCanvas
        phases={phases}
        locale={typed}
        projectTitle={isAr ? roadmap.productionProject.titleAr : roadmap.productionProject.title}
        projectSummary={roadmap.productionProject.summary}
        projectHref={`/${typed}/projects/${roadmap.productionProject.id}`}
        labels={{
          complete: t("roadmap.complete"),
          inProgress: t("roadmap.inProgress"),
          notStarted: t("roadmap.privacyNote"),
          markDone: t("roadmap.markDone"),
          markUndone: t("roadmap.markUndone"),
          progress: t("roadmap.progress"),
          of: t("roadmap.of"),
          reset: t("roadmap.reset"),
          minutes: t("chapter.minutes"),
          endsWith: t("roadmaps.endsWith"),
          expandAll: t("roadmap.expandAll"),
          collapseAll: t("roadmap.collapseAll"),
          remaining: t("roadmap.remaining"),
        }}
      />
    </div>
  );
}
