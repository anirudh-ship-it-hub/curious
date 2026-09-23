"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Four top-level destinations, matching docs/product.md's nav list (Questions/Wonder, Discover,
// Curiosity Map, Settings) — Ask = Wanderer, Drift = Bored Explorer/Discover (renamed from
// "Shorts" 2026-09-23 — too close to the Instagram/TikTok feature name), Map = the self-insight
// surface (docs/design/curiosity-map.md), Settings = appearance/account/feedback (docs/
// decisions.md §20). Separate screens, not tabs on one screen (design brief decision,
// docs/design/curious-drift.md).
const DESTINATIONS = [
  { href: "/", label: "Ask" },
  { href: "/drift", label: "Drift" },
  { href: "/map", label: "Map" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-6 pb-2">
      <nav className="flex gap-1 rounded-full bg-zinc-200/70 p-1 text-sm dark:bg-zinc-800/70">
        {DESTINATIONS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
              pathname === href
                ? "bg-white text-ink shadow dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <button
        onClick={signOut}
        className="ml-3 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        Sign out
      </button>
    </div>
  );
}
