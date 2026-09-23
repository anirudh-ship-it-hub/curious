// Shared rendering pieces used by both the ask-a-question screen (home-client.tsx) and
// Curious Shorts (shorts-client.tsx) — moved out once a second screen needed them, not
// speculative.
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
      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{node.label}</p>
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
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{n.label}</p>
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
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        In your own words, explain this topic. No peeking back at Explore — this is retrieval
        practice.
      </p>
      <textarea
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        rows={5}
        placeholder="Type your explanation…"
        className="w-full rounded-xl border border-zinc-300 bg-white p-4 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      {status === "error" && (
        <p className="mt-2 text-sm text-red-600">Something went wrong. Try again.</p>
      )}
      <button
        onClick={() => onSubmit(coreTakeaways)}
        disabled={status === "loading" || !explanation.trim()}
        className="mt-3 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {status === "loading" ? "Checking…" : "Check my understanding"}
      </button>
    </div>
  );
}
