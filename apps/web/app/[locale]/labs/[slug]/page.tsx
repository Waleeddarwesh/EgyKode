import { ArrowRight, Clock, DollarSign, Swords, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BackLink } from "@/components/layout/back-link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { LabHeader, BeforeYouStart } from "@/components/labs/lab-header";
import { SuccessCriteria } from "@/components/labs/success-criteria";
import { mdxComponents } from "@/components/content/mdx";
import { domainColor,
  localizedTitle,
} from "@/lib/content";
import { getTopic } from "@/lib/domains";
import { getAllLabs, getLab, getLabMeta } from "@/lib/labs";
import { PUBLIC_LOCALES, formatNumber, getTranslations, isLocale, type Locale, languageAlternates } from "@/lib/i18n";

export function generateStaticParams() {
  return PUBLIC_LOCALES.flatMap((locale) =>
    getAllLabs().map((lab) => ({ locale, slug: lab.labId })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const lab = getLabMeta(slug);
  if (!lab) return {};
  return {
    title: lab.title,
    description: lab.description,
    alternates: {
      canonical: `/${locale}/labs/${slug}`,
      languages: languageAlternates((locale) => `/${locale}/labs/${slug}`),
    },
  };
}

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [rehypePrettyCode, { theme: { dark: "github-dark-dimmed", light: "github-light" }, keepBackground: false }],
      [rehypeAutolinkHeadings, { behavior: "append", content: { type: "text", value: "#" } }],
    ],
  },
} as never;

export default async function LabPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const lab = getLab(slug, locale as Locale);
  if (!lab) notFound();

  const typed = locale as Locale;
  const t = getTranslations(typed);
  const colour = domainColor(lab.domain);
  const isChallenge = lab.tier === "challenge";
  const counterpart = isChallenge ? lab.guidedLabId : lab.challengeId;
  // The concept behind the lab — practice without the explanation is a recipe.
  const relatedChapters = getTopic(lab.domain).chapters.slice(0, 3);
  const contentDir = lab.fellBackToEnglish ? "ltr" : undefined;
  const contentLang = lab.fellBackToEnglish ? "en" : typed;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-content-muted">
        <BackLink href={`/${typed}/labs`} label={t("labs.title")} />
        <span className="mx-2" aria-hidden>/</span>
        <Link href={`/${typed}/topics/${lab.domain}`} className="font-mono hover:text-content" style={{ color: colour }}>
          {lab.domain}
        </Link>
      </nav>

      <LabHeader
        lab={lab}
        locale={typed}
        colour={colour}
        contentDir={contentDir}
        labels={{
          guided: t("labs.guided"),
          challenge: t("labs.challenge"),
          incident: t("labs.incident"),
          minutes: t("chapter.minutes", {
            minutes: formatNumber(lab.estimatedMinutes, typed),
          }),
          level: t(`level.${lab.level}`),
          objectives: t("labs.objectivesCount", {
            count: formatNumber(lab.successCriteria?.length ?? 0, typed),
          }),
          start: t("labs.startLab"),
          tryChallenge: t("labs.challenge"),
          viewGuided: t("labs.viewGuided"),
          destructive: t("labs.destructiveBadge"),
        }}
      />

      <BeforeYouStart
        lab={lab}
        labels={{
          heading: t("labs.beforeYouStart"),
          tools: t("labs.toolsNeeded"),
          skills: t("labs.skillsProved"),
          cost: t("labs.costLabel"),
          cleanup: t("labs.cleanupLink"),
        }}
      />

      <div className="mt-8">
        <SuccessCriteria
          labId={lab.labId}
          criteria={lab.successCriteria ?? []}
          contentDir={contentDir}
          labels={{
            heading: isChallenge ? t("labs.criteriaChallenge") : t("labs.criteria"),
            done: t("labs.done"),
            of: t("roadmap.of"),
            complete: t("labs.allDone"),
          }}
        />
      </div>

      <div id="build" className="prose mt-10" lang={contentLang} dir={contentDir}>
        <MDXRemote
          source={lab.body}
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

      {relatedChapters.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-lg font-semibold text-content">
            {t("labs.theConcept")}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {relatedChapters.map((chapter) => (
              <li key={chapter.contentId}>
                <Link
                  href={`/${typed}/learn/${chapter.domain}/${chapter.contentId}`}
                  className="badge border px-3 py-1.5 text-content-secondary transition-colors hover:border-primary/40 hover:text-content"
                >
                  {localizedTitle(chapter, typed)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {counterpart && getLabMeta(counterpart) && (
        <section className="mt-14 border-t pt-8">
          <Link
            href={`/${typed}/labs/${counterpart}`}
            className="card card-lift group flex items-center gap-4 p-5"
            style={!isChallenge ? { borderColor: "var(--clr-warning)" } : undefined}
          >
            {isChallenge ? <Wrench size={18} aria-hidden className="shrink-0 text-content-muted" /> : <Swords size={18} aria-hidden className="shrink-0" style={{ color: "var(--clr-warning)" }} />}
            <span className="min-w-0 flex-1">
              <span className="block text-xs uppercase tracking-wide text-content-muted">
                {isChallenge ? t("labs.needTheSteps") : t("labs.readyToTry")}
              </span>
              <span className="mt-0.5 block font-medium text-content">
                {isChallenge ? t("labs.backToGuided") : t("labs.doItAlone")}
              </span>
            </span>
            <ArrowRight size={16} aria-hidden className="icon-directional shrink-0 text-content-muted transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>
      )}
    </div>
  );
}
