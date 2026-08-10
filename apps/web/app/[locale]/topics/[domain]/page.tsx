import { ArrowRight, BookOpen, HelpCircle, Map, Package, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BackLink } from "@/components/layout/back-link";
import { Resources } from "@/components/content/resources";
import { getResources } from "@/lib/resources";
import { notFound } from "next/navigation";

import { domainColor, getChapterMeta as getChapterMetaSafe,
  localizedTitle,
} from "@/lib/content";
import {
  getAllDomains,
  getDomainMeta,
  getGeneratedTopic,
  getGeneratedTopics,
  getTopic,
} from "@/lib/domains";
import { getLabMeta } from "@/lib/labs";
import { getQuestionsForDomain } from "@/lib/questions";
import { PUBLIC_LOCALES, formatNumber, getTranslations, isLocale, plural, type Locale, languageAlternates } from "@/lib/i18n";

export function generateStaticParams() {
  const ids = [...getAllDomains(), ...getGeneratedTopics().map((t) => t.id)];
  return PUBLIC_LOCALES.flatMap((locale) => ids.map((domain) => ({ locale, domain })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; domain: string }>;
}): Promise<Metadata> {
  const { locale, domain } = await params;
  if (!isLocale(locale)) return {};
  const isAr = locale === "ar";
  const topic = getTopic(domain);

  // `topic.meta` exists only for the dozen domain hubs. The other ~90 pages
  // are generated topics, and returning {} for them meant they inherited the
  // site's default <title> — 30 pages competing with the home page for the
  // same string, which is the duplicate-title problem search engines punish.
  const generated = topic.meta ? null : getGeneratedTopic(domain);
  if (!topic.meta && !generated) return {};

  const title = topic.meta
    ? isAr
      ? topic.meta.titleAr
      : topic.meta.title
    : isAr
      ? generated!.titleAr
      : generated!.title;

  const description = topic.meta
    ? isAr
      ? topic.meta.blurbAr
      : topic.meta.blurb
    : `${title} on EgyKode — ${generated!.chapters.length} chapter(s) and ` +
      `${generated!.labs.length} hands-on lab(s), with how it fails and the ` +
      `trade-offs against the alternative.`;

  return {
    // A topic hub aggregates everything on a subject; the chapter of the same
    // name is the canonical page for it. Without a distinguishing suffix the
    // two compete for one title — "Troubleshooting · EgyKode" was on both —
    // and a search result gives no clue which one to open.
    title: `${title} — chapters & labs`,
    description,
    alternates: {
      canonical: `/${locale}/topics/${domain}`,
      languages: languageAlternates((locale) => `/${locale}/topics/${domain}`),
    },
  };
}

/**
 * One topic, everything the platform has on it.
 *
 * This is the page a beginner needs: they know they want "Kubernetes", not
 * which of forty-seven chapters covers it. Chapters, the roadmaps it belongs
 * to, and the projects that use it, in one place.
 */
