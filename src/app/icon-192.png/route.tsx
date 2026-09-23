import { renderAppIcon } from "@/lib/app-icon";

// Not the icon.tsx/apple-icon.tsx file convention (those only feed <head> <link> tags) — the
// PWA manifest's icons array needs literal static-looking URLs, so this is a plain route handler
// at a ".png"-shaped path, same pattern route handlers use for any generated image.
export function GET() {
  return renderAppIcon({ size: 192 });
}
