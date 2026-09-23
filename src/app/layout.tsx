import type { Metadata, Viewport } from "next";
import { Geist_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

// Runs synchronously before first paint — without this, the page would render in the wrong
// theme for a split second and then flip once React hydrates ThemeProvider (a visible flash).
// Kept in sync with theme-provider.tsx's own logic on purpose; duplicated because this has to
// run before any React code exists yet.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('curious-theme');var d=s==='dark'||((s==='system'||!s)&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

// App-wide UI face (home/ask, nav, settings). Chosen for the beta UI refresh — a warmer,
// slightly more distinctive grotesk than Geist without losing legibility at small sizes.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display serif — Drift headlines only (docs/design/curious-drift.md). Everything
// else stays on Instrument Sans.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// PWA installability (2026-09-24): manifest.ts (Next's file convention, auto-linked) covers
// Android's "Add to Home Screen" criteria; iOS Safari ignores the manifest for most of this and
// relies on these Apple-specific tags instead — both are needed, neither alone is enough for a
// seamless install on both platforms.
export const metadata: Metadata = {
  title: "Curious",
  description: "Go from zero to one on whatever you're wondering about.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Curious",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Next's `appleWebApp` metadata only emits the modern unprefixed
            "mobile-web-app-capable" tag — iOS Safari didn't honor that until 17.4 (March 2024),
            so this legacy-prefixed tag is added by hand to keep standalone (no browser chrome)
            installs working on older iOS versions too. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
