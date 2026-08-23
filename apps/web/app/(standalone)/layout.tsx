import { fontVariables } from "@/lib/fonts";
import { THEME_SCRIPT } from "@/lib/theme-script";

/**
 * Document shell for the two pages that sit outside `[locale]`.
 *
 * `app/layout.tsx` deliberately returns bare `children`: `<html>` carries `lang`
 * and `dir`, so it belongs to the layout that knows the locale. That works for
 * everything under `[locale]`, and leaves any page outside it with **no
 * document at all** — no `<html>`, no `lang`, no fonts, no theme script. The
 * browser recovers by implying the tags, so the page renders and looks almost
 * right, which is why it is easy to miss. `check-export` caught it as two pages
 * missing their font preload.
 *
 * Next allows more than one root layout precisely for this: a route group with
 * its own `<html>`. The URLs are unchanged — `(standalone)` is a grouping, not
 * a path segment, so these stay at `/privacy/` and `/offline/`.
 *
 * Why these two are not simply under `[locale]`:
 *
 *   `/offline/`   the service worker falls back to it when the network is gone.
 *                 A locale-negotiated URL would make the worker guess which
 *                 locale to serve at the moment it can least afford to be wrong.
 *   `/privacy/`   Partner Center and the Store need one stable URL, and a legal
 *                 page is better with a single canonical address.
 *
 * `lang="en"` is hardcoded because both pages are written in English only. If
 * either is ever translated, it belongs under `[locale]` instead of gaining a
 * language switch here.
 */
export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
