"use client";

import { useEffect, useState } from "react";
import type { MakeItStickEval } from "@/lib/ai/schema";
import type { InterpretResult } from "@/lib/ai/interpret";
import { AppNav } from "@/components/app-nav";
import { KnowledgeContentView, MakeItStick, SaveButton, ThumbsButtons } from "@/components/knowledge-view";
import { OnboardingTour } from "@/components/onboarding-tour";
import { logDepthView } from "@/lib/log-depth-view";

type Depth = "gist" | "explore" | "stick";

// Shown once ever, right after first login (upgraded 2026-09-24 from a single dismissible note
// to the full OnboardingTour — a nav hint alone didn't carry the actual ideology or explain why
// Make It Stick is worth the detour, both explicitly flagged). Also replayable anytime from a
// Settings info button (settings-client.tsx), which is why the "seen" flag lives here rather
// than inside OnboardingTour itself — a manual replay must NOT touch this key.
const TOUR_SEEN_KEY = "curious-seen-onboarding-tour";

// The API adds `id` (the persisted question's row id) to "full" results — see
// src/app/api/interpret/route.ts. Not part of the pure interpret() return type since that
// stays DB-free; this is the client's view of what the route actually returns.
type ApiResult = InterpretResult & { id?: string };

export function HomeClient({ name }: { name: string | null }) {
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [activeDepth, setActiveDepth] = useState<Depth>("gist");

  // Which depth was actually looked at, not just recommended — the depth-selection-distribution
  // KPI (docs/decisions.md §5) has no other signal to draw from.
  useEffect(() => {
    if (result?.kind === "full" && result.id) logDepthView(result.id, activeDepth);
  }, [result, activeDepth]);

  const [mistExplanation, setMistExplanation] = useState("");
  const [mistStatus, setMistStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [mistResult, setMistResult] = useState<MakeItStickEval | null>(null);
  const [thumbsUp, setThumbsUp] = useState<boolean | null>(null);

  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    try {
      setShowTour(!localStorage.getItem(TOUR_SEEN_KEY));
    } catch {
      setShowTour(false); // private browsing / blocked storage — just skip the tour
    }
  }, []);
  function closeTour() {
    setShowTour(false);
    try {
      localStorage.setItem(TOUR_SEEN_KEY, "1");
    } catch {
      // ignore — worst case it shows again next session
    }
  }

  function giveThumbs(value: boolean) {
    if (result?.kind !== "full" || !result.id) return;
    setThumbsUp(value);
    fetch("/api/content-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: result.id, thumbsUp: value }),
    }).catch(() => {});
  }

  async function ask(q: string, parentQuestionId?: string) {
    if (!q.trim() || status === "loading") return;
    setStatus("loading");
    setResult(null);
    setMistExplanation("");
    setMistStatus("idle");
    setMistResult(null);
    setThumbsUp(null);

    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, parentQuestionId }),
      });
      if (!res.ok) throw new Error("request failed");
      const data: ApiResult = await res.json();
      setResult(data);
      if (data.kind === "full") setActiveDepth(data.depthRecommendation);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function submitMakeItStick(coreTakeaways: string[]) {
    if (!mistExplanation.trim()) return;
    setMistStatus("loading");
    try {
      const res = await fetch("/api/make-it-stick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coreTakeaways, userExplanation: mistExplanation }),
      });
      if (!res.ok) throw new Error("request failed");
      const data: MakeItStickEval = await res.json();
      setMistResult(data);
      setMistStatus("done");
    } catch {
      setMistStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-mist px-4 pb-16">
      <AppNav />
      <OnboardingTour open={showTour} onClose={closeTour} />
      <main className="w-full max-w-2xl pt-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {name ? `Hey, ${name}` : "Hey there"}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Go from zero to one on whatever you&apos;re wondering about.
            </p>
          </div>
          <span className="hidden rounded-full bg-ink px-3 py-1 text-xs font-medium text-mist sm:inline-block">
            Curious
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white p-1.5 pl-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4 flex-none text-zinc-400"
          >
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
            <path d="M17 17L13.5 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What are you curious about?"
            className="flex-1 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-mist disabled:opacity-50"
          >
            {status === "loading" ? "Thinking…" : "Ask"}
          </button>
        </form>

        {status === "error" && (
          <p className="mt-6 text-sm text-red-600">Something went wrong. Try again.</p>
        )}

        {result?.kind === "safety" && (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300">
              {result.message}
            </p>
          </div>
        )}

        {result?.kind === "factoid" && (
          <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Quick answer
            </p>
            <p className="text-lg text-ink">{result.answer}</p>
          </div>
        )}

        {result?.kind === "full" && (
          <FullResult
            result={result}
            activeDepth={activeDepth}
            setActiveDepth={setActiveDepth}
            onAsk={ask}
            mistExplanation={mistExplanation}
            setMistExplanation={setMistExplanation}
            mistStatus={mistStatus}
            mistResult={mistResult}
            onSubmitMakeItStick={submitMakeItStick}
            thumbsUp={thumbsUp}
            onThumbs={giveThumbs}
          />
        )}
      </main>
    </div>
  );
}

