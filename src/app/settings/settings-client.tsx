"use client";

import { useState } from "react";
import { AppNav } from "@/components/app-nav";
import { useTheme, type ThemePreference } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { OnboardingTour } from "@/components/onboarding-tour";

const MIN_PASSWORD_LENGTH = 8;

export function SettingsClient({ email, initialName }: { email: string; initialName: string }) {
  const [tourOpen, setTourOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 pb-16 dark:bg-black">
      <AppNav />
      {/* A manual replay, not first-run — deliberately doesn't touch the "seen" flag that
          gates the automatic first-login tour (home-client.tsx owns that). */}
      <OnboardingTour open={tourOpen} onClose={() => setTourOpen(false)} />
      <main className="w-full max-w-xl pt-10">
        <div className="mb-8 flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Settings
          </h1>
          <button
            onClick={() => setTourOpen(true)}
            aria-label="Replay the intro tour"
            title="Replay the intro tour"
            className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-zinc-400 ring-1 ring-zinc-300 hover:text-zinc-700 dark:text-zinc-500 dark:ring-zinc-700 dark:hover:text-zinc-200"
          >
            i
          </button>
        </div>

        <AppearanceSection />
        <AccountSection email={email} initialName={initialName} />
        <FeedbackSection />
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const options: { value: ThemePreference; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  return (
    <Section title="Appearance">
      <div className="flex gap-1 rounded-full bg-zinc-100 p-1 text-sm dark:bg-zinc-800">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`flex-1 rounded-full px-4 py-2 font-medium transition-colors ${
              theme === opt.value
                ? "bg-white text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </Section>
  );
}

function AccountSection({ email, initialName }: { email: string; initialName: string }) {
  const [name, setName] = useState(initialName);
  const [nameStatus, setNameStatus] = useState<"idle" | "loading" | "saved" | "error">("idle");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [passwordError, setPasswordError] = useState("");

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameStatus("loading");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { name: name.trim() } });
      setNameStatus(error ? "error" : "saved");
      if (error) console.error("updateUser (name) error:", error);
    } catch (err) {
      console.error("updateUser (name) threw:", err);
      setNameStatus("error");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordStatus("error");
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("error");
      setPasswordError("Passwords don't match.");
      return;
    }
    setPasswordStatus("loading");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.error("updateUser (password) error:", error);
        setPasswordStatus("error");
        setPasswordError(error.message);
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus("saved");
    } catch (err) {
      console.error("updateUser (password) threw:", err);
      setPasswordStatus("error");
      setPasswordError("Something went wrong. Try again.");
    }
  }

  return (
    <Section title="Account">
      <div className="mb-6">
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Email</label>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{email}</p>
      </div>

      <form onSubmit={saveName} className="mb-6 flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Name</label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameStatus("idle");
            }}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
        <button
          type="submit"
          disabled={nameStatus === "loading" || name.trim() === initialName}
          className="self-end rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {nameStatus === "loading" ? "Saving…" : "Save"}
        </button>
      </form>
      {nameStatus === "saved" && <p className="mb-6 -mt-4 text-xs text-emerald-600">Saved.</p>}
      {nameStatus === "error" && <p className="mb-6 -mt-4 text-xs text-red-600">Something went wrong.</p>}

      <form onSubmit={changePassword} className="flex flex-col gap-2">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Change password</label>
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        {passwordStatus === "error" && <p className="text-xs text-red-600">{passwordError}</p>}
        {passwordStatus === "saved" && <p className="text-xs text-emerald-600">Password updated.</p>}
        <button
          type="submit"
          disabled={passwordStatus === "loading" || !newPassword}
          className="self-start rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {passwordStatus === "loading" ? "Updating…" : "Update password"}
        </button>
      </form>
    </Section>
  );
}

function FeedbackSection() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("request failed");
      setMessage("");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Section title="Feedback">
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        Something specific and pointed — a bug, a confusing moment, an idea.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setStatus("idle");
          }}
          rows={4}
          placeholder="What's on your mind?"
          className="w-full rounded-xl border border-zinc-300 bg-white p-4 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        {status === "error" && <p className="text-xs text-red-600">Something went wrong. Try again.</p>}
        {status === "sent" && <p className="text-xs text-emerald-600">Sent — thank you.</p>}
        <button
          type="submit"
          disabled={status === "loading" || !message.trim()}
          className="self-start rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {status === "loading" ? "Sending…" : "Send"}
        </button>
      </form>
    </Section>
  );
}
