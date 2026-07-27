import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://egykode.com"),
  title: { default: "EgyKode", template: "%s · EgyKode" },
  description: "The open Cloud & DevOps platform — Arabic and English.",
  applicationName: "EgyKode",
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
