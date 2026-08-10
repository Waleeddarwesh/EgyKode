import type { MetadataRoute } from "next";

import { getAllChapters } from "@/lib/content";
import { getAllDomains, getGeneratedTopics } from "@/lib/domains";
import { getAllLabs } from "@/lib/labs";
import { getProjects, getRoadmaps } from "@/lib/projects";
import { PUBLIC_LOCALES } from "@/lib/i18n";

/**
 * Generated at build time. `output: export` has no server to run this per
 * request, so it must be declared static explicitly.
 */
export const dynamic = "force-static";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://egykode.com";

/**
 * Machine-drafted translations are excluded until a human has reviewed them
 * (§4.4b): indexing unreviewed Arabic would damage exactly the audience the
 * Arabic corpus exists to serve.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const alternates = (path: string) => ({
    languages: Object.fromEntries(PUBLIC_LOCALES.map((l) => [l, `${SITE}/${l}${path}`])),
  });

  for (const locale of PUBLIC_LOCALES) {
    // Index pages. `/community` and `/jobs` are deliberately absent: they are
    // placeholders, and advertising a page that says "planned" spends crawl
    // budget to rank a promise. Account pages are excluded for the obvious
    // reason.
    for (const path of ["", "/learn", "/roadmaps", "/projects", "/labs", "/topics", "/courses",
                        "/prepare/questions"]) {
      entries.push({
        url: `${SITE}/${locale}${path}`,
        changeFrequency: "weekly",
        priority: path === "" ? 1 : 0.8,
        alternates: alternates(path),
      });
    }

    for (const chapter of getAllChapters()) {
      if (locale === "ar" && chapter.translationStatus === "machine-draft") continue;
      const path = `/learn/${chapter.domain}/${chapter.contentId}`;
      entries.push({
        url: `${SITE}/${locale}${path}`,
        lastModified: chapter.updated,
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: alternates(path),
      });
    }

    for (const project of getProjects()) {
      const path = `/projects/${project.id}`;
      entries.push({
        url: `${SITE}/${locale}${path}`,
        lastModified: project.updated,
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: alternates(path),
      });
    }

    // Roadmaps are the highest-intent landing pages on the site — somebody
    // searching "cloud devops roadmap" wants one of these four, not the index.
    for (const roadmap of getRoadmaps()) {
      const path = `/roadmaps/${roadmap.id}`;
      entries.push({
        url: `${SITE}/${locale}${path}`,
        changeFrequency: "monthly",
        priority: 0.9,
        alternates: alternates(path),
      });
    }

    // 100+ pages that were advertised nowhere. A topic hub is the page that
    // answers a query like "kubernetes networkpolicy" with everything the
    // corpus has on it.
    for (const id of [...getAllDomains(), ...getGeneratedTopics().map((t) => t.id)]) {
      const path = `/topics/${id}`;
      entries.push({
        url: `${SITE}/${locale}${path}`,
        changeFrequency: "weekly",
        priority: 0.5,
        alternates: alternates(path),
      });
    }

    // Every lab, including challenges and incidents: each is distinct content
    // with its own objective, not a variant of another page.
    for (const lab of getAllLabs()) {
      const path = `/labs/${lab.labId}`;
      entries.push({
        url: `${SITE}/${locale}${path}`,
        changeFrequency: "monthly",
        priority: lab.tier === "guided" ? 0.7 : 0.5,
        alternates: alternates(path),
      });
    }
  }

  return entries;
}
