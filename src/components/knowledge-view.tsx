// Shared rendering pieces used by both the ask-a-question screen (home-client.tsx) and
// Drift (drift-client.tsx) — moved out once a second screen needed them, not speculative.
//
// Tree/graph renders as editorial prose, not a structural data-dump (docs/decisions.md §12,
// resolved 2026-09-22) — "knowledge model ≠ UI" (CLAUDE.md, docs/product.md locked principles):
// the discriminated union exists so the underlying AI call can express real structure (a node
// affecting multiple others, a feedback loop), not as a spec for what appears on screen. No new
// AI call for this — the interpretation prompt already asks for "editorial quality... like a
// great explainer" per-node text; this is a formatting change only, turning already-good
// label/detail/relation data into flowing sections instead of a flat list. Deliberately does
// NOT touch dependencies/motifTags/followUpPredictions or concept_edges creation (route.ts) —
// those are separate fields/mechanisms, untouched by how content.root or content.nodes render.
import { useState } from "react";
import type {
  GraphEdgeSchema,
  GraphNodeSchema,
  Interpretation,
  KnowledgeContent,
  MakeItStickEval,
  TreeNode,
} from "@/lib/ai/schema";
import type { z } from "zod";

type GraphNode = z.infer<typeof GraphNodeSchema>;
type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const ARCHETYPE_LABELS: Record<Interpretation["archetype"], string> = {
  "process-mechanism": "Process / Mechanism",
  causal: "Causal",
  "timeline-historical": "Timeline / Historical",
  comparison: "Comparison",
  system: "System",
  "hierarchy-structure": "Hierarchy / Structure",
  "open-ended-conceptual": "Open-ended / Conceptual",
};

export function KnowledgeContentView({ content }: { content: KnowledgeContent }) {
  if (content.kind === "tree") {
    return <TreeView node={content.root} />;
  }
  return <GraphView nodes={content.nodes} edges={content.edges} />;
}

// Root's own detail reads as the opening paragraph (no heading — it's the frame for
// everything under it); each child becomes its own section with a heading, so the piece reads
// like a written explainer with sections, not an indented outline.
export function TreeView({ node }: { node: TreeNode }) {
  return (
    <div className="space-y-5">
      <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">{node.detail}</p>
      {node.children.map((child, i) => (
        <TreeSection key={i} node={child} />
      ))}
    </div>
  );
}

