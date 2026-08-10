import { SITE } from "@/lib/site";

/**
 * Schema.org structured data (MASTER_PROMPT §12.2).
 *
 * Search engines rank a page on what it is, not only on the words in it. A
 * chapter that declares itself a `LearningResource` with a level, a time
 * commitment and a teaching organisation behind it is legible in a way that
 * prose alone is not — and it is what makes course carousels, FAQ results and
 * sitelink search boxes possible.
 *
 * Every claim here must be true of the page it describes. Marking a
 * placeholder as a `Course`, or an unanswered question as an FAQ, is the kind
 * of thing that earns a manual action rather than a rich result.
 */

const url = (path: string) => `${SITE.url}${path}`;

/** The publisher, referenced by everything else via `@id`. */
export function organization() {
  return {
    "@type": "Organization",
    "@id": url("/#organization"),
    name: "EgyKode",
    url: SITE.url,
    logo: {
      "@type": "ImageObject",
      url: url("/icon.svg"),
    },
    description:
      "Open-source Cloud and DevOps learning platform — structured chapters, hands-on labs, roadmaps and deployable projects.",
    sameAs: [SITE.repo].filter(Boolean),
  };
}

/**
 * The site itself.
 *
 * Deliberately no `SearchAction`: it produces the sitelinks search box, but
 * only when a real URL accepts a query parameter. Search here is a command
 * palette with no `/search?q=` route, so declaring one would point Google at a
 * 404 — add it the day that route exists, not before.
 */
export function website(locale: string) {
  return {
    "@type": "WebSite",
    "@id": url("/#website"),
    url: SITE.url,
    name: "EgyKode",
    inLanguage: locale,
    publisher: { "@id": url("/#organization") },
  };
}

/** A chapter: a free learning resource, with its level and reading time. */
export function learningResource(chapter: {
  title: string;
  description: string;
  path: string;
  level: string;
  readingTime: number;
  updated: string;
  locale: string;
  keywords: string[];
  /** "Chapter" for reading, "Lab" for something you run. */
  resourceType?: string;
}) {
  return {
    "@type": "LearningResource",
    "@id": url(chapter.path) + "#resource",
    name: chapter.title,
    description: chapter.description,
    url: url(chapter.path),
    inLanguage: chapter.locale,
    learningResourceType: chapter.resourceType ?? "Chapter",
    educationalLevel: chapter.level,
    // ISO 8601 duration — "PT45M" for a 45-minute read.
    timeRequired: `PT${chapter.readingTime}M`,
    dateModified: chapter.updated,
    keywords: chapter.keywords.join(", "),
    isAccessibleForFree: true,
    provider: { "@id": url("/#organization") },
    publisher: { "@id": url("/#organization") },
  };
}

/** A roadmap: an ordered course made of chapters. */
export function course(roadmap: {
  title: string;
  description: string;
  path: string;
  locale: string;
  chapters: number;
}) {
  return {
    "@type": "Course",
    "@id": url(roadmap.path) + "#course",
    name: roadmap.title,
    description: roadmap.description,
    url: url(roadmap.path),
    inLanguage: roadmap.locale,
    isAccessibleForFree: true,
    provider: { "@id": url("/#organization") },
    // Required by Google for Course rich results.
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${roadmap.chapters * 45}M`,
    },
  };
}

/**
 * The interview question bank as an FAQ.
 *
 * Only valid because every answer is present in the page's HTML — collapsed
 * behind a toggle, which Google explicitly permits, but never absent.
 */
export function faqPage(
  questions: { question: string; answer: string }[],
  path: string,
) {
  return {
    "@type": "FAQPage",
    "@id": url(path) + "#faq",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

/** Trail shown under the result in search. */
export function breadcrumbs(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: url(crumb.path),
    })),
  };
}

/** Wraps one or more nodes in a single `@graph` document. */
export function graph(...nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
