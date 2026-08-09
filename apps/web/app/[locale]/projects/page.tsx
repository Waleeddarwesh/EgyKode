import { ArrowRight, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthorByline } from "@/components/author-card";
import { domainColor } from "@/lib/content";
import { getAuthor, getProjects } from "@/lib/projects";
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
    title: t("build.title"),
    description: t("build.subtitle"),
    alternates: { canonical: `/${locale}/projects`, languages: languageAlternates((locale) => `/${locale}/projects`) },
  };
}

export default async function BuildPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typed = locale as Locale;
  const t = getTranslations(typed);
  const isAr = typed === "ar";
  const projects = getProjects();

  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-content">
          {t("build.title")}
        </h1>
        <p className="mt-3 text-lg text-content-secondary">{t("build.subtitle")}</p>
      </header>

      <ul className="mt-12 grid gap-5 lg:grid-cols-2">
        {projects.map((project) => {
          const author = getAuthor(project.author);
          return (
            <li key={project.id}>
              {/* The whole card is one link. An overlay pseudo-element left
                  most of the surface inert, so only the footer looked
                  clickable — users should never have to hunt for the hit
                  area. Safe here because the card contains no nested links. */}
              <Link
                href={`/${typed}/projects/${project.id}`}
                className="card card-lift group flex h-full flex-col p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-semibold text-content">
                    {(isAr && project.titleAr) || project.title}
                  </h2>
                  {project.featured && (
                    <span className="badge shrink-0 text-primary" style={{ background: "var(--clr-success-bg)" }}>
                      <Star size={12} aria-hidden />
                      {t("build.featured")}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-content-secondary">
                  {(isAr && project.summaryAr) || project.summary}
                </p>

                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {project.stack.map((tech) => (
                    <li
                      key={tech}
                      className="badge border px-2 py-0.5 font-mono text-[11px]"
                      style={{ color: domainColor(tech) }}
                    >
                      {tech}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-5">
                  {author && <AuthorByline author={author} locale={typed} showLinks={false} />}
                  <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-content-muted">
                    <span>{project.license}</span>
                    {project.source?.stars ? (
                      <span className="tabular-nums">
                        ★ {formatNumber(project.source.stars, typed)}
                      </span>
                    ) : null}
                    {/* The whole card opens the project page, so this must
                        name that action. Labelling it "View source" made it
                        look like a GitHub link that never fired. */}
                    <span className="ms-auto inline-flex items-center gap-1 font-medium text-primary transition-transform group-hover:translate-x-0.5">
                      {t("build.viewProject")}
                      <ArrowRight size={12} className="icon-directional" aria-hidden />
                    </span>
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
