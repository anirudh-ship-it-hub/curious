"use client";

// The saved/bookmarked list (SaveButton, knowledge-view.tsx) — lives on the Map screen
// (docs decision, 2026-09-23: "curiosity map" and "things I chose to keep" are both
// reflect-on-what-I've-explored surfaces, unlike Settings' account/appearance/feedback
// grab-bag, so this moved out of Settings rather than living in both places). Deliberately
// lighter than a full DriftCard (no thumbs, no follow-ups, no Make It Stick) — a reference list
// to revisit and unsave from, not another place to re-run the full interaction surface.
import { useEffect, useState } from "react";
import { KnowledgeContentView } from "@/components/knowledge-view";
import type { KnowledgeContent } from "@/lib/ai/schema";

// Matches the inline shape GET /api/saved returns — a Candidate (src/lib/recommend/
// candidates.ts) plus savedId/savedAt layered on top, same pattern as Drift's
// RecommendationItem shape in drift-client.tsx.
interface SavedItem {
  savedId: string;
  savedAt: string;
  id: string;
  question: string;
  content: KnowledgeContent;
  coreTakeaways: string[];
}

type SavedState = { status: "loading" } | { status: "error" } | { status: "ready"; items: SavedItem[] };

export function SavedList() {
  const [state, setState] = useState<SavedState>({ status: "loading" });

  useEffect(() => {
    fetch("/api/saved")
      .then((res) => {
        if (!res.ok) throw new Error("request failed");
        return res.json();
      })
      .then((data) => setState({ status: "ready", items: data.saved ?? [] }))
      .catch(() => setState({ status: "error" }));
  }, []);

  async function unsave(item: SavedItem) {
    if (state.status !== "ready") return;
    setState({ status: "ready", items: state.items.filter((i) => i.savedId !== item.savedId) });
    try {
      await fetch("/api/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: item.id }),
      });
    } catch {
      // Worst case it reappears next time this list loads — not worth a rollback here.
    }
  }

  if (state.status === "loading") {
    return <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>;
  }
  if (state.status === "error") {
    return <p className="mt-10 text-center text-sm text-red-600">Couldn&apos;t load your saved items. Try refreshing.</p>;
  }
  if (state.items.length === 0) {
    return (
      <p className="mx-auto mt-10 max-w-sm text-center text-sm text-zinc-500 dark:text-zinc-400">
        Nothing saved yet — tap the bookmark on anything in Ask or Drift to keep it here.
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-3 px-4 pb-16">
      {state.items.map((item) => (
        <SavedCard key={item.savedId} item={item} onUnsave={() => unsave(item)} />
      ))}
    </div>
  );
}

function SavedCard({ item, onUnsave }: { item: SavedItem; onUnsave: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-left text-sm font-medium text-zinc-800 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-zinc-50"
        >
          {item.question}
        </button>
        <button
          onClick={onUnsave}
          aria-label="Remove from saved"
          className="flex-none text-xs text-zinc-400 hover:text-red-600"
        >
          Remove
        </button>
      </div>
      {!expanded && item.coreTakeaways.length > 0 && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{item.coreTakeaways[0]}</p>
      )}
      {expanded && (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <KnowledgeContentView content={item.content} />
        </div>
      )}
    </div>
  );
}
