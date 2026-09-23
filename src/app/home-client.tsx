"use client";

import { useEffect, useState } from "react";
import type { MakeItStickEval } from "@/lib/ai/schema";
import type { InterpretResult } from "@/lib/ai/interpret";
import { AppNav } from "@/components/app-nav";
import { ARCHETYPE_LABELS, KnowledgeContentView, MakeItStick } from "@/components/knowledge-view";
import { logDepthView } from "@/lib/log-depth-view";

type Depth = "gist" | "explore" | "stick";

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
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 pb-16 dark:bg-black">
      <AppNav />
      <main className="w-full max-w-2xl pt-10">
        <div className="mb-10 text-center relative">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Curious
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {name ? `Hey ${name} — ` : ""}Go from zero to one on whatever you&apos;re wondering about.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="flex gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What are you curious about?"
            className="flex-1 rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {status === "loading" ? "Thinking…" : "Ask"}
          </button>
        </form>

        {status === "error" && (
          <p className="mt-6 text-sm text-red-600">Something went wrong. Try again.</p>
        )}

        {result?.kind === "safety" && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300">
              {result.message}
            </p>
          </div>
        )}

        {result?.kind === "factoid" && (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Quick answer
            </p>
            <p className="text-lg text-zinc-900 dark:text-zinc-100">{result.answer}</p>
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
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-zinc-900 px-3 py-1 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          {ARCHETYPE_LABELS[result.archetype]}
        </span>
        {result.motifTags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-zinc-300 px-3 py-1 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto text-zinc-400">
          complexity {result.complexity} · importance {result.importance} · difficulty {result.difficulty}
        </span>
        <div className="flex gap-2 text-zinc-300 dark:text-zinc-600">
          <button
            onClick={() => onThumbs(true)}
            aria-label="Thumbs up"
            className={thumbsUp === true ? "text-zinc-700 dark:text-zinc-200" : "hover:text-zinc-500"}
          >
            ▲
          </button>
          <button
            onClick={() => onThumbs(false)}
            aria-label="Thumbs down"
            className={thumbsUp === false ? "text-zinc-700 dark:text-zinc-200" : "hover:text-zinc-500"}
          >
            ▼
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-1 rounded-full bg-zinc-200/70 p-1 text-sm dark:bg-zinc-800/70">
        {(["gist", "explore", "stick"] as Depth[]).map((d) => (
          <button
            key={d}
            onClick={() => setActiveDepth(d)}
            className={`flex-1 rounded-full px-4 py-2 font-medium transition-colors ${
              activeDepth === d
                ? "bg-white text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-50"
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

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
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
    </div>
  );
}

