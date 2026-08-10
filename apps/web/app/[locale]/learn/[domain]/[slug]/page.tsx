import { ArrowLeft, ArrowRight, Clock, HelpCircle, Languages, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BackLink } from "@/components/layout/back-link";
import { JsonLd } from "@/components/seo/json-ld";
import { Resources } from "@/components/content/resources";
import { getResources } from "@/lib/resources";
import { MarkComplete } from "@/components/learn/mark-complete";
import { notFound } from "next/navigation";
import { MDXRemote, type MDXRemoteProps } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import {
  domainColor,
  getAllChapters,
  getChapter,
  getNeighbours,
  getChapterMeta,
  localizedTitle,
} from "@/lib/content";
import { mdxComponents } from "@/components/content/mdx";
import { TableOfContents } from "@/components/content/toc";
import { extractHeadings } from "@/lib/toc";
import { getLabsForDomain } from "@/lib/labs";
import { getQuestionsForChapter } from "@/lib/questions";
import { PUBLIC_LOCALES, formatNumber, getTranslations, isLocale, type Locale, languageAlternates } from "@/lib/i18n";
import { SITE } from "@/lib/site";
import { breadcrumbs, graph, learningResource } from "@/lib/structured-data";

export function generateStaticParams() {
  return PUBLIC_LOCALES.flatMap((locale) =>
    getAllChapters().map((chapter) => ({
      locale,
      domain: chapter.domain,
      slug: chapter.contentId,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; domain: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, domain, slug } = await params;
  if (!isLocale(locale)) return {};
  const chapter = getChapter(domain, slug, locale);
  if (!chapter) return {};

  return {
    title: chapter.title,
    description: chapter.description,
    alternates: {
      canonical: `/${locale}/learn/${domain}/${slug}`,
      languages: languageAlternates((locale) => `/${locale}/learn/${domain}/${slug}`),
    },
    openGraph: {
      title: chapter.title,
      description: chapter.description,
      type: "article",
      modifiedTime: chapter.updated,
    },
  };
}

/** Shiki highlights at build time — the client never loads a highlighter (§12.4). */
const mdxOptions: MDXRemoteProps["options"] = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypePrettyCode,
        {
          theme: { dark: "github-dark-dimmed", light: "github-light" },
          keepBackground: false,
        },
      ],
      [
        rehypeAutolinkHeadings,
        {
          behavior: "append",
          properties: { className: ["heading-anchor"], ariaHidden: true, tabIndex: -1 },
          content: { type: "text", value: "#" },
        },
      ],
    ],
  },
};

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ locale: string; domain: string; slug: string }>;
}) {
  const { locale, domain, slug } = await params;
  if (!isLocale(locale)) notFound();

  const typed = locale as Locale;
  const chapter = getChapter(domain, slug, typed);
  if (!chapter) notFound();

  const t = getTranslations(typed);
  const { previous, next } = getNeighbours(chapter.contentId);
  const colour = domainColor(chapter.domain);
  const headings = extractHeadings(chapter.body);
  // A chapter that ends at "next chapter" is a document. These turn it into a
  // step in a loop: read it, do it, then check you can explain it.
  const labs = getLabsForDomain(chapter.domain).slice(0, 4);
  const questions = getQuestionsForChapter(chapter.contentId);

  // When a chapter falls back to English on an Arabic page, EVERY string that
  // came from that English source must be pinned to ltr — not just the body.
  // A right-aligned English heading renders "?What is a VPC", because the
  // bidi algorithm moves neutral punctuation to what it thinks is the end.
  // Translated UI chrome (badges, breadcrumb) stays in the page direction.
  const contentDir = chapter.fellBackToEnglish ? "ltr" : undefined;
  const contentLang = chapter.fellBackToEnglish ? "en" : typed;

  return (
    // A reading column plus a contents rail. The prose stays at a 72ch measure
    // because widening it to fill the row would make it harder to read — the
    // spare width carries navigation instead (§6.2).
    <div className="mx-auto grid max-w-[1140px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_14rem] lg:px-8 xl:gap-16">
      <JsonLd
        data={graph(
          learningResource({
            title: chapter.title,
            description: chapter.description,
            path: `/${typed}/learn/${domain}/${slug}`,
            level: chapter.level,
            readingTime: chapter.readingTime,
            updated: chapter.updated,
            locale: typed,
            keywords: [chapter.domain, ...chapter.objectives],
          }),
          breadcrumbs([
            { name: "EgyKode", path: `/${typed}` },
            { name: t("learn.title"), path: `/${typed}/learn` },
            { name: chapter.title, path: `/${typed}/learn/${domain}/${slug}` },
          ]),
        )}
      />

      <article className="min-w-0">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-content-muted">
        <BackLink href={`/${typed}/learn`} label={t("learn.title")} />
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="font-mono" style={{ color: colour }}>
          {chapter.domain}
        </span>
      </nav>

      <header className="max-w-prose">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className="badge"
            style={{ background: "var(--clr-surface-active)", color: colour }}
          >
            {t(`level.${chapter.level}`)}
          </span>
          <span className="badge text-content-muted">
            <Clock size={13} aria-hidden />
            {t("chapter.minutes", {
              minutes: formatNumber(chapter.readingTime, typed),
            })}
          </span>
        </div>

        <h1
          dir={contentDir}
          lang={contentLang}
          className="font-display text-[clamp(1.9rem,4vw,2.75rem)] font-bold leading-tight tracking-tight text-content"
        >
          {chapter.title}
        </h1>

        {chapter.objectives.length > 0 && (
          <div className="mt-6 rounded-lg border p-4" style={{ background: "var(--clr-bg-secondary)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
              {t("chapter.objectives")}
            </p>
            <ul
              dir={contentDir}
              lang={contentLang}
              className="mt-2 space-y-1 text-sm text-content-secondary"
            >
              {chapter.objectives.map((objective) => (
                <li key={objective} className="flex gap-2">
                  <span className="text-primary" aria-hidden>
                    ✓
                  </span>
                  {objective}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Never a silent language switch — say so explicitly (§4.4b). */}
        {chapter.fellBackToEnglish && (
          <p
            className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 text-sm"
            style={{ background: "var(--clr-warning-bg)", color: "var(--clr-text)" }}
          >
            <Languages size={16} aria-hidden />
            {t("chapter.notTranslated")}
            {/* --clr-primary is 4.29:1 on this tinted banner; the pressed
                shade clears AA comfortably. */}
            <Link
              href={SITE.repo}
              className="font-medium underline underline-offset-2"
              style={{ color: "var(--clr-primary-dark)" }}
            >
              {t("chapter.notTranslatedCta")} →
            </Link>
          </p>
        )}
      </header>

      {/* Chapter body is English prose when falling back, so pin its direction. */}
      <div className="prose mt-10" lang={contentLang} dir={contentDir}>
        <MDXRemote
          source={chapter.body}
          options={mdxOptions}
          components={mdxComponents({
            copy: t("code.copy"),
            copyCommand: t("code.copyCommand"),
            copied: t("code.copied"),
            terminal: t("code.terminal"),
            destructive: t("code.destructive"),
            destructiveBody: t("code.destructiveBody"),
          })}
        />
      </div>

      <div className="mt-12 border-t pt-6">
        <MarkComplete
          contentId={chapter.contentId}
          labels={{
            mark: t("progress.mark"),
            done: t("progress.done"),
            storedLocally: t("progress.storedLocally"),
          }}
        />
      </div>

      <nav className="mt-10 grid gap-3 border-t pt-8 sm:grid-cols-2" aria-label="Chapter">
        {previous ? (
          <Link
            href={`/${typed}/learn/${previous.domain}/${previous.contentId}`}
            className="card card-lift flex min-w-0 items-center gap-3 p-4"
          >
            <ArrowLeft size={17} className="icon-directional shrink-0 text-content-muted" aria-hidden />
            <span className="min-w-0">
              <span className="block text-xs text-content-muted">{t("action.previous")}</span>
              <span
                dir={contentDir}
                lang={contentLang}
                className="block truncate text-sm font-medium text-content"
              >
                {localizedTitle(previous, typed)}
              </span>
            </span>
          </Link>
        ) : (
          <span />
        )}

        {next && (
          <Link
            href={`/${typed}/learn/${next.domain}/${next.contentId}`}
            className="card card-lift flex min-w-0 items-center justify-end gap-3 p-4 text-end"
          >
            <span className="min-w-0">
              <span className="block text-xs text-content-muted">{t("action.next")}</span>
              <span
                dir={contentDir}
                lang={contentLang}
                className="block truncate text-sm font-medium text-content"
              >
                {localizedTitle(next, typed)}
              </span>
            </span>
            <ArrowRight size={17} className="icon-directional shrink-0 text-content-muted" aria-hidden />
          </Link>
        )}
      </nav>

      {labs.length > 0 && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-content">
            <Wrench size={17} aria-hidden style={{ color: colour }} />
            {t("chapter.practise")}
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {labs.map((lab) => (
              <li key={lab.labId}>
                <Link
                  href={`/${typed}/labs/${lab.labId}`}
                  className="card card-lift group flex h-full items-center gap-3 p-4"
                >
                  <span className="min-w-0 flex-1 text-sm font-medium text-content">
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

      {questions.length > 0 && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-content">
            <HelpCircle size={17} aria-hidden style={{ color: colour }} />
            {t("chapter.checkYourself")}
          </h2>
          <p className="mt-1 text-sm text-content-secondary">
            {t("chapter.checkYourselfBody", {
              count: formatNumber(questions.length, typed),
            })}
          </p>
          <ul className="mt-3 space-y-1.5">
            {questions.slice(0, 4).map((question) => (
              <li key={question.id} className="flex gap-2 text-sm text-content-secondary">
                <span className="mt-0.5 shrink-0 text-content-muted" aria-hidden>
                  ?
                </span>
                <span>{question.question}</span>
              </li>
            ))}
          </ul>
          <Link
            href={`/${typed}/prepare/questions`}
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            {t("questions.title")} →
          </Link>
        </section>
      )}

      {chapter.relatedChapters.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-lg font-semibold text-content">
            {t("chapter.related")}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {chapter.relatedChapters.map((id) => {
              const related = getChapterMeta(id);
              if (!related) return null;
              return (
                <li key={id}>
                  <Link
                    href={`/${typed}/learn/${related.domain}/${related.contentId}`}
                    className="badge border px-3 py-1.5 text-content-secondary transition-colors hover:text-content"
                  >
                    {localizedTitle(related, typed)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Last on the page, deliberately: read the chapter first, then go
          watch someone build it if that helps. */}
      <Resources
        resources={getResources(chapter.domain)}
        labels={{
          heading: t("resources.heading"),
          body: t("resources.body"),
          arabic: t("resources.arabic"),
        }}
      />
      </article>

      <aside className="hidden lg:block">
        <TableOfContents
          headings={headings}
          label={t("chapter.onThisPage")}
          contentDir={contentDir}
          contentLang={contentLang}
        />
      </aside>
    </div>
  );
}
