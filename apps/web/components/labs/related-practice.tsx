import { ExternalLink, Repeat } from "lucide-react";

/**
 * Other people's scenarios on the same tool.
 *
 * Rendered well away from the hands-on panel and styled quietly, because it is
 * not how you do this lab — it is where to get more repetitions on one tool
 * afterwards. Killercoda hosts maintained collections for Trivy, Argo, Helm
 * and most of the rest, and a learner who has used Trivy inside a pipeline may
 * reasonably want a dedicated hour on Trivy alone.
 *
 * Nothing here settles a success criterion, and the copy says so. The
 * distinction matters: the criteria describe this lab's platform, and no
 * amount of practice elsewhere demonstrates that this cluster was built.
 */
export function RelatedPractice({
  items,
  labels,
}: {
  items?: { title: string; url: string; note?: string }[];
  labels: { heading: string; body: string };
}) {
  if (!items?.length) return null;

  return (
    <section className="mt-8 rounded-lg border p-5" aria-labelledby="related-practice">
      <p
        id="related-practice"
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-content-muted"
      >
        <Repeat size={13} aria-hidden />
        {labels.heading}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-content-secondary">{labels.body}</p>

      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.url}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2"
              style={{ color: "var(--clr-primary-dark)" }}
            >
              {item.title}
              <ExternalLink size={13} aria-hidden />
            </a>
            {item.note && (
              <span className="ms-2 text-xs text-content-muted">{item.note}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