function TreeSection({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  return (
    <div className={depth > 0 ? "mt-3 border-l border-zinc-200 pl-4 dark:border-zinc-800" : ""}>
      <p className="font-semibold text-ink">{node.label}</p>
      <p className="mt-1 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">{node.detail}</p>
      {node.children.map((child, i) => (
        <TreeSection key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

// Each node reads as its own short section, immediately followed by where it leads (its
// outgoing edges) — a real cause-and-effect chain, not a node list with a separate "Relations"
// dump underneath disconnected from what each node actually says. Nodes render in the order
// the AI returned them, which in practice already reads roughly cause-to-effect (confirmed
// against real generated content, not assumed) — no topological sort attempted, since a real
// feedback loop is a cycle and has no well-defined topological order anyway.
export function GraphView({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const labelById = Object.fromEntries(nodes.map((n) => [n.id, n.label]));
  const outgoingByNode = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    const list = outgoingByNode.get(edge.from) ?? [];
    list.push(edge);
    outgoingByNode.set(edge.from, list);
  }

  return (
    <div className="space-y-5">
      {nodes.map((n) => (
        <div key={n.id}>
          <p className="font-semibold text-ink">{n.label}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">{n.detail}</p>
          {(outgoingByNode.get(n.id) ?? []).map((e, i) => (
            <p key={i} className="mt-1.5 pl-4 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="text-zinc-400 dark:text-zinc-600">→ {e.relation} → </span>
              <span className="font-medium text-zinc-600 dark:text-zinc-300">
                {labelById[e.to] ?? e.to}
              </span>
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

export function MakeItStick({
  coreTakeaways,
  explanation,
  setExplanation,
  status,
  evalResult,
  onSubmit,
}: {
  coreTakeaways: string[];
  explanation: string;
  setExplanation: (v: string) => void;
  status: "idle" | "loading" | "done" | "error";
  evalResult: MakeItStickEval | null;
  onSubmit: (coreTakeaways: string[]) => void;
}) {
  if (status === "done" && evalResult) {
    return (
      <div>
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
          How you did
        </p>
        <div className="space-y-3">
          {evalResult.results.map((r, i) => (
            <div key={i} className="flex gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold ${
                  r.covered
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                }`}
              >
                {r.covered ? "✓" : "–"}
              </span>
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{r.takeaway}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{r.feedback}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[15px] leading-relaxed text-ink">
        Reading feels like understanding. Explaining is how you find out whether it actually was.
      </p>
      <p className="mt-2 mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        Say it in your own words, no looking back at Explore — we&apos;ll check it against the
        core ideas, not your grammar.
      </p>
      <textarea
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        rows={5}
        placeholder="Type your explanation…"
        className="w-full rounded-xl border border-zinc-300 bg-white p-4 text-sm text-ink outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      {status === "error" && (
        <p className="mt-2 text-sm text-red-600">Something went wrong. Try again.</p>
      )}
      <button
        onClick={() => onSubmit(coreTakeaways)}
        disabled={status === "loading" || !explanation.trim()}
        className="mt-3 rounded-full bg-ink px-5 py-2 text-sm font-medium text-mist disabled:opacity-50"
      >
        {status === "loading" ? "Checking…" : "Check my understanding"}
      </button>
    </div>
  );
}

// Real thumbs-up/thumbs-down glyphs, shared by the Ask screen and Drift — the plain ▲/▼
// characters they used before read as generic sort/order arrows, not a rating control (flagged
// 2026-09-23). Selected state is a filled ink pill rather than a solid icon variant, so it
// stays legible at this size without needing a second icon per state.
export function ThumbsButtons({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  const base = "rounded-full p-1.5 transition-colors";
  const inactive = "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300";
  const active = "bg-ink text-mist";
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(true)} aria-label="Thumbs up" aria-pressed={value === true} className={`${base} ${value === true ? active : inactive}`}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75A2.25 2.25 0 0 1 16.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z"
          />
        </svg>
      </button>
      <button onClick={() => onChange(false)} aria-label="Thumbs down" aria-pressed={value === false} className={`${base} ${value === false ? active : inactive}`}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 0 1-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.4.807-1.18 1.26-2.013 1.26h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 0 0 .303-.54m.023-8.25H16.48a4.5 4.5 0 0 1-1.423-.23l-3.114-1.04a4.5 4.5 0 0 0-1.423-.23H6.504c-.618 0-1.217.247-1.605.729A11.95 11.95 0 0 0 2.25 12c0 .434.023.863.068 1.285C2.427 14.306 3.346 15 4.372 15h3.126c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.5c0 .414.336.75.75.75a2.25 2.25 0 0 0 2.25-2.25v-.375c0-.621.504-1.125 1.125-1.125h.375c.828 0 1.5-.672 1.5-1.5v-1.5c0-.828-.672-1.5-1.5-1.5h-.375"
          />
        </svg>
      </button>
    </div>
  );
}

// "Save for later" toggle — used on both the Ask/Home result and Drift cards. Local-only
// initial state (always starts unsaved on mount, like the thumbs controls elsewhere in this
// file) is deliberate, not a shortcut: a given question is only ever shown once per user across
// the whole app (recommendations never re-show, and re-asking the same question creates a new
// row), so there's never a real "was this already saved" state to restore into a freshly
// rendered card — the one place that genuinely needs persisted saved state is the Settings
// saved list itself, which fetches it directly from GET /api/saved.
export function SaveButton({ questionId }: { questionId: string }) {
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    const next = !saved;
    setSaved(next); // optimistic — matches the thumbs controls' pattern in this file
    setPending(true);
    try {
      await fetch("/api/saved", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
    } catch {
      setSaved(!next); // revert on failure
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Remove from saved" : "Save for later"}
      aria-pressed={saved}
      className={saved ? "text-amber-500" : "text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"}
    >
      <svg viewBox="0 0 20 20" width="16" height="16" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
        <path d="M5 3.5A1.5 1.5 0 0 1 6.5 2h7A1.5 1.5 0 0 1 15 3.5v13.75a.5.5 0 0 1-.79.408L10 14.3l-4.21 3.36A.5.5 0 0 1 5 17.25V3.5Z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
