import { renderAppIcon } from "@/lib/app-icon";

// "maskable" purpose (manifest.ts) — Android may crop this into a circle/squircle, so it's
// full-bleed with extra padding around the glyph rather than the rounded-square "any" variant.
export function GET() {
  return renderAppIcon({ size: 512, maskable: true });
}
