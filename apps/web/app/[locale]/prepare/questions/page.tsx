import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FilterBar } from "@/components/filters/filter-bar";
import { BackLink } from "@/components/layout/back-link";
import { JsonLd } from "@/components/seo/json-ld";
import { QuestionCard } from "@/components/questions/question-card";
import { domainColor, getChapterMeta } from "@/lib/content";
import { getDomainMeta } from "@/lib/domains";
import { getQuestions } from "@/lib/questions";
import { breadcrumbs, faqPage, graph } from "@/lib/structured-data";
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
    title: t("questions.title"),
    description: t("seo.questionsDescription"),
    alternates: {
      canonical: `/${locale}/prepare/questions`,
      languages: languageAlternates((locale) => `/${locale}/prepare/questions`),
    },
  };
}

export default async function QuestionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typed = locale as Locale;
  const t = getTranslations(typed);
  const isAr = typed === "ar";
  const questions = getQuestions();

  // The bank is English-only for now, so pin it on an RTL page (§4.3).
  const contentDir = isAr ? ("ltr" as const) : undefined;

  const byLevel: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  for (const q of questions) {
    byLevel[q.level] = (byLevel[q.level] ?? 0) + 1;
    byDomain[q.domain] = (byDomain[q.domain] ?? 0) + 1;
  }

  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:px-8">
      <JsonLd
        data={graph(
          // Capped: Google reads a sane number of entries, and the whole bank
          // would add more bytes than it earns.
          faqPage(
            questions.slice(0, 50).map((q) => ({ question: q.question, answer: q.answer })),
            `/${typed}/prepare/questions`,
          ),
          breadcrumbs([
            { name: "EgyKode", path: `/${typed}` },
            { name: t("nav.prepare"), path: `/${typed}/prepare` },
            { name: t("questions.title"), path: `/${typed}/prepare/questions` },
          ]),
        )}
      />

      <nav aria-label="Breadcrumb" className="mb-6">
        <BackLink href={`/${typed}/prepare`} label={t("nav.prepare")} />
      </nav>

      <header className="mb-8 max-w-2xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-content">
          {t("questions.title")}
        </h1>
        <p className="mt-3 text-lg text-content-secondary">{t("questions.subtitle")}</p>
        <p className="mt-3 text-sm text-content-muted">
          {t("questions.provenance", {
            count: formatNumber(questions.length, typed),
          })}
        </p>
      </header>

      <FilterBar
        className="reveal-items list-virtual grid gap-4 md:grid-cols-2"
        items={questions.map((q) => ({
          id: q.id,
          level: q.level,
          domain: q.domain,
          title: q.question,
          search: `${q.question} ${q.answer} ${q.domain}`,
          node: (
            <QuestionCard
              question={q.question}
              answer={q.answer}
              contentDir={contentDir}
              revealLabel={t("questions.reveal")}
              hideLabel={t("questions.hide")}
              meta={{
                domain: q.domain,
                domainColour: domainColor(q.domain),
                level: t(`level.${q.level}`),
                kind: t(`questions.kind.${q.kind}`),
                // The chapter's own domain, not the question's. A question is
                // tagged by subject area ("gitops", "observability") while the
                // chapter lives in a directory named after the tool ("argocd",
                // "prometheus"), and the two are allowed to differ — using the
                // question's domain produced two dead links from this page.
                chapterHref: `/${typed}/learn/${getChapterMeta(q.chapter)?.domain ?? q.domain}/${q.chapter}`,
                chapterLabel: t("questions.readChapter"),
              }}
            />
          ),
        }))}
        groups={[
          {
            key: "level",
            label: t("filter.level"),
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
          count: t("questions.countLabel"),
        }}
      />
    </div>
  );
}
