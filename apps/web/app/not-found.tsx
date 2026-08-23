import Link from "next/link";

import { fontVariables } from "@/lib/fonts";
import { THEME_SCRIPT } from "@/lib/theme-script";

/**
 * The page a visitor gets for any URL that is not part of the site.
 *
 * This is not the same file as app/[locale]/not-found.tsx. That one handles a
 * miss *inside* a locale, renders inside the locale layout, and therefore
 * arrives with the header, the footer and a way back. This one handles
 * everything else, and it is the one production actually serves: the export
 * writes it to `404.html`, and cloudfront.tf maps both 404 and 403 to
 * `/404.html`. Every wrong link, every stale search result, every probe for a
 * file that is not there lands here.
 *
 * Until now it was Next's built-in default — "404: This page could not be
 * found." in the browser's default font on a white page, with no branding and
 * no link anywhere. It rendered that way because the root layout is a
 * pass-through, so nothing supplied a document: no <html>, no stylesheet, no
 * fonts, no theme. The same root cause that left /privacy/ and /offline/
 * without a shell.
 *
 * The fix is available here for the same reason the root layout's own comment
 * gives: RootLayout wraps `children` in *no* element, so a full document
 * rendered from inside it is valid markup rather than an <html> nested in a
 * <div>. That is why this file renders <html> and <body> itself.
 *
 * Deliberately self-contained — no TopBar, no footer, no translation lookup.
 * Those need a locale, and the defining property of this page is that the URL
 * did not resolve to one. Guessing a locale in order to render navigation is
 * how a 404 page turns into a second error.
 */
/**
 * Both fields are load-bearing, and neither is as redundant as it looks.
 *
 * `title` overrides the root layout's "EgyKode". Without it the export carries
 * two <title> tags — this file renders its own <head>, and Next appends the
 * inherited metadata into it.
 *
 * `robots` looks redundant because Next emits `noindex` for a not-found page by
 * itself. It is not: the root layout declares `robots: { index: true }` for the
 * site, that directive is inherited here too, and the built page came out
 * carrying `noindex` *and* `index, follow`. Measured — removing this line puts
 * `index, follow` back on the 404. `follow: true` is deliberate: the links out
 * of this page are the point of it.
 */
export const metadata = {
  title: "Page not found — EgyKode",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <html lang="en" dir="ltr" className={fontVariables} suppressHydrationWarning>
      <head>
        {/* Inline and synchronous, so the page does not paint in the wrong
            theme before correcting itself. Shared with both real layouts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* No service worker registration here, deliberately: this document is
            served with a 404 status for any unknown path, and registering the
            worker from an error response is a good way to cache one. The
            worker is registered by every real page instead. */}
      </head>
      <body className="font-sans antialiased">
        <main className="mx-auto flex min-h-screen max-w-content flex-col items-start justify-center px-4 py-24 sm:px-6 lg:px-8">
          <p className="font-mono text-sm text-content-muted">404</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-content">Page not found</h1>
          <p className="mt-3 max-w-md text-content-secondary">
            That page does not exist, or it has moved.
          </p>

          {/* Three ways back rather than one. Someone who arrived from a stale
              link usually wanted a specific chapter or lab, not the home page. */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/en/" className="btn btn-primary h-11 px-5">
              Go home
            </Link>
            <Link href="/en/learn/" className="btn h-11 px-5">
              Browse chapters
            </Link>
            <Link href="/en/labs/" className="btn h-11 px-5">
              Browse labs
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
