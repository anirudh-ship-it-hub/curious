"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { layoutNodes, type LaidOutNode } from "@/lib/curiosity-map-layout";
import { formatMotifTag } from "@/lib/ai/motifs";
import { SavedList } from "@/components/saved-list";

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

type ViewMode = "map" | "saved";

export function MapClient() {
  const [view, setView] = useState<ViewMode>("map");
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
      <div className="mb-2 flex items-center justify-between px-4">
        <div className="flex gap-1 rounded-full bg-zinc-200/70 p-1 text-xs dark:bg-zinc-800/70">
          {(["map", "saved"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                view === v
                  ? "bg-white text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {v === "map" ? "Map" : "Saved"}
            </button>
          ))}
        </div>
        {view === "map" && (
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
        )}
      </div>

      {view === "saved" && (
        <div className="flex-1 overflow-y-auto">
          <SavedList />
        </div>
      )}

      {view === "map" && state.status === "loading" && (
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

      {view === "map" && state.status === "error" && (
        <p className="mt-10 text-center text-sm text-red-600">
          Something went wrong loading your map. Try refreshing.
        </p>
      )}

      {view === "map" && state.status === "ready" && nodes.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="max-w-sm text-center text-sm text-zinc-500 dark:text-zinc-400">
            Nothing to map yet. Ask a few things you&apos;re curious about, and this will start
            filling in with the shape of what you&apos;ve explored.
          </p>
        </div>
      )}

      {view === "map" && state.status === "ready" && nodes.length > 0 && (
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

  // Enclosing "mind" outline (flagged 2026-09-23: "no outline... mind shaped outline maybe") —
  // an organic blob sized to whatever the current node layout actually spans, not a fixed
  // shape, so it stays a snug boundary as the map grows. Deterministic (sine-based wobble, no
  // Math.random) so it doesn't reshuffle on every re-render.
  const blobPath = useMemo(() => outlinePath(nodes), [nodes]);

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
            {blobPath && (
              <path
                d={blobPath}
                className="fill-amber-100/40 stroke-amber-300/70 dark:fill-amber-950/20 dark:stroke-amber-800/60"
                strokeWidth={2 / scale}
              />
            )}
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
                <NodeLabel motif={node.motif} r={node.r} />
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
        <p className="text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500">{Math.round(scale * 100)}%</p>
        <InfoButton />
      </div>
    </div>
  );
}

// On-demand explanation of what the map means, replacing a permanent caption line that was
// competing for space with the view/range toggles above it (flagged 2026-09-23: "so many
// toggles... overlapping" and "feels a bit text heavy"). Grouped with the other map controls
// instead of always-visible screen real estate.
function InfoButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="What this map shows"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-semibold text-zinc-500 shadow ring-1 ring-zinc-200 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800 dark:hover:text-zinc-100"
      >
        i
      </button>
      {open && (
        <div className="absolute top-11 left-0 w-48 rounded-xl bg-white p-3 text-xs leading-relaxed text-zinc-600 shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800">
          Bigger circle = a pattern you&apos;ve explored more. Tap one to see the questions behind it.
        </div>
      )}
    </div>
  );
}

function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

// Greedily wraps a label to a max character width per line — cheap and good enough at this
// font size/scale; an exact canvas-measured wrap would be overkill for a handful of words in a
// bubble (docs/decisions.md "don't over-engineer for beta scale").
function wrapLabel(label: string, maxChars: number): string[] {
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Fixed "words bleeding out of the circle" (flagged 2026-09-23) — the label now wraps to fit
// the bubble's own radius instead of rendering as one unbroken line. Font size and wrap width
// both scale with the node's radius so small bubbles get a tighter, still-legible fit rather
// than clipping or overflowing.
function NodeLabel({ motif, r }: { motif: string; r: number }) {
  if (r < 22) return null;
  const label = formatMotifTag(motif);
  const fontSize = Math.max(8, Math.min(12, r / 4));
  const maxChars = Math.max(4, Math.floor((r * 1.5) / (fontSize * 0.56)));
  const lines = wrapLabel(label, maxChars).slice(0, 3);
  const lineHeight = fontSize * 1.2;
  const startDy = -((lines.length - 1) * lineHeight) / 2;

  return (
    <text
      textAnchor="middle"
      className="pointer-events-none select-none fill-amber-900 font-medium dark:fill-amber-100"
      style={{ fontSize }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={0} dy={i === 0 ? startDy : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

// A deliberately brain-shaped boundary, not a random wobbly blob (the first pass read as an
// amoeba, not "a mind" — flagged twice, 2026-09-23 and 2026-09-24). Hand-tuned radius
// multipliers at fixed angles give it the two features that actually read as "brain" at a
// glance: two rounded lobes at the top with a shallow notch between them, and one smooth
// unbroken curve along the bottom — mirrored left/right for anatomical symmetry. baseR still
// tracks the layout's real extent (max distance from origin + node radius, plus padding), so
// the shape scales with content without losing its silhouette. Deterministic: same nodes in,
// same shape out.
// [angle in degrees — screen convention, 0=right/90=down/180=left/270=up, radius multiplier]
const BRAIN_OUTLINE_POINTS: [number, number][] = [
  [270, 0.85], // top-center notch, between the two lobes
  [285, 1.15], // right lobe peak
  [310, 1.05], // right lobe outer
  [340, 1.1], // right upper side
  [0, 1.15], // right side, widest point
  [30, 1.05], // right lower side
  [60, 0.95], // taper toward bottom
  [90, 1.0], // bottom-center, single smooth curve
  [120, 0.95], // taper toward bottom (mirrored)
  [150, 1.05], // left lower side
  [180, 1.15], // left side, widest point
  [200, 1.1], // left upper side
  [230, 1.05], // left lobe outer
  [255, 1.15], // left lobe peak
];

function outlinePath(nodes: LaidOutNode[]): string | null {
  if (nodes.length === 0) return null;
  const extent = Math.max(...nodes.map((n) => Math.hypot(n.x, n.y) + n.r), 40);
  const baseR = extent * 1.3 + 20;

  const pts = BRAIN_OUTLINE_POINTS.map(([angleDeg, mult]) => {
    const theta = (angleDeg / 180) * Math.PI;
    const r = baseR * mult;
    return [r * Math.cos(theta), r * Math.sin(theta)];
  });

  const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const first = mid(pts[pts.length - 1], pts[0]);
  let d = `M ${first[0]} ${first[1]}`;
  for (let i = 0; i < pts.length; i++) {
    const next = pts[(i + 1) % pts.length];
    const m = mid(pts[i], next);
    d += ` Q ${pts[i][0]} ${pts[i][1]} ${m[0]} ${m[1]}`;
  }
  return d + " Z";
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
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{formatMotifTag(motif)}</h2>
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
