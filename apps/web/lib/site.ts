/** Project-wide constants that appear in more than one place. */
export const SITE = {
  repo: process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/Waleeddarwesh/EgyKode",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://egykode.com",
} as const;

/** Deep link to edit a chapter on GitHub (§6.2 chapter chrome). */
export function editUrl(sourcePath: string): string {
  return `${SITE.repo}/edit/main/${sourcePath}`;
}
