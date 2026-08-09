import { ImageResponse } from "next/og";

import { domainColor, getAllChapters, getChapterMeta } from "@/lib/content";
import { PUBLIC_LOCALES, isLocale } from "@/lib/i18n";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "EgyKode";

export function generateStaticParams() {
  return PUBLIC_LOCALES.flatMap((locale) =>
    getAllChapters().map((c) => ({ locale, domain: c.domain, slug: c.contentId })),
  );
}

/**
 * Per-page OG card (§12.3): title, domain colour bar, level, and the mark.
 * Generated at build time from the same tokens the site uses, so a shared link
 * looks like the page it points at.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; domain: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const chapter = getChapterMeta(slug);
  const title = chapter?.title ?? "EgyKode";
  const accent = chapter ? domainColor(chapter.domain) : "#22de7e";

  // The CSS variables are not available in the OG renderer, so domain colours
  // resolve to their dark-theme literals here.
  const LITERAL: Record<string, string> = {
    "var(--dm-foundation)": "#a78bfa",
    "var(--dm-container)": "#63a9ff",
    "var(--dm-orchestration)": "#6c8cff",
    "var(--dm-iac)": "#b388ff",
    "var(--dm-cloud)": "#ff9f43",
    "var(--dm-cicd)": "#38bdf8",
    "var(--dm-gitops)": "#ff7ab6",
    "var(--dm-observability)": "#ffc857",
    "var(--dm-security)": "#f56c6c",
    "var(--dm-platform)": "#2dd4bf",
  };
  const colour = LITERAL[accent] ?? "#22de7e";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0f1316",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="42" height="47" viewBox="0 0 100 110.96" fill="#1fe881">
            <path d="M50.14 0.0 L80.27 29.86 L73.7 36.44 L55.89 18.63 L55.34 18.9 L55.34 64.66 L55.89 65.75 L86.85 33.97 L100.0 33.97 L69.04 65.75 L99.45 96.99 L100.0 97.81 L100.0 110.68 L62.47 72.88 L46.3 89.04 L46.03 17.53 L9.32 54.52 L9.59 67.95 L10.14 68.22 L27.4 50.14 L38.63 39.45 L38.63 52.05 L9.59 81.64 L9.86 98.9 L38.36 69.86 L38.63 82.74 L10.96 110.96 L0.0 110.68 L0.0 50.41 L49.86 0.27 Z" />
          </svg>
          <span style={{ color: "#f0f3f2", fontSize: 30, fontWeight: 700 }}>EgyKode</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ width: 96, height: 6, background: colour, borderRadius: 3 }} />
          <div
            style={{
              color: "#f0f3f2",
              fontSize: title.length > 44 ? 60 : 74,
              fontWeight: 700,
              lineHeight: 1.1,
              marginTop: 28,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, color: "#869094", fontSize: 24 }}>
          <span style={{ color: colour, textTransform: "uppercase" }}>
            {chapter?.domain ?? "platform"}
          </span>
          <span>·</span>
          <span>{chapter?.level ?? "all"}</span>
          <span>·</span>
          <span>{chapter?.readingTime ?? 10} min</span>
          <span style={{ marginLeft: "auto" }}>{isLocale(locale) ? locale : "en"}</span>
        </div>
      </div>
    ),
    size,
  );
}
