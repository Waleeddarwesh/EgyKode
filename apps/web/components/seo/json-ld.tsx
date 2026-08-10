/**
 * Emits a schema.org document as JSON-LD.
 *
 * A plain `<script>` in a server component: no client JavaScript, and the data
 * is in the HTML crawlers receive rather than something they have to execute
 * to see.
 *
 * `JSON.stringify` output is escaped for the one character that can break out
 * of a script element. React does not escape `dangerouslySetInnerHTML`, and a
 * chapter title containing `</script>` would otherwise end the block early.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
