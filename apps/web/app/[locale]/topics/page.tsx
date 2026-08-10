import { ArrowRight, BookOpen, FolderGit2, Map as MapIcon, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ExpandableGrid } from "@/components/topics/expandable-grid";
import { TopicCard, type TopicCardData } from "@/components/topics/topic-card";
import { FilterBar } from "@/components/filters/filter-bar";
import { domainColor, getAllChapters, getChapterMeta, getRoadmap } from "@/lib/content";
import { getDomainMeta, getGeneratedTopics, getTopicAreas } from "@/lib/domains";
import { getGuidedLabs } from "@/lib/labs";
import { getProjects } from "@/lib/projects";
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
    title: t("topics.title"),
    description: t("topics.subtitle"),
    alternates: {
      canonical: `/${locale}/topics`,
      languages: languageAlternates((locale) => `/${locale}/topics`),
    },
  };
}

/** The dominant level across a topic's chapters — a topic has no level of its own. */
function levelOf(chapterIds: string[]): string {
  const counts: Record<string, number> = {};
  for (const id of chapterIds) {
    const level = getChapterMeta(id)?.level;
    if (level) counts[level] = (counts[level] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "all";
}

export default async function TopicsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typed = locale as Locale;
  const t = getTranslations(typed);
  const isAr = typed === "ar";
  const topics = getGeneratedTopics();
  const areas = getTopicAreas();
  const roadmap = getRoadmap();

  const areaTitle = new Map(areas.map((a) => [a.id, isAr ? a.titleAr : a.title]));
  const byLevel: Record<string, number> = {};
  const byArea: Record<string, number> = {};
  for (const topic of topics) {
    byLevel[levelOf(topic.chapters)] = (byLevel[levelOf(topic.chapters)] ?? 0) + 1;
    byArea[topic.area] = (byArea[topic.area] ?? 0) + 1;
  }

  // Header stats come from the corpus, never hardcoded (§5.4).
  const stats = [
    { value: topics.length, label: t("topics.statTopics") },
    { value: getAllChapters().length, label: t("topics.statChapters") },
    { value: getGuidedLabs().length, label: t("topics.statLabs") },
    { value: roadmap.phases.length, label: t("topics.statPhases") },
    { value: getProjects().length, label: t("topics.statProjects") },
  ];

  // The recommended order is the flagship roadmap's own phase sequence — one
  // representative topic per phase, so it is derived rather than curated.
  const recommended = roadmap.phases
    .map((phase) => {
      const first = phase.chapters[0] ? getChapterMeta(phase.chapters[0]) : undefined;
      if (!first) return null;
      const topic = topics.find((tp) => tp.domain === first.domain);
      return topic ? { topic, phase } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 9);

  /** Plain, already-localised data for the client card (see topic-card.tsx). */
  function cardData(topic: (typeof topics)[number]): TopicCardData {
    const counts = {
      chapters: topic.chapters.length,
      labs: topic.labs.length,
      roadmaps: topic.roadmaps.length,
      projects: topic.projects.length,
    };
    return {
      id: topic.id,
      href: `/${typed}/topics/${topic.id}`,
      title: isAr ? topic.titleAr : topic.title,
      areaTitle: areaTitle.get(topic.area) ?? "",
      colour: domainColor(topic.domain),
      level: t(`level.${levelOf(topic.chapters)}`),
      counts,
      formatted: {
        chapters: formatNumber(counts.chapters, typed),
        labs: formatNumber(counts.labs, typed),
        roadmaps: formatNumber(counts.roadmaps, typed),
        projects: formatNumber(counts.projects, typed),
      },
      labels: {
        chapters: t("topics.statChapters"),
        labs: t("topics.statLabs"),
        roadmaps: t("topics.statPhases2"),
        projects: t("topics.statProjects"),
      },
    };
  }

  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-content">
          {t("topics.title")}
        </h1>
        <p className="mt-3 text-lg text-content-secondary">{t("topics.subtitle")}</p>
      </header>

      <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-baseline gap-1.5">
            <dt className="order-2 text-sm text-content-muted">{stat.label}</dt>
            <dd className="order-1 font-display text-xl font-bold tabular-nums text-content">
              {formatNumber(stat.value, typed)}
            </dd>
          </div>
        ))}
      </dl>

      {/* ── Recommended order ──────────────────────────────────────────── */}
      {recommended.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-content">
            {t("topics.recommended")}
          </h2>
          <p className="mt-1 text-sm text-content-secondary">{t("topics.recommendedBody")}</p>
          <ol className="mt-4 flex flex-wrap items-center gap-2">
            {recommended.map(({ topic, phase }, index) => (
              <li key={phase.id} className="flex items-center gap-2">
                <Link
                  href={`/${typed}/topics/${topic.id}`}
                  className="badge border px-3 py-1.5 text-content-secondary transition-colors hover:border-primary/50 hover:text-content"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: domainColor(topic.domain) }}
                    aria-hidden
                  />
                  {isAr ? topic.titleAr : topic.title}
                </Link>
                {index < recommended.length - 1 && (
                  <span className="icon-directional text-content-muted" aria-hidden>
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── By area ────────────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="font-display text-xl font-semibold text-content">
          {t("topics.byArea")}
        </h2>
        <div className="mt-5 space-y-8">
          {areas
            .filter((area) => byArea[area.id])
            .map((area) => {
              const inArea = topics.filter((topic) => topic.area === area.id);
              const chapters = new Set(inArea.flatMap((tp) => tp.chapters)).size;
              const labs = new Set(inArea.flatMap((tp) => tp.labs)).size;
              return (
                <div key={area.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display font-semibold text-content">
                      {isAr ? area.titleAr : area.title}
                    </h3>
                    <p className="text-xs tabular-nums text-content-muted">
                      {formatNumber(inArea.length, typed)} {t("topics.statTopics")} ·{" "}
                      {formatNumber(chapters, typed)} {t("topics.statChapters")}
                      {labs > 0 && ` · ${formatNumber(labs, typed)} ${t("topics.statLabs")}`}
                    </p>
                  </div>
                  <ExpandableGrid
                    items={inArea.map((topic) => (
                      <TopicCard key={topic.id} topic={cardData(topic)} />
                    ))}
                    labels={{
                      more: t("topics.moreInArea", { count: "{count}" }),
                      less: t("topics.showLess"),
                    }}
                  />
                </div>
              );
            })}
        </div>
      </section>

      {/* ── Everything, filterable ─────────────────────────────────────── */}
      <section className="mt-16 border-t pt-10">
        <h2 className="mb-6 font-display text-xl font-semibold text-content">
          {t("topics.allTopics")}
        </h2>

        <FilterBar
          className="reveal-items list-virtual grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          items={topics.map((topic) => ({
            id: topic.id,
            level: levelOf(topic.chapters),
            domain: topic.area,
            title: isAr ? topic.titleAr : topic.title,
            search: `${topic.title} ${topic.titleAr} ${topic.domain} ${topic.area}`,
            metrics: {
              chapters: topic.chapters.length,
              labs: topic.labs.length,
              coverage:
                topic.chapters.length + topic.labs.length * 2 + topic.roadmaps.length,
            },
            node: <TopicCard topic={cardData(topic)} />,
          }))}
          sorts={[
            { value: "default", label: t("sort.recommended") },
            { value: "coverage", label: t("sort.coverage"), metric: "coverage" },
            { value: "labs", label: t("sort.labs"), metric: "labs" },
            { value: "chapters", label: t("sort.chapters"), metric: "chapters" },
            { value: "title", label: t("sort.alpha") },
          ]}
          groups={[
            {
              key: "level",
              label: t("filter.level"),
              options: (["beginner", "intermediate", "advanced", "expert", "all"] as const)
                .filter((level) => byLevel[level])
                .map((level) => ({
                  value: level,
                  label: t(`level.${level}`),
                  count: byLevel[level] ?? 0,
                })),
            },
            {
              key: "domain",
              label: t("filter.area"),
              options: areas
                .filter((area) => byArea[area.id])
                .map((area) => ({
                  value: area.id,
                  label: isAr ? area.titleAr : area.title,
                  count: byArea[area.id] ?? 0,
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
            sortBy: t("filter.sortBy"),
            count: t("topics.countLabel"),
          }}
        />
      </section>

      {/* ── By tool ────────────────────────────────────────────────────── */}
      <section className="mt-16 border-t pt-10">
        <h2 className="font-display text-xl font-semibold text-content">
          {t("topics.browseByTool")}
        </h2>
        <p className="mt-1 text-sm text-content-secondary">{t("topics.browseByToolBody")}</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[...new Set(topics.map((topic) => topic.domain))].sort().map((domain) => {
            const meta = getDomainMeta(domain);
            if (!meta) return null;
            const count = topics.filter((tp) => tp.domain === domain).length;
            return (
              <li key={domain}>
                <Link
                  href={`/${typed}/topics/${domain}`}
                  className="card card-lift group flex h-full items-center gap-2.5 p-4"
                >
                  <span
                    className="h-4 w-1 shrink-0 rounded-full"
                    style={{ background: domainColor(domain) }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-content">
                      {isAr ? meta.titleAr : meta.title}
                    </span>
                    <span className="text-xs tabular-nums text-content-muted">
                      {formatNumber(count, typed)} {t("topics.statTopics")}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
