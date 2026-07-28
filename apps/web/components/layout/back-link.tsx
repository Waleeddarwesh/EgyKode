"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Back navigation.
 *
 * Uses browser history when the reader arrived from inside the site, so "back"
 * returns them to the exact list position they were scrolled to. When they
 * landed directly — from search, a shared link, or a new tab — history would
 * either do nothing or leave the site, so it falls back to a real link to the
 * parent section.
 *
 * The label always names the destination rather than saying "Back", because a
 * reader who arrived from Google has no idea what "back" means here.
 */
export function BackLink({
  href,
  label,
  className,
}: {
  /** Parent section, used when there is no in-site history to return to. */
  href: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // history.length > 1 alone is unreliable — a fresh tab can still report 2.
    // Pairing it with a same-origin referrer is a good approximation of
    // "they navigated here from within the site".
    const sameOrigin =
      typeof document !== "undefined" &&
      document.referrer !== "" &&
      new URL(document.referrer, location.href).origin === location.origin;
    setCanGoBack(sameOrigin && window.history.length > 1);
  }, []);

  const classes = `group inline-flex items-center gap-1.5 text-sm text-content-secondary transition-colors hover:text-content ${className ?? ""}`;
  const icon = (
    <ArrowLeft
      size={15}
      aria-hidden
      // Mirrors in RTL: "back" points the way the reader came from.
      className="icon-directional transition-transform group-hover:-translate-x-0.5"
    />
  );

  if (!canGoBack) {
    return (
      <Link href={href} className={classes}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => router.back()} className={classes}>
      {icon}
      {label}
    </button>
  );
}
