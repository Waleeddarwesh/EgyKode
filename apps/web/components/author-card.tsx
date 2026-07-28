import { Github, Globe, Linkedin, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { Author } from "@/lib/projects";
import type { Locale } from "@/lib/i18n";

const ICONS = { github: Github, linkedin: Linkedin, website: Globe, email: Mail } as const;

/**
 * Avatar with an initials fallback, so a missing photo degrades to something
 * deliberate rather than a broken image icon.
 */
export function Avatar({
  author,
  size = 40,
  className,
}: {
  author: Author;
  size?: number;
  className?: string;
}) {
  const initials = author.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-surface-active font-display font-semibold text-content-secondary ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {author.avatar ? (
        <Image
          src={author.avatar}
          alt=""
          width={size * 2}
          height={size * 2}
          className="h-full w-full object-cover"
          // Imported GitHub avatars are remote; see next.config.mjs for the
          // host allowlist. Mirroring them locally is preferred (§13.5) so
          // visitor IPs are not disclosed to a third party.
          unoptimized={author.avatar.startsWith("http")}
        />
      ) : (
        initials
      )}
    </span>
  );
}

export function AuthorByline({
  author,
  locale,
  showLinks = true,
}: {
  author: Author;
  locale: Locale;
  showLinks?: boolean;
}) {
  const isAr = locale === "ar";
  const name = (isAr && author.nameAr) || author.name;
  const headline = (isAr && author.headlineAr) || author.headline;

  return (
    <div className="flex items-center gap-3">
      <Avatar author={author} size={44} />
      <div className="min-w-0">
        <p className="truncate font-medium text-content">{name}</p>
        {headline && <p className="truncate text-sm text-content-muted">{headline}</p>}
      </div>

      {showLinks && author.links && (
        <ul className="ms-auto flex items-center gap-1">
          {Object.entries(author.links).map(([key, href]) => {
            const Icon = ICONS[key as keyof typeof ICONS];
            if (!Icon || !href) return null;
            return (
              <li key={key}>
                <Link
                  href={key === "email" ? `mailto:${href}` : href}
                  className="btn btn-outline h-8 w-8 !px-0"
                  aria-label={`${name} on ${key}`}
                  rel="noopener me"
                >
                  <Icon size={15} aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
