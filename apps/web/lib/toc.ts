import GithubSlugger from "github-slugger";

export interface Heading {
  depth: 2 | 3;
  text: string;
  id: string;
}

/**
 * Extract the table of contents from MDX source.
 *
 * Uses the same slugger as rehype-slug, so the anchors here match the ids
 * rendered into the document — a hand-rolled slugifier would drift on the
 * first heading containing punctuation, and the links would silently do
 * nothing.
 *
 * Depth is capped at h3: a four-level contents list is a site map, not a guide.
 */
export function extractHeadings(mdx: string): Heading[] {
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];
  let inFence = false;

  for (const line of mdx.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    // A `## ` inside a code fence is a comment, not a heading.
    if (inFence) continue;

    const match = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (!match) continue;

    const text = match[2]!
      .replace(/`([^`]*)`/g, "$1")
      .replace(/\*\*([^*]*)\*\*/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\\([{}<])/g, "$1") // undo the MDX escaping from migration
      .trim();

    if (!text) continue;
    headings.push({ depth: match[1]!.length as 2 | 3, text, id: slugger.slug(text) });
  }

  return headings;
}
