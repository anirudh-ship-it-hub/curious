"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { Interpretation, KnowledgeContent, MakeItStickEval } from "@/lib/ai/schema";
import { AppNav } from "@/components/app-nav";
import { KnowledgeContentView, MakeItStick, SaveButton, ThumbsButtons } from "@/components/knowledge-view";
import { logDepthView } from "@/lib/log-depth-view";

// Matches the inline shape GET /api/recommendations returns — Candidate (src/lib/recommend/
// candidates.ts) plus recommendationId/slot layered on top (route.ts). Kept as its own type
// here rather than imported, since this is the client's view of an HTTP response, not the
// server-side Candidate type itself.
interface RecommendationItem {
  recommendationId: string;
  slot: "relevant" | "adjacent" | "wildcard";
  id: string;
  question: string;
  archetype: Interpretation["archetype"];
  content: KnowledgeContent;
  dependencies: string[];
  motifTags: string[];
  coreTakeaways: string[];
  followUpPredictions: string[];
  hasVisualPotential: boolean;
}

// Revisit items (docs/decisions.md §10 addendum) are full RecommendationItems, not a stripped
// title-only shape — GET /api/recommendations now sources them from recommendation_log itself
// (what was actually shown), so they render as the exact same re-expandable DriftCard someone
// already scrolled past, not a bullet-point summary of it.
type RecentlyExplored = RecommendationItem;

type FeedState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: RecommendationItem[]; poolExhausted: false }
  | { status: "ready"; items: RecommendationItem[]; poolExhausted: true; recentlyExplored: RecentlyExplored[] };

// While sitting on the caught-up screen, silently re-check once an hour in case the shared pool
// grew (another beta user asked something new) — the underlying "never re-show the same item"
// rule (docs/decisions.md §14 consequence, recommendations route.ts) doesn't change; this only
// surfaces content that's genuinely new since the last check. Also exposed as a manual "Check
// again" button so nobody has to leave a tab open for an hour to get the same effect.
const POOL_RECHECK_INTERVAL_MS = 60 * 60 * 1000;

// Pacing note ("why 6 at a time") localStorage key — a one-time, per-browser explanation, not
// state that needs to persist reliably or sync across devices, so localStorage is the right
// tool for it (not a DB column).
const PACING_NOTE_SEEN_KEY = "curious-seen-pacing-note";

