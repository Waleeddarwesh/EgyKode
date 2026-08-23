import type { Metadata } from "next";
import Link from "next/link";

/**
 * Shown when a page is requested with no network and no cached copy.
 *
 * Deliberately outside `[locale]`: it must be reachable when nothing else is,
 * so it carries no data dependencies and no locale negotiation. It is also the
 * one page in the site that is honest about what an installed app cannot do —
 * the labs need a terminal, and a terminal needs a network.
 */
export const metadata: Metadata = {
  title: "Offline — EgyKode",
  description: "You are offline. Pages you have already opened are still available.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Offline</p>
        <h1 className="mt-2 text-3xl font-bold">This page has not been saved yet</h1>
      </div>

      <p className="text-content-secondary leading-relaxed">
        You are not connected, and this page is not in the offline cache. Anything you have already
        opened is still readable — EgyKode keeps a copy of every page you visit.
      </p>

      <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-semibold">Available offline</p>
        <p className="mt-1 text-sm text-content-secondary">
          Chapters, labs, roadmaps and projects you have opened before, and anything you chose to
          save for offline reading.
        </p>
        <p className="mt-4 text-sm font-semibold">Needs a connection</p>
        <p className="mt-1 text-sm text-content-secondary">
          Running a lab in a browser terminal, anything that talks to AWS, and community pages. The
          reading is local; the practice is not, because a terminal is somewhere else.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/en/" className="btn btn-primary h-10 px-5">
          Go to the home page
        </Link>
        <Link href="/en/learn/" className="btn btn-outline h-10 px-5">
          Open the curriculum
        </Link>
      </div>
    </main>
  );
}