function FullResult({
  result,
  activeDepth,
  setActiveDepth,
  onAsk,
  mistExplanation,
  setMistExplanation,
  mistStatus,
  mistResult,
  onSubmitMakeItStick,
  thumbsUp,
  onThumbs,
}: {
  result: Extract<ApiResult, { kind: "full" }>;
  activeDepth: Depth;
  setActiveDepth: (d: Depth) => void;
  onAsk: (q: string, parentQuestionId?: string) => void;
  mistExplanation: string;
  setMistExplanation: (v: string) => void;
  mistStatus: "idle" | "loading" | "done" | "error";
  mistResult: MakeItStickEval | null;
  onSubmitMakeItStick: (coreTakeaways: string[]) => void;
  thumbsUp: boolean | null;
  onThumbs: (value: boolean) => void;
}) {
  return (
    <div className="mt-8">
      {/* Archetype badge, motif tags, and the complexity/importance/difficulty numbers used to
          render here — internal classification metadata (recommendation-engine/eval inputs),
          not something a reader could use. Removed 2026-09-25 after real friend-testing
          feedback ("random tags complexity etc on top which is not very relevant"). Still
          computed and stored (result.archetype/motifTags/complexity/etc.) for the
          recommendation engine and Map — only the display here changed. */}
      <div className="mb-4 flex items-center justify-end gap-2">
        <ThumbsButtons value={thumbsUp} onChange={onThumbs} />
        {result.id && <SaveButton questionId={result.id} />}
      </div>

      <div className="mb-4 flex gap-1 rounded-full bg-zinc-200/70 p-1 text-sm dark:bg-zinc-800/70">
        {(["gist", "explore", "stick"] as Depth[]).map((d) => (
          <button
            key={d}
            onClick={() => setActiveDepth(d)}
            className={`flex-1 rounded-full px-4 py-2 font-medium transition-colors ${
              activeDepth === d
                ? "bg-white text-ink shadow dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {d === "gist" && "Get the Gist"}
            {d === "explore" && "Explore"}
            {d === "stick" && "Make It Stick"}
            {result.depthRecommendation === d && (
              <span className="ml-1 text-[10px] opacity-60">recommended</span>
            )}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {activeDepth === "gist" && (
          <ul className="space-y-2">
            {result.coreTakeaways.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                <span className="mt-2 h-1 w-1 flex-none rounded-full bg-zinc-400 dark:bg-zinc-600" />
                {t}
              </li>
            ))}
          </ul>
        )}

        {activeDepth === "explore" && (
          <div>
            <KnowledgeContentView content={result.content} />

            {result.dependencies.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Connects to
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.dependencies.map((dep) => (
                    <span
                      key={dep}
                      className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.followUpPredictions.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Wander deeper
                </p>
                <div className="flex flex-col gap-2">
                  {result.followUpPredictions.map((fq) => (
                    <button
                      key={fq}
                      onClick={() => onAsk(fq, result.id)}
                      className="rounded-xl border border-zinc-200 px-4 py-2 text-left text-sm text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
                    >
                      {fq}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeDepth === "stick" && (
          <MakeItStick
            coreTakeaways={result.coreTakeaways}
            explanation={mistExplanation}
            setExplanation={setMistExplanation}
            status={mistStatus}
            evalResult={mistResult}
            onSubmit={onSubmitMakeItStick}
          />
        )}
      </div>

      <FollowUpBox onAsk={onAsk} parentQuestionId={result.id} />
    </div>
  );
}

// A visible, always-there place to continue the thread — previously the only way to follow up
// was clicking one of the AI's OWN predicted questions under Explore; there was nothing for a
// question of your own, and nothing visible at all from Gist/Make It Stick (flagged 2026-09-23:
// "not very evident where to add follow up after asking a question"). Sits right under the
// result regardless of which depth tab is open.
function FollowUpBox({ onAsk, parentQuestionId }: { onAsk: (q: string, parentQuestionId?: string) => void; parentQuestionId?: string }) {
  const [text, setText] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAsk(text, parentQuestionId);
        setText("");
      }}
      className="mt-4 flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-4 pr-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask a follow-up…"
        className="flex-1 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-zinc-400 dark:text-zinc-100"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        aria-label="Ask follow-up"
        className="rounded-full bg-ink p-2 text-mist disabled:opacity-40"
      >
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 10h12M10 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  );
}

