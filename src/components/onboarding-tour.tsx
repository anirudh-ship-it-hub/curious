"use client";

import { useState } from "react";

// The Curious story, told in five short beats rather than a feature list — shown once ever on
// first login (home-client.tsx), and replayable anytime from Settings' info button. Purely
// controlled (open/onClose) on purpose: whether this run should mark itself "seen" is the
// caller's decision (first-run does, a manual replay from Settings shouldn't reset anything),
// so that logic stays out of this component entirely rather than needing a "mode" prop.
const STEPS: { headline: string; body: string }[] = [
  {
    headline: "You get curious about a dozen things a day.",
    body: "Most of them die in a search bar, or a half-read tab you never go back to. Curious is for actually following one through — quickly, and in a way you'll still remember tomorrow.",
  },
  {
    headline: "Every question gets three depths, not one wall of text.",
    body: "Get the Gist for the two-minute version. Explore when you want the real thing — analogies, causes, the parts that actually explain it. Make It Stick when you want to know if it landed.",
  },
  {
    headline: "Reading isn't the same as knowing.",
    body: "Make It Stick asks you to explain it back, in your own words, before you move on. It's the closest thing to a gut check for whether something actually sunk in — optional, always, but worth the thirty seconds.",
  },
  {
    headline: "Ask when you know what you're after. Drift when you don't.",
    body: "Type a real question anytime. Or open Drift and let a feed of things worth wondering about find you — same depths, same follow-ups, just nothing to type.",
  },
  {
    headline: "Ask, Drift, Map, Settings. That's the whole app.",
    body: "Map is the shape of what you've actually been curious about over time. Settings holds your saved items and a box for feedback if something's off. Go be curious.",
  },
];

export function OnboardingTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function close() {
    setStep(0);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl dark:bg-zinc-900">
        <p className="font-editorial text-xl italic leading-snug text-ink">{current.headline}</p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{current.body}</p>

        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === step ? "bg-ink" : "bg-zinc-200 dark:bg-zinc-700"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-4">
            {!isLast && (
              <button
                onClick={close}
                className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Skip
              </button>
            )}
            <button
              onClick={() => (isLast ? close() : setStep((s) => s + 1))}
              className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-mist"
            >
              {isLast ? "Start exploring" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
