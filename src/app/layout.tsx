import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Runs synchronously before first paint — without this, the page would render in the wrong
// theme for a split second and then flip once React hydrates ThemeProvider (a visible flash).
// Kept in sync with theme-provider.tsx's own logic on purpose; duplicated because this has to
// run before any React code exists yet.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('curious-theme');var d=s==='dark'||((s==='system'||!s)&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display serif — Curious Shorts headlines only (docs/design/curious-shorts.md).
// Everything else stays on Geist Sans.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Curious",
  description: "Go from zero to one on whatever you're wondering about.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
