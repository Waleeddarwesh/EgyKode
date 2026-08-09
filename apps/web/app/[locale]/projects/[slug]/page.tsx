import { ExternalLink, GitFork, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BackLink } from "@/components/layout/back-link";
import { notFound } from "next/navigation";

import { AuthorByline } from "@/components/author-card";
import { domainColor } from "@/lib/content";
import { getAuthor, getProject, getProjects } from "@/lib/projects";
import { PUBLIC_LOCALES, formatNumber, getTranslations, isLocale, type Locale, languageAlternates } from "@/lib/i18n";

export function generateStaticParams() {
  return PUBLIC_LOCALES.flatMap((locale) =>
    getProjects().map((project) => ({ locale, slug: project.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = getProject(slug);
  if (!project || !isLocale(locale)) return {};
  return {
    title: project.title,
    description: project.summary,
    alternates: {
      canonical: `/${locale}/projects/${slug}`,
      languages: languageAlternates((locale) => `/${locale}/projects/${slug}`),
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const project = getProject(slug);
  if (!project) notFound();

  const typed = locale as Locale;
  const t = getTranslations(typed);
  const isAr = typed === "ar";
  const author = getAuthor(project.author);
  const highlights = (isAr && project.highlightsAr) || project.highlights || [];

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-content-muted">
        <BackLink href={`/${typed}/projects`} label={t("build.title")} />
      </nav>

      <header className="max-w-prose">
        <h1 className="font-display text-[clamp(1.9rem,4vw,2.75rem)] font-bold leading-tight tracking-tight text-content">
          {(isAr && project.titleAr) || project.title}
        </h1>
        <p className="mt-4 text-lg text-content-secondary">
          {(isAr && project.summaryAr) || project.summary}
        </p>

        <ul className="mt-5 flex flex-wrap gap-1.5">
          {project.stack.map((tech) => (
            <li
              key={tech}
              className="badge border px-2.5 py-1 font-mono text-xs"
              style={{ color: domainColor(tech) }}
            >
              {tech}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          {project.repo ? (
            <a
              href={project.repo}
              className="btn btn-primary h-10 px-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("build.viewSource")}
              <ExternalLink size={15} aria-hidden />
            </a>
          ) : (
            // Shipping a 404 behind a "View source" button is worse than
            // saying the repository is not published yet.
            <span className="btn btn-outline h-10 cursor-default px-4 text-content-muted">
              {t("build.sourceUnpublished")}
            </span>
          )}
          <span className="text-sm text-content-muted">{project.license}</span>
          {project.source && (
            <span className="flex items-center gap-3 text-sm tabular-nums text-content-muted">
              <span className="inline-flex items-center gap-1">
                <Star size={14} aria-hidden />
                {formatNumber(project.source.stars, typed)}
              </span>
              <span className="inline-flex items-center gap-1">
                <GitFork size={14} aria-hidden />
                {formatNumber(project.source.forks, typed)}
              </span>
            </span>
          )}
        </div>
      </header>

      {author && (
        <section className="card mt-10 max-w-prose p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-content-muted">
            {t("build.author")}
          </p>
          <AuthorByline author={author} locale={typed} />
          {project.source?.kind === "github" && (
            <p className="mt-3 text-xs text-content-muted">{t("build.importedNotice")}</p>
          )}
        </section>
      )}

      {project.why && (
        <section className="prose mt-12">
          <h2>{t("build.why")}</h2>
          <p>{project.why}</p>
        </section>
      )}

      {highlights.length > 0 && (
        <section className="mt-12 max-w-prose">
          <h2 className="font-display text-xl font-semibold text-content">
            {t("build.whatsInside")}
          </h2>
          <ul className="mt-4 space-y-2.5">
            {highlights.map((item) => (
              <li key={item} className="flex gap-3 text-content-secondary">
                <span className="mt-1 text-primary" aria-hidden>
                  ▪
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {project.decisions && project.decisions.length > 0 && (
        <section className="mt-12 max-w-prose">
          <h2 className="font-display text-xl font-semibold text-content">
            {t("build.decisions")}
          </h2>
          <dl className="mt-4 space-y-5">
            {project.decisions.map((decision) => (
              <div key={decision.question} className="card p-5">
                <dt className="font-medium text-content">{decision.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-content-secondary">
                  {decision.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </article>
  );
}
