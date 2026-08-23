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

/**
 * A jump-list icon: one glyph on the app's background.
 *
 * Windows draws these next to the shortcut names when you right-click the
 * taskbar icon, at roughly 16-32px however large the source is. That size is
 * the whole design constraint — anything with fine detail turns to mush, so
 * these are flat fills in three or four shapes each, and they are meant to be
 * told apart at a glance rather than read as pictures.
 *
 * Fills only, no strokes: `next/og` renders through Satori, whose SVG support
 * is a subset, and a filled polygon is the part of it least likely to surprise.
 */
export function ShortcutIcon({ size, children }: { size: number; children: React.ReactNode }) {
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
      <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24" fill={BRAND}>
        {children}
      </svg>
    </div>
  );
}

/**
 * Lines of text — the curriculum, read in order.
 *
 * An array rather than a fragment. Satori walks the element tree itself and
 * stringifies each node's type; a fragment's type is a Symbol, which fails with
 * "Cannot convert a Symbol value to a string" at build time rather than
 * rendering an empty icon. Arrays it handles natively.
 */
export const GLYPH_LEARN = [
  <rect key="a" x="3" y="5" width="18" height="2.6" rx="1.3" />,
  <rect key="b" x="3" y="10.7" width="18" height="2.6" rx="1.3" />,
  <rect key="c" x="3" y="16.4" width="11" height="2.6" rx="1.3" />,
];

/** A beaker — the labs, where you actually run something. */
export const GLYPH_LABS = <polygon points="9.4,3 14.6,3 14.6,9.4 20.5,20 3.5,20 9.4,9.4" />;

/** Stops along a route — which chapter comes next. */
export const GLYPH_ROADMAPS = [
  <rect key="a" x="11" y="4" width="2" height="16" />,
  <circle key="b" cx="12" cy="4.8" r="3.2" />,
  <circle key="c" cx="12" cy="12" r="3.2" />,
  <circle key="d" cx="12" cy="19.2" r="3.2" />,
];
