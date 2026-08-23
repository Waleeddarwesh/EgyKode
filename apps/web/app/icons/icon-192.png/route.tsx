import { ImageResponse } from "next/og";

import { EgyKodeIcon } from "../shared";

/**
 * 192×192 app icon for the web app manifest.
 *
 * Generated rather than committed, from the same mark path the OG cards use, so
 * a change to the brand cannot leave a stale binary behind. `next/og` already
 * ships with Next — this adds no dependency.
 */
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<EgyKodeIcon size={192} />, { width: 192, height: 192 });
}
