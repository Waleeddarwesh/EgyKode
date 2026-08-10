import { ArrowRight, GitBranch, Layers, ScanSearch } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Mark } from "@/components/brand/logo";
import { JsonLd } from "@/components/seo/json-ld";
import { ContinueLearning, type PathNode } from "@/components/learn/continue-learning";
import { getAllChapters, getRoadmap, domainColor } from "@/lib/content";
import { getGeneratedTopics } from "@/lib/domains";
import { formatNumber, getTranslations, isLocale } from "@/lib/i18n";
import { graph, organization, website } from "@/lib/structured-data";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getTranslations(locale);
  const roadmap = getRoadmap();
  const chapters = getAllChapters();
  const isAr = locale === "ar";

  // The ordered path, flattened once on the server so the client component
  // only has to read progress and pick the first unfinished node.
  const pathNodes: PathNode[] = roadmap.phases.flatMap((phase) =>
    phase.chapters
      .map((id) => chapters.find((c) => c.contentId === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((chapter) => ({
        contentId: chapter.contentId,
        title: chapter.title,
        href: `/${locale}/learn/${chapter.domain}/${chapter.contentId}`,
        phaseTitle: isAr ? phase.titleAr : phase.title,
        phaseNumber: phase.number,
        readingTime: chapter.readingTime,
        colour: domainColor(chapter.domain),
      })),
  );

  // Real numbers from the content index — never hardcoded (§5.4 band 2).
  const stats = [
    { value: formatNumber(chapters.length, locale), label: t("home.statChapters") },
    { value: formatNumber(roadmap.phases.length, locale), label: t("home.statPhases") },
    { value: formatNumber(getGeneratedTopics().length, locale), label: t("home.statTopics") },
    { value: "MIT", label: t("home.statLicense") },
  ];

  const why = [
    { icon: Layers, title: t("home.why1Title"), body: t("home.why1Body") },
    { icon: ScanSearch, title: t("home.why2Title"), body: t("home.why2Body") },
    { icon: GitBranch, title: t("home.why3Title"), body: t("home.why3Body") },
  ];

  return (
    <>
      <JsonLd data={graph(organization(), website(locale))} />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-content px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-content-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              {t("brand.promise")}
            </p>

            <h1 className="font-display text-[clamp(2.1rem,5.2vw,3.4rem)] font-bold leading-[1.12] tracking-tight text-content">
              {t("home.heroTitle")}
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-content-secondary">
              {t("home.heroBody")}
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={`/${locale}/learn`} className="btn btn-primary h-11 px-5">
                {t("action.startLearning")}
                <ArrowRight size={17} className="icon-directional" aria-hidden />
              </Link>
              <Link href={`/${locale}/projects`} className="btn btn-outline h-11 px-5">
                {t("action.seePlatform")}
              </Link>
            </div>
          </div>

          {/* The mark at scale — the one permitted brand animation (§2.4). */}
          <div className="relative hidden justify-center lg:flex">
            <div
              className="animate-glow absolute inset-0 -z-10 blur-3xl"
              style={{ background: "var(--clr-primary-glow)" }}
              aria-hidden
            />
            <Mark className="animate-mark h-64 w-auto text-brand" />
          </div>
        </div>

        {/* Proof strip */}
        <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-bg px-5 py-6 text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-display text-2xl font-bold text-content">
                  {stat.value}
                </span>
                <span className="mt-1 block text-xs uppercase tracking-wide text-content-muted">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Continue, for anyone who has started ───────────────────────── */}
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <ContinueLearning
          nodes={pathNodes}
          locale={locale}
          labels={{
            heading: t("home.continueHeading"),
            resume: t("home.continueResume"),
            progress: t("roadmap.progress"),
            of: t("roadmap.of"),
            phase: t("learn.phase"),
            minutes: t("chapter.minutes"),
            done: t("home.continueDone"),
            restart: t("home.continueNext"),
          }}
        />
      </div>

      {/* ── Why ────────────────────────────────────────────────────────── */}
      <section className="reveal mx-auto max-w-content px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-bold text-content">{t("home.whyTitle")}</h2>
        <div className="stagger mt-8 grid gap-5 md:grid-cols-3">
          {why.map(({ icon: Icon, title, body }, index) => (
            <div
              key={title}
              className="card card-lift p-6"
              style={{ "--i": index } as React.CSSProperties}
            >
              <Icon size={22} className="text-primary" aria-hidden />
              <h3 className="mt-4 font-display text-lg font-semibold text-content">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-content-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── The path ───────────────────────────────────────────────────── */}
      <section className="reveal mx-auto max-w-content px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-content">
              {t("home.pathTitle")}
            </h2>
            <p className="mt-2 max-w-xl text-content-secondary">{t("home.pathBody")}</p>
          </div>
          <Link
            href={`/${locale}/learn`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("action.viewAll")} →
          </Link>
        </div>

        <ol className="reveal-items mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roadmap.phases.map((phase) => {
            const first = phase.chapters[0];
            const chapter = first ? chapters.find((c) => c.contentId === first) : undefined;
            return (
              <li key={phase.id}>
                {/* Straight to the first chapter. A fragment link to the learn
                    index made every card look like it did the same thing. */}
                <Link
                  href={
                    chapter
                      ? `/${locale}/learn/${chapter.domain}/${chapter.contentId}`
                      : `/${locale}/learn`
                  }
                  className="card card-lift group flex h-full items-start gap-4 p-5"
                >
                  <span
                    className="mt-0.5 font-mono text-sm font-bold tabular-nums"
                    style={{ color: chapter ? domainColor(chapter.domain) : undefined }}
                  >
                    {phase.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-content">
                      {isAr ? phase.titleAr : phase.title}
                    </span>
                    <span className="mt-1 block text-xs text-content-muted">
                      {formatNumber(phase.chapters.length, locale)} {t("learn.chapters")}
                    </span>
                  </span>
                  <ArrowRight
                    size={15}
                    aria-hidden
                    className="icon-directional mt-0.5 shrink-0 text-content-muted opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </Link>
              </li>
            );
          })}

          {/* The promise, made structural: the path ends in a real project. */}
          <li>
            <Link
              href={`/${locale}/projects/cloud-native-devops-platform`}
              className="card card-lift group flex h-full items-start gap-4 border-primary/40 p-5"
              style={{ background: "var(--clr-success-bg)" }}
            >
              <span className="mt-0.5 font-mono text-sm font-bold text-primary">★</span>
              <span className="min-w-0">
                <span className="block font-medium text-content">
                  {isAr ? roadmap.productionProject.titleAr : roadmap.productionProject.title}
                </span>
                <span className="mt-1 block text-xs text-content-muted">
                  {t("learn.productionProject")}
                </span>
              </span>
            </Link>
          </li>
        </ol>
      </section>
    </>
  );
}
