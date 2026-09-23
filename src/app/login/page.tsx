"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Password auth (docs/decisions.md §16), replacing OTP-code sign-in — a returning user never
// touches email at all now, which was the actual point (sidesteps email deliverability/
// rate-limit/template issues on the highest-frequency path). First-time verification and
// password reset still use email, but via the in-email CODE (verifyOtp), not a clickable link
// — same reasoning as §15: no redirect URL, no PKCE exchange, nothing for a stale link to trip.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("signInWithPassword threw:", err);
      setStatus("error");
      setErrorMessage("Something went wrong. Try again.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Curious
        </h1>
        <p className="mt-1 mb-8 text-sm text-zinc-500 dark:text-zinc-400">Sign in to continue.</p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {status === "loading" ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {status === "error" && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}

        <div className="mt-6 flex justify-between text-xs text-zinc-400">
          <Link href="/forgot-password" className="hover:text-zinc-600 dark:hover:text-zinc-300">
            Forgot password?
          </Link>
          <Link href="/signup" className="hover:text-zinc-600 dark:hover:text-zinc-300">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
