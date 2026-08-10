import type { MetadataRoute } from "next";

/**
 * Generated at build time. `output: export` has no server to run this per
 * request, so it must be declared static explicitly.
 */
export const dynamic = "force-static";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://egykode.com";

/**
 * The AI-crawler policy is stated explicitly rather than left ambiguous
 * (§13.6). EgyKode's content is CC BY-SA: reuse is welcome, attribution is the
 * condition — so training crawlers are allowed, and the licence is what asks
 * for credit.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/_next/"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
