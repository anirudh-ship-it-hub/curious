import { ImageResponse } from "next/og";

// Shared renderer for every generated app icon (favicon, apple-touch-icon, PWA manifest icons)
// so the mark stays pixel-consistent across all of them rather than four hand-tuned copies.
// No logo asset exists yet — a simple lowercase "c" on the ink brand color, matching the
// ink/mist palette introduced in the UI refresh (globals.css).
export function renderAppIcon({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const glyphSize = maskable ? size * 0.46 : size * 0.58;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#212529",
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <div
          style={{
            fontSize: glyphSize,
            fontWeight: 600,
            color: "#f5f6f7",
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1,
          }}
        >
          c
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
