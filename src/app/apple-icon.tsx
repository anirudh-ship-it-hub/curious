import { renderAppIcon } from "@/lib/app-icon";

// iOS applies its own corner rounding to the apple-touch-icon, so this stays full-bleed
// (no baked-in radius) — same reasoning as the maskable Android icon below.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return renderAppIcon({ size: 180, maskable: true });
}
