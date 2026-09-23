"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { layoutNodes, type LaidOutNode } from "@/lib/curiosity-map-layout";

interface QuestionRow {
  id: string;
  question: string;
  motifTags: string[];
  coreTakeaways: string[];
  createdAt: string;
}

type TimeRange = "all" | "7d" | "30d";

const RANGE_MS: Record<Exclude<TimeRange, "all">, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const MIN_SCALE = 0.4;
const MAX_SCALE = 2.5;
const ZOOM_STEP = 1.2;

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; questions: QuestionRow[] };

export function MapClient({ name }: { name: string | null }) {
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [range, setRange] = useState<TimeRange>("all");
  const [selectedMotif, setSelectedMotif] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/curiosity-map")
      .then((res) => {
        if (!res.ok) throw new Error("request failed");
        return res.json();
      })
      .then((data) => setState({ status: "ready", questions: data.questions }))
      .catch(() => setState({ status: "error" }));
  }, []);

  const filteredQuestions = useMemo(() => {
    if (state.status !== "ready") return [];
    if (range === "all") return state.questions;
    const cutoff = Date.now() - RANGE_MS[range];
    return state.questions.filter((q) => new Date(q.createdAt).getTime() >= cutoff);
  }, [state, range]);

  const nodes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of filteredQuestions) {
      for (const motif of q.motifTags) {
        counts.set(motif, (counts.get(motif) ?? 0) + 1);
      }
    }
    return layoutNodes(Array.from(counts.entries()).map(([motif, count]) => ({ motif, count })));
  }, [filteredQuestions]);

  const panelQuestions = useMemo(() => {
    if (!selectedMotif) return [];
    return filteredQuestions
      .filter((q) => q.motifTags.includes(selectedMotif))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredQuestions, selectedMotif]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 dark:bg-black">
      <AppNav />
      <div className="mb-4 flex items-center justify-center gap-4 px-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {name ? `${name}'s` : "Your"} curiosity map
        </p>
        <div className="flex gap-1 rounded-full bg-zinc-200/70 p-1 text-xs dark:bg-zinc-800/70">
          {(["all", "7d", "30d"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                range === r
                  ? "bg-white text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {r === "all" ? "All time" : r === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </div>

      {state.status === "loading" && (
        <div className="flex flex-1 items-center justify-center">
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        </div>
      )}

      {state.status === "error" && (
        <p className="mt-10 text-center text-sm text-red-600">
          Something went wrong loading your map. Try refreshing.
        </p>
      )}

      {state.status === "ready" && nodes.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="max-w-sm text-center text-sm text-zinc-500 dark:text-zinc-400">
            Nothing to map yet. Ask a few things you&apos;re curious about, and this will start
            filling in with the shape of what you&apos;ve explored.
          </p>
        </div>
      )}

      {state.status === "ready" && nodes.length > 0 && (
        <div className="relative flex-1">
          <MapCanvas nodes={nodes} onSelectMotif={setSelectedMotif} selectedMotif={selectedMotif} />

          {selectedMotif && (
            <MapPanel
              motif={selectedMotif}
              questions={panelQuestions}
              expandedQuestionId={expandedQuestionId}
              onToggleExpand={(id) => setExpandedQuestionId((prev) => (prev === id ? null : id))}
              onClose={() => {
                setSelectedMotif(null);
                setExpandedQuestionId(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MapCanvas({
  nodes,
  selectedMotif,
  onSelectMotif,
}: {
  nodes: LaidOutNode[];
  selectedMotif: string | null;
  onSelectMotif: (motif: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan({ x: dragState.current.panX + dx, y: dragState.current.panY + dy });
  }

  function onPointerUp() {
    dragState.current = null;
  }

  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    setScale((s) => clampScale(e.deltaY < 0 ? s * ZOOM_STEP : s / ZOOM_STEP));
  }

  function zoomBy(factor: number) {
    setScale((s) => clampScale(s * factor));
  }

  const centerX = size.width / 2 + pan.x;
  const centerY = size.height / 2 + pan.y;

  return (
    <div ref={containerRef} className="absolute inset-0">
      {size.width > 0 && (
        <svg
          width="100%"
          height="100%"
          className="touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
        >
          <g transform={`translate(${centerX}, ${centerY}) scale(${scale})`}>
            {nodes.map((node) => (
              <g
                key={node.motif}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => onSelectMotif(node.motif)}
                className="cursor-pointer"
              >
                <circle
                  r={node.r}
                  className={
                    selectedMotif === node.motif
                      ? "fill-amber-400 dark:fill-amber-500"
                      : "fill-amber-200 hover:fill-amber-300 dark:fill-amber-900 dark:hover:fill-amber-800"
                  }
                />
                {node.r > 30 && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none fill-amber-900 text-[11px] font-medium dark:fill-amber-100"
                  >
                    {node.motif}
                  </text>
                )}
              </g>
            ))}
          </g>
        </svg>
      )}

      {/* top-left, not bottom-right — the side panel docks bottom-right (mobile sheet) or
          right (desktop), which would otherwise sit directly on top of these buttons */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <button
          onClick={() => zoomBy(ZOOM_STEP)}
          aria-label="Zoom in"
          className="h-9 w-9 rounded-full bg-white text-lg font-medium text-zinc-600 shadow ring-1 ring-zinc-200 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800 dark:hover:text-zinc-100"
        >
          +
        </button>
        <button
          onClick={() => zoomBy(1 / ZOOM_STEP)}
          aria-label="Zoom out"
          className="h-9 w-9 rounded-full bg-white text-lg font-medium text-zinc-600 shadow ring-1 ring-zinc-200 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800 dark:hover:text-zinc-100"
        >
          −
        </button>
      </div>
    </div>
  );
}

function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

function MapPanel({
  motif,
  questions,
  expandedQuestionId,
  onToggleExpand,
  onClose,
}: {
  motif: string;
  questions: QuestionRow[];
  expandedQuestionId: string | null;
  onToggleExpand: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-lg ring-1 ring-zinc-200 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-96 sm:max-h-none sm:rounded-none sm:rounded-l-2xl dark:bg-zinc-950 dark:ring-zinc-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{motif}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          ✕
        </button>
      </div>
      <p className="mb-4 text-xs uppercase tracking-wide text-zinc-400">
        {questions.length} question{questions.length === 1 ? "" : "s"}
      </p>
      <div className="space-y-3">
        {questions.map((q) => (
          <div
            key={q.id}
            className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800"
          >
            <button
              onClick={() => onToggleExpand(q.id)}
              className="text-left text-sm font-medium text-zinc-800 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-zinc-50"
            >
              {q.question}
            </button>
            {expandedQuestionId === q.id && q.coreTakeaways.length > 0 && (
              <ul className="mt-2 space-y-1">
                {q.coreTakeaways.map((t, i) => (
                  <li key={i} className="text-xs text-zinc-500 dark:text-zinc-400">
                    · {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <a
        href="/"
        className="mt-6 block text-center text-sm font-medium text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        Ask something related →
      </a>
    </div>
  );
}
