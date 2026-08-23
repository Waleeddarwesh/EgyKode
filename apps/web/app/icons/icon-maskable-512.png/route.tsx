import { ImageResponse } from "next/og";

import { EgyKodeIcon } from "../shared";

/**
 * 512×512 maskable icon.
 *
 * Windows and Android crop this to their own shape, so the mark sits inside the
 * safe zone with a wider inset. Without a maskable icon the platform pads the
 * `any` icon itself, which usually means the mark gets clipped or floats in a
 * white square.
 */
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<EgyKodeIcon size={512} inset={0.3} />, { width: 512, height: 512 });
}
