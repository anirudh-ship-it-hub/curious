// Pure-logic validation for the recommendation scoring layer (docs/decisions.md §3).
// No DB/AI — same "validate the pure layer before wiring in DB access" pattern as
// validate-bandit.ts. Run: npx tsx scripts/validate-recommend.ts
import { scoreRelevant, scoreAdjacent, rankByScore, shuffle, tallyMotifs } from "../src/lib/recommend/scoring";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  }
}

// scoreRelevant: sums matched motif weights, ignores unmatched motifs.
assert(scoreRelevant(["feedback-loops"], { "feedback-loops": 3 }) === 3, "single motif match sums its weight");
assert(
  scoreRelevant(["feedback-loops", "tradeoffs"], { "feedback-loops": 3, tradeoffs: 2 }) === 5,
  "multiple motif matches sum all weights"
);
assert(scoreRelevant(["unrelated-motif"], { "feedback-loops": 3 }) === 0, "unmatched motif scores zero");
assert(scoreRelevant([], { "feedback-loops": 3 }) === 0, "no motifs scores zero");

// tallyMotifs: windowed recency counting (docs/decisions.md §19) — counts occurrences across
// a set of rows, order-independent (the caller controls "recent" by which rows it passes in).
assert(
  JSON.stringify(tallyMotifs([{ motifTags: ["a"] }, { motifTags: ["a", "b"] }])) === JSON.stringify({ a: 2, b: 1 }),
  "tallyMotifs counts occurrences across multiple rows, motifs within a row all count"
);
assert(JSON.stringify(tallyMotifs([])) === JSON.stringify({}), "tallyMotifs on no rows returns empty");
assert(
  JSON.stringify(tallyMotifs([{ motifTags: [] }, { motifTags: [] }])) === JSON.stringify({}),
  "tallyMotifs on rows with no motifs returns empty"
);

// The actual combination candidates.ts performs: all-time weight + recent-window tally,
// additive not replacing — validated here as a scenario, not just the two pieces in isolation.
{
  const allTime: Record<string, number> = { "old-interest": 10, "steady-interest": 5 };
  const recentRows = [{ motifTags: ["new-interest"] }, { motifTags: ["new-interest"] }, { motifTags: ["steady-interest"] }];
  const combined: Record<string, number> = tallyMotifs(recentRows);
  for (const [motif, count] of Object.entries(allTime)) combined[motif] = (combined[motif] ?? 0) + count;

  assert(combined["old-interest"] === 10, "purely-historical motif keeps its all-time weight, never vanishes");
  assert(combined["new-interest"] === 2, "newly-hot motif with zero all-time history still scores, via the recency window");
  assert(combined["steady-interest"] === 6, "motif present in both windows sums additively (5 all-time + 1 recent)");
}

// scoreAdjacent: substring match count against target concepts, case-insensitive.
assert(scoreAdjacent("How does a thermostat use feedback loops?", ["feedback loops"]) === 1, "matches one concept");
assert(
  scoreAdjacent("Feedback Loops and Scarcity in economics", ["feedback loops", "scarcity"]) === 2,
  "matches multiple concepts, case-insensitive"
);
assert(scoreAdjacent("unrelated question", ["feedback loops"]) === 0, "no match scores zero");
assert(scoreAdjacent("some question", []) === 0, "no target concepts scores zero");

// rankByScore: sorts descending, drops non-positive, stable on ties.
const candidates = [
  { id: "a", question: "q1", motifTags: [] },
  { id: "b", question: "q2", motifTags: [] },
  { id: "c", question: "q3", motifTags: [] },
];
const scores: Record<string, number> = { a: 1, b: 3, c: 0 };
const ranked = rankByScore(candidates, (c) => scores[c.id]);
assert(ranked.map((c) => c.id).join(",") === "b,a", "ranks descending and drops zero-score candidates");

const tieCandidates = [
  { id: "x", question: "q", motifTags: [] },
  { id: "y", question: "q", motifTags: [] },
];
const tieRanked = rankByScore(tieCandidates, () => 1);
assert(tieRanked.map((c) => c.id).join(",") === "x,y", "stable order on ties");

// shuffle: deterministic under injected random, contains same elements, no mutation of input.
const original = [1, 2, 3, 4, 5];
const shuffled = shuffle(original, () => 0.5);
assert(original.join(",") === "1,2,3,4,5", "shuffle does not mutate its input");
assert([...shuffled].sort().join(",") === "1,2,3,4,5", "shuffle preserves the same elements");

const seq = [0.1, 0.9, 0.2, 0.8, 0.3];
let i = 0;
const seeded = () => seq[i++ % seq.length];
const run1 = shuffle([1, 2, 3, 4, 5], seeded);
i = 0;
const run2 = shuffle([1, 2, 3, 4, 5], seeded);
assert(run1.join(",") === run2.join(","), "shuffle is deterministic for a given random source");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`);
  process.exit(1);
} else {
  console.log("All recommendation-scoring assertions passed.");
}
