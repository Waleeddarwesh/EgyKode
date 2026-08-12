import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { domainColor, getAllChapters, getChapterMeta, getRoadmap,
  localizedTitle,
} from "@/lib/content";
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
    title: t("learn.title"),
    // Counted, not written down. This string said "47 chapters" while the page
    // itself rendered 55 — and the description is the line Google shows, so the
    // stale number was the one readers saw in results.
    description: t("seo.learnDescription", {
      count: formatNumber(getAllChapters().length, locale),
    }),
    alternates: {
      canonical: `/${locale}/learn`,
      languages: languageAlternates((locale) => `/${locale}/learn`),
    },
  };
}

function ChapterRow({ contentId, locale }: { contentId: string; locale: Locale }) {
  const chapter = getChapterMeta(contentId);
  if (!chapter) return null;
  const t = getTranslations(locale);

  return (
    // min-w-0: a grid item defaults to `min-width: auto`, so it refuses to
    // shrink below its content and pushes the page wider than the viewport.
    // The Reference section lays these out in a grid, which made /en/learn
    // scroll horizontally on a phone — cards stopped short of the screen edge
    // and the whole layout looked narrow.
    <li className="min-w-0">
      <Link
        href={`/${locale}/learn/${chapter.domain}/${chapter.contentId}`}
        className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-hover"
      >
        <span
          className="h-4 w-1 shrink-0 rounded-full"
          style={{ background: domainColor(chapter.domain) }}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-content-secondary transition-colors group-hover:text-content">
          {localizedTitle(chapter, locale)}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-content-muted">
          {t("chapter.minutes", { minutes: formatNumber(chapter.readingTime, locale) })}
        </span>
      </Link>
    </li>
  );
}

export default async function LearnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typed = locale as Locale;
  const t = getTranslations(typed);
  const roadmap = getRoadmap();
  const isAr = typed === "ar";
  const total = getAllChapters().length;

  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-content">
          {t("learn.title")}
        </h1>
        <p className="mt-3 text-lg text-content-secondary">{t("learn.subtitle")}</p>
        <p className="mt-2 text-sm text-content-muted">
          {formatNumber(total, typed)} {t("learn.chapters")} ·{" "}
          {formatNumber(roadmap.phases.length, typed)} {t("learn.phase")}
        </p>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {roadmap.phases.map((phase) => (
          <section key={phase.id} id={phase.id} className="reveal card cv-auto min-w-0 p-5">
            <h2 className="flex items-baseline gap-2.5">
              <span className="font-mono text-sm font-bold tabular-nums text-content-muted">
                {phase.number}
              </span>
              <span className="font-display text-lg font-semibold text-content">
                {isAr ? phase.titleAr : phase.title}
              </span>
            </h2>
            <ul className="mt-3 -mx-1">
              {phase.chapters.map((id) => (
                <ChapterRow key={id} contentId={id} locale={typed} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Production project — the end of the path (§6.0). The whole card is the
          link: it names a project and describes it, so every part of it reads
          as something you can open, and a heading that is not clickable is a
          dead end at exactly the point the path is meant to pay off. */}
      <section className="mt-10">
        <Link
          href={`/${typed}/projects/${roadmap.productionProject.id}`}
          className="card card-lift group block border-primary/40 p-7"
          style={{ background: "var(--clr-success-bg)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--clr-primary-dark)" }}
          >
            {t("learn.productionProject")}
          </p>
          <h2 className="mt-2 flex items-center gap-2 font-display text-2xl font-bold text-content">
            {isAr ? roadmap.productionProject.titleAr : roadmap.productionProject.title}
            <ArrowRight
              size={20}
              aria-hidden
              className="icon-directional shrink-0 text-content-muted transition-transform group-hover:translate-x-1"
            />
          </h2>
          <p className="mt-3 max-w-2xl text-content-secondary">
            {roadmap.productionProject.summary}
          </p>
        </Link>
      </section>

      {/* Reference chapters — deliberately outside the ordered path. */}
      <section className="mt-14">
        <h2 className="font-display text-xl font-semibold text-content">
          {t("learn.reference")}
        </h2>
        <p className="mt-1 text-sm text-content-secondary">{t("learn.referenceBody")}</p>
        <ul className="mt-4 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {roadmap.reference.map((id) => (
            <ChapterRow key={id} contentId={id} locale={typed} />
          ))}
        </ul>
      </section>
    </div>
  );
}
