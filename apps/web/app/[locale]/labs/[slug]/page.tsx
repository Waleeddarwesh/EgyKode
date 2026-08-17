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

import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbs, graph, learningResource } from "@/lib/structured-data";
import { LabHeader, BeforeYouStart } from "@/components/labs/lab-header";
import { LabComplete } from "@/components/labs/lab-complete";
import { LabSteps } from "@/components/labs/lab-steps";
import { NextLab } from "@/components/labs/next-lab";
import { ProjectContribution } from "@/components/labs/project-contribution";
import { SuccessCriteria } from "@/components/labs/success-criteria";
import { mdxComponents } from "@/components/content/mdx";
import { domainColor,
  localizedTitle,
} from "@/lib/content";
import { getTopic } from "@/lib/domains";
import { getAllLabs, getLab, getLabContribution, getLabMeta, getLabSteps, getPathNeighbours, splitLabMission } from "@/lib/labs";
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
  // Where this sits in the Project Path, so a lab does not dead-end at its
  // cleanup block and send the reader back to the index to find their place.
  const neighbours = getPathNeighbours(lab.labId);
  const contribution = getLabContribution(lab.labId);
  const contentDir = lab.fellBackToEnglish ? "ltr" : undefined;
  const contentLang = lab.fellBackToEnglish ? "en" : typed;

  // The opening section — "The scenario", "The goal", "The incident" — is
  // rendered above the success criteria, and the procedure below them.
  const { mission, rest } = splitLabMission(lab.body);
  const steps = getLabSteps(rest);

  // Why the next lab comes next: what this one produced that it consumes.
  // Only shown when the graph actually records that dependency — an ordering
  // with no edge between the two has no reason to give.
  const nextContribution = neighbours?.next
    ? getLabContribution(neighbours.next.lab.labId)
    : null;
  const whyNext =
    contribution && nextContribution?.requires.some((r) => r.labId === lab.labId)
      ? contribution.produces
      : undefined;

  // What kind of evidence backs this lab, counted once here so the completion
  // card can report it. A criterion given as a plain string is an assertion.
  const evidenceCounts = (lab.successCriteria ?? []).reduce(
    (acc, c) => {
      const kind = typeof c === "string" ? "self" : c.verify;
      acc[kind] += 1;
      return acc;
    },
    { command: 0, state: 0, reasoning: 0, self: 0 },
  );

  // One component map for both halves, so a code block behaves identically
  // whichever side of the criteria it lands on.
  const mdxParts = mdxComponents({
    copy: t("code.copy"),
    copyCommand: t("code.copyCommand"),
    copied: t("code.copied"),
    terminal: t("code.terminal"),
    destructive: t("code.destructive"),
    destructiveBody: t("code.destructiveBody"),
    locale: typed,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Labs are 113 of the site's pages and had no structured data at all,
          while chapters, roadmaps and the question bank did. They are the part
          of the platform least like everyone else's, so they are the pages
          most worth describing to a search engine. */}
      <JsonLd
        data={graph(
          learningResource({
            title: lab.title,
            description: lab.description,
            path: `/${typed}/labs/${slug}`,
            level: lab.level,
            readingTime: lab.estimatedMinutes,
            updated: lab.updated ?? "",
            locale: typed,
            keywords: [lab.domain, ...(lab.skills ?? []), ...(lab.tools ?? [])],
            resourceType: lab.tier === "guided" ? "Lab" : "Exercise",
          }),
          breadcrumbs([
            { name: "EgyKode", path: `/${typed}` },
            { name: t("labs.title"), path: `/${typed}/labs` },
            { name: lab.title, path: `/${typed}/labs/${slug}` },
          ]),
        )}
      />

      {/* Labs → phase → this lab. The middle step used to be the domain tag
          ("linux"), which is how the content is filed rather than where the
          reader is: a learner on lab 1 of 59 wants the phase, and a route back
          into it. The lab itself is the current page, so it is not a link. */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-content-muted">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <BackLink href={`/${typed}/labs`} label={t("labs.title")} />
          </li>
          {neighbours && (
            <li className="flex items-center gap-2">
              <span aria-hidden>/</span>
              <Link
                href={`/${typed}/labs#phase-${neighbours.phase.id}`}
                className="hover:text-content"
                style={{ color: colour }}
              >
                {neighbours.phase.title}
              </Link>
            </li>
          )}
          <li className="flex min-w-0 items-center gap-2">
            <span aria-hidden>/</span>
            <span aria-current="page" className="truncate text-content-secondary">
              {lab.title}
            </span>
          </li>
        </ol>
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
          counter: neighbours
            ? t("labs.labCounter", {
                n: formatNumber(neighbours.position, typed),
                total: formatNumber(neighbours.total, typed),
              })
            : undefined,
        }}
        position={
          neighbours
            ? { phaseNumber: neighbours.phase.number, phaseTitle: neighbours.phase.title }
            : undefined
        }
      />

      {/* Where this sits in the build. Above "Before you start" deliberately:
          the first question is why this lab exists at this moment, and only
          then what it needs. */}
      {neighbours && contribution && (
        <ProjectContribution
          produces={contribution.produces}
          requires={contribution.requires}
          unlocks={contribution.unlocks}
          labHref={(id) => `/${typed}/labs/${id}`}
          labels={{
            heading: t("labs.contributionHeading"),
            builtAlready: t("labs.contributionBuilt"),
            youAdd: t("labs.contributionAdds"),
            unlocks: t("labs.contributionUnlocks"),
          }}
        />
      )}

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

      {/* The mission, before the bar it is measured against.
          The criteria used to sit here and the scenario several screens below,
          so a reader was told what they had to prove before being told what
          the task was. Understanding the problem has to come first; the
          criteria then read as a definition of done rather than a quiz. */}
      {mission && (
        <div className="prose mt-8" lang={contentLang} dir={contentDir}>
          <MDXRemote source={mission} options={mdxOptions} components={mdxParts} />
        </div>
      )}

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
            evidenceCommand: t("labs.evidenceCommand"),
            evidenceState: t("labs.evidenceState"),
            evidenceReasoning: t("labs.evidenceReasoning"),
            evidenceSelf: t("labs.evidenceSelf"),
          }}
        />
      </div>

      {/* Position within the work. Rendered next to the body rather than in
          it, so it can be a rail in the empty margin on a wide screen and a
          single sticky line on a narrow one. */}
      <LabSteps
        steps={steps}
        labels={{ heading: t("labs.stepsHeading"), position: t("labs.stepPosition") }}
      />

      <div id="build" className="prose mt-10" lang={contentLang} dir={contentDir}>
        <MDXRemote source={rest} options={mdxOptions} components={mdxParts} />
      </div>

      {/* Appears only once every criterion is met. Placed after the work
          rather than beside the checklist: it is the end of the lab, and it
          should be what the reader arrives at, not something waiting in the
          margin the whole time. */}
      <LabComplete
        labId={lab.labId}
        criteriaCount={lab.successCriteria?.length ?? 0}
        evidence={evidenceCounts}
        skills={lab.skills ?? []}
        next={
          neighbours?.next
            ? {
                title: neighbours.next.lab.title,
                href: `/${typed}/labs/${neighbours.next.lab.labId}`,
              }
            : undefined
        }
        labels={{
          heading: t("labs.completeHeading"),
          demonstrated: t("labs.completeDemonstrated"),
          evidenceHeading: t("labs.completeEvidence"),
          evidenceCommand: t("labs.evidenceCommand"),
          evidenceState: t("labs.evidenceState"),
          evidenceReasoning: t("labs.evidenceReasoning"),
          evidenceSelf: t("labs.evidenceSelf"),
          next: t("labs.completeNext"),
          continueLabel: t("labs.continueTheProject"),
        }}
      />

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

      {neighbours && (
        <NextLab
          neighbours={neighbours}
          locale={typed}
          colour={neighbours.next ? domainColor(neighbours.next.lab.domain) : colour}
          whyNext={whyNext}
          labels={{
            nextUp: t("labs.nextUp"),
            nextPhase: t("labs.nextPhase"),
            phaseComplete: t("labs.phaseComplete"),
            milestone: t("labs.pathMilestone"),
            position: t("labs.pathPosition", {
              position: formatNumber(neighbours.position, typed),
              total: formatNumber(neighbours.total, typed),
            }),
            previous: t("labs.previousLab"),
            minutes: (n) => t("chapter.minutes", { minutes: formatNumber(n, typed) }),
            level: (level) => t(`level.${level}`),
            billable: t("labs.pathBillable"),
            pathEnd: t("labs.pathEnd"),
            pathEndBody: t("labs.pathEndBody"),
            browseLibrary: t("labs.browseLibrary"),
            labsHref: `/${typed}/labs`,
            whyNext: t("labs.whyNext"),
          }}
        />
      )}
    </div>
  );
}
