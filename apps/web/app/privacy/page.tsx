import type { Metadata } from "next";
import Link from "next/link";

/**
 * Privacy policy.
 *
 * Written because the Microsoft Store requires a reachable privacy policy URL,
 * and a submission with a 404 there is rejected. It is deliberately outside
 * `[locale]` so the URL is stable and does not depend on locale negotiation.
 *
 * Every claim below was checked against the code rather than assumed:
 * `lib/progress.ts` writes to `localStorage` only, there is no analytics script
 * anywhere in `apps/web`, and there is no authentication. If any of that
 * changes, this page has to change in the same commit.
 */
export const metadata: Metadata = {
  title: "Privacy — EgyKode",
  description: "What EgyKode collects: nothing. Progress is stored on your own device.",
};

const UPDATED = "24 August 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">Privacy</h1>
      <p className="mt-2 text-sm text-content-secondary">Last updated {UPDATED}</p>

      <div className="prose mt-8">
        <h2>The short version</h2>
        <p>
          EgyKode does not collect your personal information. There are no accounts, no advertising,
          and no analytics or tracking scripts in the site or the Windows app.
        </p>

        <h2>What is stored, and where</h2>
        <p>
          Your reading progress — which chapters you have marked complete and which lab criteria you
          have ticked — is stored in your browser&apos;s local storage, on your own device. It is
          never sent to us, because there is nowhere for it to be sent.
        </p>
        <p>
          Clearing your browser data, or uninstalling the Windows app, deletes that progress. We
          cannot restore it, because we never had a copy.
        </p>

        <h2>Offline reading</h2>
        <p>
          The Windows app and the website keep a copy of pages you open so you can read them without
          a connection. That cache lives on your device and contains only pages published on this
          site.
        </p>

        <h2>What we do not do</h2>
        <ul>
          <li>No accounts, sign-in or passwords</li>
          <li>No advertising, and no advertising identifiers</li>
          <li>No analytics, telemetry or usage tracking</li>
          <li>No cookies used to identify you</li>
          <li>No selling or sharing of data — there is none to sell</li>
        </ul>

        <h2>Hosting and links</h2>
        <p>
          The site is served as static files. Our hosting provider may keep standard server logs,
          such as IP addresses and requested URLs, for security and reliability. We do not use those
          logs to build any profile of you.
        </p>
        <p>
          Pages link out to third-party sites — GitHub, cloud provider documentation, and lab
          environments such as Killercoda. Once you follow a link, that site&apos;s own privacy
          policy applies, not this one.
        </p>

        <h2>Children</h2>
        <p>
          EgyKode is a technical learning resource intended for a general audience. It does not
          knowingly collect information from anyone, of any age.
        </p>

        <h2>Changes</h2>
        <p>
          If this policy changes, the date at the top changes with it. Since the site is open
          source, the full history of this page is public.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy can be raised as an issue on the{" "}
          <Link href="https://github.com/Waleeddarwesh/EgyKode">project repository</Link>.
        </p>
      </div>
    </main>
  );
}
