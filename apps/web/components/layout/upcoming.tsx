import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type { Locale } from "@/lib/i18n";

/**
 * A section that is specified but not yet built.
 *
 * This is deliberately not a "coming soon" splash. A dead end is worse than a
 * missing link: it costs a click and returns nothing. So the page states what
 * the section will contain, which delivery phase it belongs to, and — most
 * importantly — sends the reader somewhere that works right now.
 */
export function Upcoming({
  locale,
  title,
  intent,
  phase,
  items,
  elsewhere,
}: {
  locale: Locale;
  title: string;
  intent: string;
  phase: string;
  /**
   * `href` marks an item that is already built. Most items on an "upcoming"
   * page are genuinely not there yet, but a few are — the question bank is
   * live, so listing it as a flat card sends people away from something they
   * could be using right now.
   */
  items: { title: string; body: string; href?: string; cta?: string }[];
  elsewhere: { href: string; label: string }[];
}) {
  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-content-secondary">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--clr-accent)" }}
            aria-hidden
          />
          {phase}
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight text-content">{title}</h1>
        <p className="mt-3 text-lg text-content-secondary">{intent}</p>
      </header>

      <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.title} className="min-w-0">
            {item.href ? (
              <Link href={item.href} className="card card-lift group flex h-full flex-col p-6">
                <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold text-content">
                  {item.title}
                  <ArrowRight
                    size={15}
                    aria-hidden
                    className="icon-directional opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-content-secondary">{item.body}</p>
                {item.cta && (
                  <span className="mt-auto pt-4 text-sm font-medium text-primary">
                    {item.cta} →
                  </span>
                )}
              </Link>
            ) : (
              <div className="card flex h-full flex-col p-6">
                <h2 className="font-display text-lg font-semibold text-content">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-content-secondary">{item.body}</p>
              </div>
            )}
          </li>
        ))}
      </ul>

      <section className="mt-14 border-t pt-10">
        <h2 className="font-display text-xl font-semibold text-content">
          {locale === "ar" ? "متاح دلوقتي" : "Available now"}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {elsewhere.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="btn btn-outline h-10 px-4">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
