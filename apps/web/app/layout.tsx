import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://egykode.com"),
  // No `template` here. The locale layout owns it — defining one at both
  // levels applied it twice, producing "EgyKode — … · EgyKode" on the home
  // page, which reads as a broken title in a search result.
  title: "EgyKode",
  description:
    "Free, open-source Cloud and DevOps learning platform. Structured chapters, hands-on labs with challenge mode, ordered roadmaps, and projects you deploy — Linux, Docker, Kubernetes, Terraform, AWS, CI/CD, GitOps, observability and SRE.",
  applicationName: "EgyKode",
  // Not a ranking factor, but read by several non-Google engines and by the
  // preview cards that scrape a page before Google ever sees it.
  keywords: [
    "DevOps learning platform",
    "open source DevOps course",
    "learn Kubernetes",
    "learn Terraform",
    "AWS DevOps roadmap",
    "hands-on DevOps labs",
    "CI/CD tutorial",
    "GitOps",
    "SRE",
    "DevOps interview questions",
  ],
  authors: [{ name: "Waleed Darwesh" }],
  creator: "Waleed Darwesh",
  publisher: "EgyKode",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  twitter: { card: "summary_large_image", title: "EgyKode", creator: "@Waleeddarwesh" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f1316" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7f8" },
  ],
};

/**
 * Deliberately a pass-through.
 *
 * `<html>` and `<body>` are rendered by app/[locale]/layout.tsx, because `lang`
 * and `dir` must be correct in the server-rendered markup and only that layout
 * knows the locale. Wrapping children in any element here would nest `<html>`
 * inside it — which the browser's parser discards, breaking hydration and
 * rendering a blank page while `curl` still shows correct-looking HTML.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