export function DriftClient({ name }: { name: string | null }) {
  const [feed, setFeed] = useState<FeedState>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  // How many items the FIRST fetch actually returned — not the server's target batch size
  // (docs/decisions.md §18). They can differ for a cold-start user: no slot backfilling means
  // a sparse relevant/adjacent pool can return fewer than the target (candidates.ts). The note
  // cites and anchors on this real count, not the target — citing "6" in the copy while only 2
  // cards actually showed would read as flatly wrong, and anchoring the *position* on the
  // target instead of the real length would mean the note silently never appears for exactly
  // the new, pool-sparse users a sparse-feeling feed would most benefit from explaining to.
  const [firstBatchLength, setFirstBatchLength] = useState<number | null>(null);
  const [showPacingNote, setShowPacingNote] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      setShowPacingNote(!localStorage.getItem(PACING_NOTE_SEEN_KEY));
    } catch {
      setShowPacingNote(false); // private browsing / blocked storage — just skip the note
    }
  }, []);

  async function fetchBatch() {
    // No explicit ?limit= here on purpose — the server's DEFAULT_BATCH_SIZE (a derived,
    // reasoned constant, not a guess — docs/decisions.md §18) is the single source of truth,
    // not duplicated client-side.
    const res = await fetch("/api/recommendations");
    if (!res.ok) throw new Error("request failed");
    return res.json() as Promise<{
      recommendations: RecommendationItem[];
      poolExhausted: boolean;
      batchSize: number;
      recentlyExplored?: RecentlyExplored[];
    }>;
  }

  useEffect(() => {
    fetchBatch()
      .then((data) => {
        setFirstBatchLength(data.recommendations?.length ?? 0);
        if (data.poolExhausted) {
          setFeed({ status: "ready", items: [], poolExhausted: true, recentlyExplored: data.recentlyExplored ?? [] });
        } else {
          setFeed({ status: "ready", items: data.recommendations, poolExhausted: false });
        }
      })
      .catch(() => setFeed({ status: "error" }));
  }, []);

  useEffect(() => {
    if (feed.status !== "ready" || feed.poolExhausted) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed]);

  async function loadMore() {
    if (loadingMore || feed.status !== "ready" || feed.poolExhausted) return;
    setLoadingMore(true);
    try {
      const data = await fetchBatch();
      setFeed((prev) => {
        if (prev.status !== "ready" || prev.poolExhausted) return prev;
        if (data.poolExhausted) {
          return { status: "ready", items: prev.items, poolExhausted: true, recentlyExplored: data.recentlyExplored ?? [] };
        }
        return { status: "ready", items: [...prev.items, ...data.recommendations], poolExhausted: false };
      });
    } catch {
      // Silent — a failed prefetch just means the sentinel tries again on next scroll.
    } finally {
      setLoadingMore(false);
    }
  }

  const [checkingForMore, setCheckingForMore] = useState(false);

  async function checkForMore() {
    if (checkingForMore) return;
    setCheckingForMore(true);
    try {
      const data = await fetchBatch();
      if (data.poolExhausted) {
        setFeed({ status: "ready", items: [], poolExhausted: true, recentlyExplored: data.recentlyExplored ?? [] });
      } else {
        setFeed({ status: "ready", items: data.recommendations, poolExhausted: false });
      }
    } catch {
      // Silent — worst case the hourly recheck or the next manual click tries again.
    } finally {
      setCheckingForMore(false);
    }
  }

  useEffect(() => {
    if (feed.status !== "ready" || !feed.poolExhausted) return;
    const interval = setInterval(checkForMore, POOL_RECHECK_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.status, feed.status === "ready" && feed.poolExhausted]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-stone-50 px-4 pb-24 dark:bg-black">
      <AppNav />
      <main className="w-full max-w-xl pt-10">
        {feed.status === "loading" && <FeedSkeleton />}

        {feed.status === "error" && (
          <p className="mt-10 text-center text-sm text-red-600">
            Something went wrong loading Drift. Try refreshing.
          </p>
        )}

        {feed.status === "ready" && (
          <div className="space-y-10">
            {feed.items.map((item, i) => (
              <Fragment key={item.recommendationId}>
                <DriftCard item={item} />
                {showPacingNote && firstBatchLength !== null && firstBatchLength > 0 && i === firstBatchLength - 1 && (
                  <PacingNote
                    count={firstBatchLength}
                    onShown={() => {
                      try {
                        localStorage.setItem(PACING_NOTE_SEEN_KEY, "1");
                      } catch {
                        // ignore — worst case it shows again next session
                      }
                    }}
                  />
                )}
              </Fragment>
            ))}
            {feed.poolExhausted && (
              <CaughtUpCard
                recentlyExplored={feed.recentlyExplored}
                name={name}
                onCheckForMore={checkForMore}
                checking={checkingForMore}
              />
            )}
            {!feed.poolExhausted && <div ref={sentinelRef} className="h-1" />}
            {!feed.poolExhausted && loadingMore && <FeedSkeleton />}
          </div>
        )}
      </main>
    </div>
  );
}

