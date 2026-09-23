import { z } from "zod";
import { MOTIF_TAGS } from "./motifs";

// Locked archetype list (docs/decisions.md §1) — collapsed from 10 to 7.
export const ARCHETYPES = [
  "process-mechanism",
  "causal",
  "timeline-historical",
  "comparison",
  "system",
  "hierarchy-structure",
  "open-ended-conceptual",
] as const;

export type Archetype = (typeof ARCHETYPES)[number];

export const INTENTS = ["understand", "practical-do", "decide"] as const;

// Safety pre-filter — runs before the factoid check, self-harm/suicide method-seeking only
// (scope decision: violence/weapons instruction-seeking is left to the provider's own refusal
// behavior, caught as a backstop in interpret.ts rather than a second dedicated flag).
export const SafetyCheckSchema = z.object({
  isSelfHarmMethodSeeking: z
    .boolean()
    .describe(
      "True ONLY if the question asks HOW to carry out self-harm or suicide — methods, means, dosages, instructions. False for questions about causes, psychology, prevention, support, statistics, or general discussion of self-harm/suicide as a topic — those should proceed normally, do not over-flag legitimate curiosity."
    ),
});
export type SafetyCheck = z.infer<typeof SafetyCheckSchema>;

// Knowledge content shape. Archetypes render as their own natural structure
// (docs/decisions.md §1) — a plain tree can express ordered steps, chronological periods,
// comparison dimensions, and hierarchy levels, but NOT the cross-links that causal/system
// questions actually have (one cause affecting multiple effects, a feedback loop). So this
// is a discriminated union: causal/system get a real graph (nodes + typed edges), the other
// five archetypes get a tree. Validated against the live provider in scripts/explore-tree.ts
// before wiring in — see conversation history for the raw examples.
interface TreeNodeShape {
  label: string;
  detail: string;
  children: TreeNodeShape[];
}

export const TreeNodeSchema: z.ZodType<TreeNodeShape> = z.lazy(() =>
  z.object({
    label: z.string().describe("Short title for this point, a few words."),
    detail: z.string().describe("1-3 sentences explaining this specific point."),
    children: z.array(TreeNodeSchema).describe("Sub-points nested under this one. Empty array if this is a leaf."),
  })
);
export type TreeNode = TreeNodeShape;

export const GraphNodeSchema = z.object({
  id: z.string().describe("Short stable identifier, e.g. 'political-instability'."),
  label: z.string().describe("Short title for this node, a few words."),
  detail: z.string().describe("1-3 sentences explaining this specific node."),
});

export const GraphEdgeSchema = z.object({
  from: z.string().describe("Source node id."),
  to: z.string().describe("Target node id."),
  relation: z
    .string()
    .describe("Short verb phrase describing the relation, e.g. 'leads to', 'feeds back into', 'weakens'."),
});

export const KnowledgeContentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("tree"),
    root: TreeNodeSchema,
  }),
  z.object({
    kind: z.literal("graph"),
    nodes: z.array(GraphNodeSchema).min(2),
    edges: z
      .array(GraphEdgeSchema)
      .min(1)
      .describe(
        "Explicit relations between nodes — this is what a graph can express that a tree can't: one node causing multiple effects, or a node feeding back into an earlier one."
      ),
  }),
]);
export type KnowledgeContent = z.infer<typeof KnowledgeContentSchema>;

// Step 1: factoid pre-filter. Cheap, runs before full interpretation so single-fact
// lookups can short-circuit and skip archetype classification entirely (decisions.md §2).
export const FactoidCheckSchema = z.object({
  isFactoid: z
    .boolean()
    .describe(
      "True only for single-fact lookups with one short correct answer (e.g. 'who is India's president', 'what year did WWII end'). False for anything that benefits from explanation, context, or has multiple facets."
    ),
  quickAnswer: z
    .string()
    .nullable()
    .describe("The direct answer, 1-2 sentences max, when isFactoid is true. Null otherwise."),
});
export type FactoidCheck = z.infer<typeof FactoidCheckSchema>;

// Step 2: full interpretation call. One AI call produces the whole structured knowledge
// object — depth (Gist/Explore/Make It Stick) is a rendering choice on top of this, not a
// separate call (docs/engineering.md).
export const InterpretationSchema = z.object({
  content: KnowledgeContentSchema.describe(
    "The knowledge tree/graph itself. kind='graph' only for causal/system archetypes (with real cross-links where the content actually has them); kind='tree' for the other five."
  ),
  archetype: z.enum(ARCHETYPES),
  archetypeConfidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in the archetype choice, 0-1."),
  archetypeJustification: z
    .string()
    .describe(
      "Why this archetype fits. If archetype is 'open-ended-conceptual', this MUST explicitly explain why archetypes 1-6 were rejected — it is a catch-all of last resort, not a default."
    ),
  intent: z
    .enum(INTENTS)
    .describe("Why someone is likely asking: to understand, to do something practical, or to decide between options."),
  complexity: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("1 = trivially simple, 5 = deeply intricate. Drives Gist vs Explore depth recommendation."),
  difficulty: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("1 = no background needed, 5 = requires significant prior knowledge to follow."),
  importance: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("1 = niche/low-stakes trivia, 5 = foundational/high-leverage to understand. Drives Gist vs Explore depth recommendation."),
  dependencies: z
    .array(z.string())
    .describe(
      "Names of prerequisite or closely related concepts this question connects to, for the concept-dependency graph (edges out of this node). Empty array if none."
    ),
  motifTags: z
    .array(z.enum(MOTIF_TAGS))
    .min(1)
    .max(3)
    .describe("1-3 tags from the closed curiosity-motif taxonomy — abstract thematic pattern, not topical category."),
  coreTakeaways: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe("2-4 core points someone must grasp to have understood this. Used as the rubric for Make It Stick."),
  followUpPredictions: z
    .array(z.string())
    .min(1)
    .max(4)
    .describe("Natural follow-up questions someone curious about this would likely ask next."),
  hasVisualPotential: z
    .boolean()
    .describe("Whether a diagram/visual would meaningfully help explain this (e.g. process, system, hierarchy) vs. being purely prose."),
});
export type Interpretation = z.infer<typeof InterpretationSchema>;

// Make It Stick evaluation (docs/decisions.md §4): rubric-check against the core takeaways
// already produced above, never open holistic grading of free text.
export const MakeItStickEvalSchema = z.object({
  results: z
    .array(
      z.object({
        takeaway: z.string().describe("The core takeaway being checked, verbatim from the rubric."),
        covered: z.boolean().describe("Whether the user's explanation demonstrates this point."),
        confidence: z.number().min(0).max(1).describe("Confidence in the covered/missed judgment, 0-1."),
        feedback: z.string().describe("One short sentence: what was right, or what was missing/off."),
      })
    )
    .describe("One entry per core takeaway, same order as the rubric."),
});
export type MakeItStickEval = z.infer<typeof MakeItStickEvalSchema>;
