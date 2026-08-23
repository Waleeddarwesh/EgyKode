import { ImageResponse } from "next/og";

import { EgyKodeIcon } from "../shared";

/** 512×512 app icon. The size Windows uses for the Store tile and large views. */
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<EgyKodeIcon size={512} />, { width: 512, height: 512 });
}
