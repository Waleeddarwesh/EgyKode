import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getChapterMeta } from "@/lib/content";
import { getRoadmaps } from "@/lib/projects";
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
    title: t("roadmaps.title"),
    description: t("roadmaps.subtitle"),
    alternates: {
      canonical: `/${locale}/roadmaps`,
      languages: languageAlternates((locale) => `/${locale}/roadmaps`),
    },
  };
}

export default async function RoadmapsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typed = locale as Locale;
  const t = getTranslations(typed);
  const isAr = typed === "ar";
  const roadmaps = getRoadmaps();

  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-content">
          {t("roadmaps.title")}
        </h1>
        <p className="mt-3 text-lg text-content-secondary">{t("roadmaps.subtitle")}</p>
      </header>

      <ul className="mt-12 space-y-6">
        {roadmaps.map((roadmap) => {
          const chapterCount = roadmap.phases.reduce(
            (sum: number, phase: { chapters: string[] }) => sum + phase.chapters.length,
            0,
          );
          return (
            <li key={roadmap.id}>
              <article className="card p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl font-semibold text-content">
                    <Link
                      href={`/${typed}/roadmaps/${roadmap.id}`}
                      className="transition-colors hover:text-primary"
                    >
                      {isAr ? roadmap.titleAr : roadmap.title}
                    </Link>
                  </h2>
                  <p className="text-sm tabular-nums text-content-muted">
                    {formatNumber(roadmap.phases.length, typed)} {t("roadmaps.phases")} ·{" "}
                    {formatNumber(chapterCount, typed)} {t("learn.chapters")}
                  </p>
                </div>

                <p className="mt-2 max-w-2xl text-content-secondary">
                  {isAr ? roadmap.descriptionAr : roadmap.description}
                </p>

                {/* The phase spine — the shape of the path at a glance. */}
                <ol className="mt-5 flex flex-wrap items-center gap-2">
                  {roadmap.phases.map((phase: { id: string; number: string; title: string; titleAr: string; chapters: string[] }) => {
                    const first = phase.chapters[0]
                      ? getChapterMeta(phase.chapters[0])
                      : undefined;
                    return (
                      <li key={phase.id}>
                        <Link
                          href={
                            first
                              ? `/${typed}/learn/${first.domain}/${first.contentId}`
                              : `/${typed}/learn`
                          }
                          className="badge border px-2.5 py-1 text-content-secondary transition-colors hover:border-primary/40 hover:text-content"
                        >
                          <span className="font-mono text-[11px] tabular-nums text-content-muted">
                            {phase.number}
                          </span>
                          {isAr ? phase.titleAr : phase.title}
                        </Link>
                      </li>
                    );
                  })}
                </ol>

                <Link
                  href={`/${typed}/roadmaps/${roadmap.id}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  {t("roadmaps.start")} →
                </Link>

                <Link
                  href={`/${typed}/projects/${roadmap.productionProject.id}`}
                  className="group mt-5 block rounded-lg border border-primary/30 p-4 transition-colors hover:border-primary/60"
                  style={{ background: "var(--clr-success-bg)" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--clr-primary-dark)" }}>
                    {t("roadmaps.endsWith")}
                  </p>
                  <p className="mt-1 font-medium text-content">
                    {isAr
                      ? roadmap.productionProject.titleAr
                      : roadmap.productionProject.title}
                  </p>
                  <p className="mt-1 text-sm text-content-secondary">
                    {roadmap.productionProject.summary}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {t("build.viewProject")}
                    <span className="icon-directional transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
                  </span>
                </Link>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
