import { ImageResponse } from "next/og";

// The mark: a single open spiral unwinding from a small seed dot — a thought starting at one
// specific point and unfolding outward, left open rather than closed into a circle (curiosity
// as ongoing, not a resolved/finished shape). Chosen over a literal "?" or a generic
// lightbulb/spark — those read as generic "idea" iconography; this one is specific to "go from
// zero to one on whatever you're wondering about" and happens to echo the golden-angle spiral
// curiosity-map-layout.ts already uses to place nodes, so it's not an arbitrary shape relative
// to the rest of the product. Computed as a plain point-to-point polyline (M/L only, no
// bezier/arc commands) since that's the SVG path syntax Satori (next/og's renderer) supports
// most reliably; enough points (48) that it still reads as a smooth curve once stroked with
// round joins/caps.
function spiralPoints(): [number, number][] {
  const steps = 48;
  const turns = 1.15;
  const startR = 9;
  const endR = 42;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * turns * Math.PI * 2 - Math.PI / 2; // start pointing straight up
    const r = startR + (endR - startR) * t;
    pts.push([50 + r * Math.cos(theta), 50 + r * Math.sin(theta)]);
  }
  return pts;
}

function spiralPathD(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
}

// Shared renderer for every generated app icon (favicon, apple-touch-icon, PWA manifest icons)
// so the mark stays pixel-consistent across all of them rather than several hand-tuned copies.
// maskable gets extra safe-area padding (Android may crop this into a circle/squircle) and no
// baked-in corner radius — same reasoning as the non-maskable variant's rounded square, just
// inverted, since a maskable icon's shape is the OS's decision, not this render's.
export function renderAppIcon({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const pts = spiralPoints();
  const markScale = maskable ? 0.56 : 0.74;
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
        <svg width={size * markScale} height={size * markScale} viewBox="0 0 100 100">
          <path
            d={spiralPathD(pts)}
            fill="none"
            stroke="#f5f6f7"
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={pts[0][0]} cy={pts[0][1]} r={6} fill="#f5f6f7" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
