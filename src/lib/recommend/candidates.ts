import type { SupabaseClient } from "@supabase/supabase-js";
import type { Slot } from "./bandit";
import { scoreRelevant, scoreAdjacent, rankByScore, shuffle, tallyMotifs } from "./scoring";

// One candidate pool query serves all three slots (docs/decisions.md §3: "candidate pool is
// shared across all beta users plus a curated seed set for cold start"). Reads use the
// service-role client (docs/decisions.md §14) since the pool is, by definition, content the
// current user does not own — the caller (the recommendations API route) is responsible for
// returning this inline and never letting the client re-query Supabase for it directly.
const POOL_COLUMNS =
  "id, question, archetype, intent, complexity, difficulty, importance, depth_recommendation, " +
  "content, dependencies, motif_tags, core_takeaways, follow_up_predictions, has_visual_potential";

// Cap on how much of the shared pool to pull into memory for scoring. Plain in-process ranking
// (no SQL-side scoring) is deliberately simple at beta scale (docs/decisions.md §3: "no vector
// DB or embeddings infra... plain Supabase counters") — this cap is the thing to revisit first
// if the pool ever grows past a beta's worth of content.
const POOL_FETCH_CAP = 300;
const RECENT_QUESTIONS_FOR_ADJACENCY = 5;
const TOP_MOTIFS_FOR_RELEVANCE = 5;
// Recency window for relevant-slot motif weighting (docs/decisions.md §19) — deliberately the
// same fetch as adjacency's "recent own questions" query below, just a larger slice of it, so
// this doesn't cost a second round-trip. 20 is a starting pick within a forgiving 15-30 range;
// tune later with real usage, but not blocking — see scoring.ts's tallyMotifs comment for why
// a window size can ship now where a decay half-life couldn't.
const RECENT_WINDOW_FOR_MOTIF_RECENCY = 20;

export interface Candidate {
  id: string;
  question: string;
  archetype: string;
  intent: string;
  complexity: number;
  difficulty: number;
  importance: number;
  depthRecommendation: string;
  content: unknown;
  dependencies: string[];
  motifTags: string[];
  coreTakeaways: string[];
  followUpPredictions: string[];
  hasVisualPotential: boolean;
}

interface PoolRow {
  id: string;
  question: string;
  archetype: string;
  intent: string;
  complexity: number;
  difficulty: number;
  importance: number;
  depth_recommendation: string;
  content: unknown;
  dependencies: string[];
  motif_tags: string[];
  core_takeaways: string[];
  follow_up_predictions: string[];
  has_visual_potential: boolean;
}

function toCandidate(row: PoolRow): Candidate {
  return {
    id: row.id,
    question: row.question,
    archetype: row.archetype,
    intent: row.intent,
    complexity: row.complexity,
    difficulty: row.difficulty,
    importance: row.importance,
    depthRecommendation: row.depth_recommendation,
    content: row.content,
    dependencies: row.dependencies,
    motifTags: row.motif_tags,
    coreTakeaways: row.core_takeaways,
    followUpPredictions: row.follow_up_predictions,
    hasVisualPotential: row.has_visual_potential,
  };
}

export interface SlottedCandidates {
  relevant: Candidate[];
  adjacent: Candidate[];
  wildcard: Candidate[];
}

// Builds one ranked, deduplicated candidate list per slot for a user. Pure selection logic
// only — callers decide how many of each to actually show (via bandit.assignSlots) and are
// responsible for logging what was shown to recommendation_log.
export async function buildCandidatePools(
  admin: SupabaseClient,
  userId: string,
  alreadyShownIds: string[],
  random: () => number = Math.random
): Promise<SlottedCandidates> {
  const [{ data: motifRows }, { data: recentOwn }, { data: poolRows }] = await Promise.all([
    admin
      .from("motif_counts")
      .select("motif, count")
      .eq("user_id", userId)
      .order("count", { ascending: false })
      .limit(TOP_MOTIFS_FOR_RELEVANCE),
    // One fetch serves both adjacency (dependencies) and relevant-slot recency weighting
    // (motif_tags) — adjacency uses only the first RECENT_QUESTIONS_FOR_ADJACENCY rows of this
    // same result below, motif recency uses the full window.
    admin
      .from("questions")
      .select("dependencies, motif_tags")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(RECENT_WINDOW_FOR_MOTIF_RECENCY),
    admin
      .from("questions")
      .select(POOL_COLUMNS)
      .or(`user_id.is.null,user_id.neq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(POOL_FETCH_CAP),
  ]);

  const excludeIds = new Set(alreadyShownIds);
  const pool: Candidate[] = ((poolRows ?? []) as unknown as PoolRow[])
    .map(toCandidate)
    .filter((c) => !excludeIds.has(c.id));

  // Relevant-slot weighting = all-time count (stable baseline, top motifs the user has ever
  // meaningfully cared about — never vanishes) + recent-window count (current-focus signal,
  // §19). Additive, not a replacement: a motif that's purely historical still scores via its
  // all-time weight; a motif that's newly hot but not yet in the historical top-5 still scores
  // via the recency window instead of being invisible to relevant-slot scoring until it
  // accumulates enough all-time history to make the top-5 cut.
  const motifWeights: Record<string, number> = tallyMotifs(
    (recentOwn ?? []).map((r) => ({ motifTags: (r.motif_tags as string[]) ?? [] }))
  );
  for (const row of motifRows ?? []) {
    const motif = row.motif as string;
    motifWeights[motif] = (motifWeights[motif] ?? 0) + (row.count as number);
  }

  const targetConcepts = (recentOwn ?? [])
    .slice(0, RECENT_QUESTIONS_FOR_ADJACENCY)
    .flatMap((r) => (r.dependencies as string[]) ?? []);

  const relevant = rankByScore(pool, (c) => scoreRelevant(c.motifTags, motifWeights));
  const relevantIds = new Set(relevant.map((c) => c.id));

  const adjacentPool = pool.filter((c) => !relevantIds.has(c.id));
  const adjacent = rankByScore(adjacentPool, (c) => scoreAdjacent(c.question, targetConcepts));
  const adjacentIds = new Set(adjacent.map((c) => c.id));

  const wildcardPool = pool.filter((c) => !relevantIds.has(c.id) && !adjacentIds.has(c.id));
  const wildcard = shuffle(wildcardPool, random);

  return { relevant, adjacent, wildcard };
}

// Consumes ranked pools in slot-assignment order, pulling from the matching queue for each
// slot. Deliberately does NOT backfill an empty slot's queue from another slot's queue —
// e.g. a brand-new user with no motif_counts yet will correctly get zero "relevant" results
// rather than a mislabeled substitute, which matters for reading recommendation_log data
// honestly later (a "relevant" row should mean the motif match actually existed).
export function fillSlots(slots: Slot[], pools: SlottedCandidates): { slot: Slot; candidate: Candidate }[] {
  const queues: Record<Slot, Candidate[]> = {
    relevant: [...pools.relevant],
    adjacent: [...pools.adjacent],
    wildcard: [...pools.wildcard],
  };
  const used = new Set<string>();
  const filled: { slot: Slot; candidate: Candidate }[] = [];

  for (const slot of slots) {
    const queue = queues[slot];
    while (queue.length > 0) {
      const candidate = queue.shift()!;
      if (used.has(candidate.id)) continue;
      used.add(candidate.id);
      filled.push({ slot, candidate });
      break;
    }
  }

  return filled;
}
