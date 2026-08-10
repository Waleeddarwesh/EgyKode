import type { MetadataRoute } from "next";

import { getAllChapters } from "@/lib/content";
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
    for (const path of ["", "/learn", "/roadmaps", "/projects"]) {
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
  }

  // Referenced so the roadmap count is a build-time fact, not a guess.
  void getRoadmaps();
  return entries;
}