// Shown once ever, right where a person naturally reaches the first pause point — explains
// the batch pacing in the product's own voice ("User time is sacred... don't optimize for
// screen time", docs/product.md locked principles) rather than leaving it as a silent backend
// detail. No dismiss button by design (matches the Drift design brief's "no urgency cues, no
// chrome competing with content") — it just marks itself seen once rendered and never repeats.
function PacingNote({ count, onShown }: { count: number; onShown: () => void }) {
  useEffect(() => {
    onShown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <p className="border-t border-stone-200 pt-6 text-center text-sm leading-relaxed text-stone-400 dark:border-zinc-800 dark:text-stone-500">
      We showed you {count} to start — paced to how long it actually takes to read one closely,
      not to keep you scrolling. More whenever you want it.
    </p>
  );
}

function FeedSkeleton() {
  return (
    <div className="mt-4 animate-pulse space-y-4 rounded-2xl bg-stone-100 p-8 dark:bg-zinc-900">
      <div className="h-5 w-2/3 rounded bg-stone-200 dark:bg-zinc-800" />
      <div className="h-3 w-full rounded bg-stone-200 dark:bg-zinc-800" />
      <div className="h-3 w-5/6 rounded bg-stone-200 dark:bg-zinc-800" />
    </div>
  );
}

function DriftCard({ item }: { item: RecommendationItem }) {
  const [expanded, setExpanded] = useState(false);
  const [thumbsUp, setThumbsUp] = useState<boolean | null>(null);
  const [followUps, setFollowUps] = useState<{ question: string; result: FullFollowUpResult | null }[]>([]);
  const [showStick, setShowStick] = useState(false);
  const [mistExplanation, setMistExplanation] = useState("");
  const [mistStatus, setMistStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [mistResult, setMistResult] = useState<MakeItStickEval | null>(null);

  // A card's collapsed state IS the Gist view — logged once per card shown, same signal as the
  // ask screen's default depth (docs/decisions.md §5, depth-selection distribution).
  useEffect(() => {
    logDepthView(item.id, "gist");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (expanded) logDepthView(item.id, "explore");
  }, [expanded, item.id]);

  useEffect(() => {
    if (showStick) logDepthView(item.id, "stick");
  }, [showStick, item.id]);

  function patchEngagement(body: Record<string, unknown>) {
    fetch("/api/recommendations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendationId: item.recommendationId, ...body }),
    }).catch(() => {});
  }

  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next) patchEngagement({ clicked: true });
  }

  function giveThumbs(value: boolean) {
    setThumbsUp(value);
    patchEngagement({ thumbsUp: value });
  }

  async function askFollowUp(fq: string) {
    setFollowUps((prev) => [...prev, { question: fq, result: null }]);
    patchEngagement({ followUpAsked: true });
    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: fq, parentQuestionId: item.id }),
      });
      const data = await res.json();
      setFollowUps((prev) => prev.map((f) => (f.question === fq ? { ...f, result: data } : f)));
    } catch {
      setFollowUps((prev) => prev.filter((f) => f.question !== fq));
    }
  }

  async function submitMakeItStick() {
    if (!mistExplanation.trim()) return;
    setMistStatus("loading");
    try {
      const res = await fetch("/api/make-it-stick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coreTakeaways: item.coreTakeaways, userExplanation: mistExplanation }),
      });
      if (!res.ok) throw new Error("request failed");
      setMistResult(await res.json());
      setMistStatus("done");
    } catch {
      setMistStatus("error");
    }
  }

  return (
    <article className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-stone-200/70 dark:bg-zinc-950 dark:ring-zinc-800">
      <h2 className="font-editorial text-2xl italic leading-snug text-stone-900 dark:text-stone-100">
        {item.question}
      </h2>

      <ul className="mt-5 space-y-2">
        {item.coreTakeaways.map((t, i) => (
          <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-400">
            <span className="mt-2 h-1 w-1 flex-none rounded-full bg-stone-400 dark:bg-stone-600" />
            {t}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={toggleExpand}
          className="text-sm font-medium text-stone-500 underline-offset-4 hover:text-stone-800 hover:underline dark:text-stone-400 dark:hover:text-stone-200"
        >
          {expanded ? "Collapse" : "Go deeper"}
        </button>
        <div className="flex items-center gap-2">
          <ThumbsButtons value={thumbsUp} onChange={giveThumbs} />
          <SaveButton questionId={item.id} />
        </div>
      </div>

      {expanded && (
        <div className="mt-6 border-t border-stone-100 pt-6 dark:border-zinc-800">
          <KnowledgeContentView content={item.content} />

          {item.followUpPredictions.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
                Wander deeper
              </p>
              <div className="flex flex-col gap-2">
                {item.followUpPredictions.map((fq) => (
                  <button
                    key={fq}
                    onClick={() => askFollowUp(fq)}
                    disabled={followUps.some((f) => f.question === fq)}
                    className="rounded-xl border border-stone-200 px-4 py-2 text-left text-sm text-stone-700 hover:border-stone-400 disabled:opacity-40 dark:border-zinc-700 dark:text-stone-300 dark:hover:border-zinc-500"
                  >
                    {fq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {followUps.map((f) => (
            <div key={f.question} className="mt-4 rounded-xl bg-stone-50 p-4 dark:bg-zinc-900">
              {!f.result ? (
                <p className="text-sm text-stone-400">Thinking…</p>
              ) : f.result.kind === "full" && f.result.content ? (
                <div>
                  <p className="font-editorial text-lg italic text-stone-900 dark:text-stone-100">
                    {f.result.question}
                  </p>
                  <ul className="mt-3 space-y-1">
                    {(f.result.coreTakeaways ?? []).map((t: string, i: number) => (
                      <li key={i} className="text-sm text-stone-600 dark:text-stone-400">
                        · {t}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <KnowledgeContentView content={f.result.content} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-stone-500">
                  {f.result.kind === "safety" ? f.result.message : f.result.answer}
                </p>
              )}
            </div>
          ))}

          <div className="mt-6">
            <button
              onClick={() => setShowStick((v) => !v)}
              className="text-sm font-medium text-stone-500 underline-offset-4 hover:text-stone-800 hover:underline dark:text-stone-400 dark:hover:text-stone-200"
            >
              {showStick ? "Hide Make It Stick" : "Make It Stick"}
            </button>
            {showStick && (
              <div className="mt-4">
                <MakeItStick
                  coreTakeaways={item.coreTakeaways}
                  explanation={mistExplanation}
                  setExplanation={setMistExplanation}
                  status={mistStatus}
                  evalResult={mistResult}
                  onSubmit={submitMakeItStick}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

// Loose shape — the follow-up result from /api/interpret is InterpretResult, but this file
// doesn't need the full type machinery for a one-level-deep nested render.
interface FullFollowUpResult {
  kind: "full" | "factoid" | "safety";
  question?: string;
  message?: string;
  answer?: string;
  coreTakeaways?: string[];
  content?: KnowledgeContent;
}

function CaughtUpCard({
  recentlyExplored,
  name,
  onCheckForMore,
  checking,
}: {
  recentlyExplored: RecentlyExplored[];
  name: string | null;
  onCheckForMore: () => void;
  checking: boolean;
}) {
  return (
    <div>
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-stone-200/70 dark:bg-zinc-950 dark:ring-zinc-800">
        <p className="font-editorial text-2xl italic text-stone-900 dark:text-stone-100">
          You&apos;re caught up with learning for today{name ? `, ${name}` : ""}.
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Paced to how long it takes to sit with an idea, not how long we can keep you scrolling —
          more shows up as the group asks new things. Try explaining one below from memory before
          you go.
        </p>
        <button
          onClick={onCheckForMore}
          disabled={checking}
          className="mt-6 rounded-full border border-stone-300 px-4 py-2 text-xs font-medium text-stone-600 hover:border-stone-400 hover:text-stone-800 disabled:opacity-50 dark:border-zinc-700 dark:text-stone-400 dark:hover:text-stone-200"
        >
          {checking ? "Checking…" : "Check for anything new"}
        </button>
      </div>

      {recentlyExplored.length > 0 && (
        <div className="mt-10">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-stone-400">
            Revisit what you looked at today
          </p>
          <div className="space-y-10">
            {recentlyExplored.map((item) => (
              <DriftCard key={item.recommendationId} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
