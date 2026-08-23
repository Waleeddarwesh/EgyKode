/**
 * The EgyKode mark, drawn for app icons.
 *
 * One definition, used by every icon size and by the maskable variant, so the
 * three files in the manifest cannot drift apart. The path is the same one the
 * OG cards draw.
 *
 * These are route handlers rather than metadata files, because the manifest
 * needs them at exact URLs. A route handler may not export `contentType`;
 * `ImageResponse` sets `image/png` itself.
 */

/** Brand tokens, copied deliberately: `next/og` cannot read CSS variables. */
const BRAND = "#22de7e";
const BACKGROUND = "#0f1316";

/** The mark, from `public/brand/mark.svg`. */
const MARK =
  "M50.14 0.0 L80.27 29.86 L73.7 36.44 L55.89 18.63 L55.34 18.9 L55.34 64.66 L55.89 65.75 " +
  "L86.85 33.97 L100.0 33.97 L69.04 65.75 L99.45 96.99 L100.0 97.81 L100.0 110.68 L62.47 72.88 " +
  "L46.3 89.04 L46.03 17.53 L9.32 54.52 L9.59 67.95 L10.14 68.22 L27.4 50.14 L38.63 39.45 " +
  "L38.63 52.05 L9.59 81.64 L9.86 98.9 L38.36 69.86 L38.63 82.74 L10.96 110.96 L0.0 110.68 " +
  "L0.0 50.41 L49.86 0.27 Z";

/**
 * @param size   the square canvas
 * @param inset  fraction of the canvas kept clear around the mark. Windows and
 *               Android crop a `maskable` icon to their own shape — a circle on
 *               some launchers — so a maskable icon needs the mark inside the
 *               safe zone, which the spec puts at 80% of the canvas. An `any`
 *               icon is shown as-is and can use more of the space.
 */
export function EgyKodeIcon({ size, inset = 0.22 }: { size: number; inset?: number }) {
  const mark = Math.round(size * (1 - inset * 2));
  // The path is 100 wide by 110.96 tall; keep that ratio so the mark is not
  // squashed, and scale to fit the smaller dimension.
  const height = mark;
  const width = Math.round(height * (100 / 110.96));

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BACKGROUND,
      }}
    >
      <svg width={width} height={height} viewBox="0 0 100 110.96" fill={BRAND}>
        <path d={MARK} />
      </svg>
    </div>
  );
}
