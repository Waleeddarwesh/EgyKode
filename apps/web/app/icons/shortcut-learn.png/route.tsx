import { ImageResponse } from "next/og";

import { GLYPH_LEARN, ShortcutIcon } from "../shared";

/**
 * 96x96 jump-list icon for the "learn" shortcut.
 *
 * 96px because that is the largest size Windows asks for when drawing a jump
 * list, and one size is enough: the manifest declares what it actually ships
 * rather than a ladder of sizes that are all the same drawing.
 */
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<ShortcutIcon size={96}>{GLYPH_LEARN}</ShortcutIcon>, {
    width: 96,
    height: 96,
  });
}