export default async function TopicPage({
  params,
}: {
  params: Promise<{ locale: string; domain: string }>;
}) {
  const { locale, domain } = await params;
  if (!isLocale(locale)) notFound();

  const concept = getGeneratedTopic(domain);
  const topic = concept
    ? {
        domain: concept.domain,
        meta: {
          title: concept.title,
          titleAr: concept.titleAr,
          blurb: getDomainMeta(concept.domain)?.blurb ?? "",
          blurbAr: getDomainMeta(concept.domain)?.blurbAr ?? "",
        },
        chapters: concept.chapters
          .map((id) => getChapterMetaSafe(id))
          .filter((c): c is NonNullable<typeof c> => Boolean(c)),
        projects: getTopic(concept.domain).projects,
        roadmaps: getTopic(concept.domain).roadmaps,
        totalMinutes: 0,
      }
    : getTopic(domain);

  const labs = concept
    ? concept.labs.map((id) => getLabMeta(id)).filter((l): l is NonNullable<typeof l> => Boolean(l))
    : [];

  if (!topic.meta || topic.chapters.length === 0) notFound();

  const typed = locale as Locale;
  const t = getTranslations(typed);
  const isAr = typed === "ar";
  const colour = domainColor(domain);
  const hours = Math.round(
    (topic.totalMinutes || topic.chapters.reduce((n, c) => n + c.readingTime, 0)) / 60,
  );
  const first = topic.chapters[0];
  const questions = getQuestionsForDomain(topic.domain);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-content-muted">
        <BackLink href={`/${typed}/topics`} label={t("topics.title")} />
      </nav>

      <header>
        <span
          className="mb-4 block h-1.5 w-16 rounded-full"
          style={{ background: colour }}
          aria-hidden
        />
        <h1 className="font-display text-4xl font-bold tracking-tight text-content">
          {isAr ? topic.meta.titleAr : topic.meta.title}
        </h1>
        <p className="mt-3 text-lg text-content-secondary">
          {isAr ? topic.meta.blurbAr : topic.meta.blurb}
        </p>
        <p className="mt-3 text-sm tabular-nums text-content-muted">
          {plural(t, "count.chapters", topic.chapters.length, typed)}
          {hours > 0 ? ` · ~${formatNumber(hours, typed)}h` : ""}
        </p>

        {first && (
          <Link
            href={`/${typed}/learn/${first.domain}/${first.contentId}`}
            className="btn btn-primary group mt-6 h-11 px-5"
          >
            {t("topics.startHere")}
            <ArrowRight
              size={16}
              aria-hidden
              className="icon-directional transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        )}
      </header>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-content">
          <BookOpen size={17} aria-hidden style={{ color: colour }} />
          {t("topics.chapters")}
        </h2>
        <ul className="mt-3 -mx-2">
          {topic.chapters.map((chapter) => (
            <li key={chapter.contentId}>
              <Link
                href={`/${typed}/learn/${chapter.domain}/${chapter.contentId}`}
                className="group flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-hover"
              >
                <span className="min-w-0 flex-1 truncate text-content-secondary transition-colors group-hover:text-content">
                  {localizedTitle(chapter, typed)}
                </span>
                <span className="hidden shrink-0 text-xs text-content-muted sm:inline">
                  {t(`level.${chapter.level}`)}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-content-muted">
                  {t("chapter.minutes", { minutes: formatNumber(chapter.readingTime, typed) })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {labs.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-content">
            <Wrench size={17} aria-hidden style={{ color: colour }} />
            {t("labs.title")}
          </h2>
          <ul className="mt-3 -mx-2">
            {labs.map((lab) => (
              <li key={lab.labId}>
                <Link
                  href={`/${typed}/labs/${lab.labId}`}
                  className="group flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-hover"
                >
                  <span className="min-w-0 flex-1 truncate text-content-secondary transition-colors group-hover:text-content">
                    {lab.title}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-content-muted">
                    {formatNumber(lab.estimatedMinutes, typed)}m
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {topic.roadmaps.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-content">
            <Map size={17} aria-hidden style={{ color: colour }} />
            {t("topics.inRoadmaps")}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {topic.roadmaps.map((roadmap) => (
              <li key={roadmap.id}>
                <Link
                  href={`/${typed}/roadmaps/${roadmap.id}`}
                  className="badge border px-3 py-1.5 text-content-secondary transition-colors hover:border-primary/40 hover:text-content"
                >
                  {isAr ? roadmap.titleAr : roadmap.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {questions.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-content">
            <HelpCircle size={17} aria-hidden style={{ color: colour }} />
            {t("questions.title")}
          </h2>
          <p className="mt-1 text-sm text-content-secondary">
            {t("topics.questionsBody", { count: formatNumber(questions.length, typed) })}
          </p>
          <Link
            href={`/${typed}/prepare/questions`}
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            {t("topics.openQuestions")} →
          </Link>
        </section>
      )}

      {topic.projects.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-content">
            <Package size={17} aria-hidden style={{ color: colour }} />
            {t("topics.inProjects")}
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {topic.projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/${typed}/projects/${project.id}`}
                  className="card card-lift group flex h-full flex-col p-4"
                >
                  <span className="flex items-center gap-2 font-medium text-content">
                    {(isAr && project.titleAr) || project.title}
                    <ArrowRight
                      size={13}
                      aria-hidden
                      className="icon-directional ms-auto shrink-0 text-content-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                    />
                  </span>
                  <span className="mt-1.5 text-sm text-content-secondary">
                    {(isAr && project.summaryAr) || project.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* A generated topic inherits its domain's references: a channel covers
          "Kubernetes", not "kubernetes-networkpolicy". */}
      <Resources
        resources={getResources(topic.domain)}
        labels={{
          heading: t("resources.heading"),
          body: t("resources.body"),
          arabic: t("resources.arabic"),
        }}
      />
    </div>
  );
}
