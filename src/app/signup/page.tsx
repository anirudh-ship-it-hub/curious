"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

// Name + email + password up front, then a code-verification step (docs/decisions.md §16).
// `signUp`'s `options.data` sets user_metadata on creation — same personalization mechanism
// as the old OTP-based login had.
export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"details" | "verify">("details");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setStatus("error");
      setErrorMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords don't match.");
      return;
    }

    setStatus("loading");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name.trim() || undefined } },
      });
      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }

      // If the project has email confirmation turned off, signUp already returns a live session
      // — no code step needed. Otherwise proceed to verification.
      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }
      setStatus("idle");
      setStep("verify");
    } catch (err) {
      console.error("signUp threw:", err);
      setStatus("error");
      setErrorMessage("Something went wrong. Try again.");
    }
  }

  async function submitVerify(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("verifyOtp threw:", err);
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
        <p className="mt-1 mb-8 text-sm text-zinc-500 dark:text-zinc-400">
          {step === "details" ? "Create your account." : `Enter the code sent to ${email}.`}
        </p>

        {step === "details" ? (
          <form onSubmit={submitDetails} className="flex flex-col gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
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
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {status === "loading" ? "Creating…" : "Create account"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitVerify} className="flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-center text-lg tracking-widest text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {status === "loading" ? "Verifying…" : "Verify"}
            </button>
          </form>
        )}

        {status === "error" && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}

        <p className="mt-6 text-xs text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="hover:text-zinc-600 dark:hover:text-zinc-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
