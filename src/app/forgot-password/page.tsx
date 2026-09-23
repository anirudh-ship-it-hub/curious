"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

// Reset via in-email code (verifyOtp type="recovery"), not the link resetPasswordForEmail
// would otherwise redirect to (docs/decisions.md §16) — same reasoning as signup/login: no
// redirect URL, no PKCE exchange, nothing for a stale link to trip on this rarer path either.
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }
      setStatus("idle");
      setStep("reset");
    } catch (err) {
      console.error("resetPasswordForEmail threw:", err);
      setStatus("error");
      setErrorMessage("Something went wrong. Try again.");
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setStatus("error");
      setErrorMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setStatus("error");
      setErrorMessage("Passwords don't match.");
      return;
    }

    setStatus("loading");
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
      if (verifyError) {
        setStatus("error");
        setErrorMessage(verifyError.message);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setStatus("error");
        setErrorMessage(updateError.message);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("forgot-password reset threw:", err);
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
          {step === "request" ? "Reset your password." : `Enter the code sent to ${email} and a new password.`}
        </p>

        {step === "request" ? (
          <form onSubmit={requestReset} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {status === "loading" ? "Sending…" : "Send reset code"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitReset} className="flex flex-col gap-3">
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
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <input
              type="password"
              required
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Confirm new password"
              className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {status === "loading" ? "Resetting…" : "Reset password"}
            </button>
          </form>
        )}

        {status === "error" && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}

        <p className="mt-6 text-xs text-zinc-400">
          <Link href="/login" className="hover:text-zinc-600 dark:hover:text-zinc-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
