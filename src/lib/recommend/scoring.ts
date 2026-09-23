// Pure scoring functions for recommendation candidate ranking (docs/decisions.md §3).
// No DB/AI here — same "pure logic layer, unit-testable" split as bandit.ts.

// "Relevant" slot: content-based motif matching. Score = sum of the user's per-motif
// weight across every motif tag the candidate carries — a candidate hitting two motifs the
// user cares about outranks one hitting only one, and a candidate matching a heavily-weighted
// motif outranks one matching a lightly-weighted one.
export function scoreRelevant(candidateMotifs: string[], motifWeights: Record<string, number>): number {
  return candidateMotifs.reduce((sum, motif) => sum + (motifWeights[motif] ?? 0), 0);
}

// Windowed recency signal, replacing a time-decay approach (docs/decisions.md §19). Tallies
// motif occurrences across a fixed-size window of a user's own recent questions — an
// interaction-count window, not elapsed time. The parameter this needs (window size) is
// forgiving to mis-tune: 15 vs. 30 only shifts how sensitive the "current focus" signal is,
// it doesn't break anything qualitatively. A decay half-life is the opposite — too short and a
// twice-a-week user's whole taste profile decays to near-zero between visits, too long and it
// never tracks a daily user's drift — one free parameter with two ways to actively break the
// system, which is why that approach stayed blocked on real usage data and this one doesn't.
export function tallyMotifs(rows: { motifTags: string[] }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const motif of row.motifTags) counts[motif] = (counts[motif] ?? 0) + 1;
  }
  return counts;
}

// "Adjacent" slot: one-hop graph-traversal proxy. True traversal only exists within a
// single user's own concept_edges (edges connect that user's own question rows — see
// supabase/schema.sql), so it can't directly connect to another user's or seed content for
// cross-user recommending. Reusing the same concept data instead (§3: "reuses infrastructure
// already committed to for follow-up expansion" — the `dependencies` field), adjacency here
// means: does this candidate's question text mention a concept the user was just pointed
// toward (their own recent questions' `dependencies`) but hasn't asked about yet. Plain
// case-insensitive substring matching — no embeddings, per the locked "no vector DB" constraint.
export function scoreAdjacent(candidateQuestionText: string, targetConcepts: string[]): number {
  const haystack = candidateQuestionText.toLowerCase();
  return targetConcepts.reduce((count, concept) => {
    const needle = concept.trim().toLowerCase();
    return needle && haystack.includes(needle) ? count + 1 : count;
  }, 0);
}

export interface ScorableCandidate {
  id: string;
  question: string;
  motifTags: string[];
}

// Sorts by score desc, stable on ties (keeps input order), drops non-positive scores.
export function rankByScore<T extends ScorableCandidate>(candidates: T[], score: (c: T) => number): T[] {
  return candidates
    .map((c, index) => ({ c, index, s: score(c) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.index - b.index)
    .map((x) => x.c);
}

// Fisher-Yates, injectable random for deterministic tests (same pattern as bandit.ts).
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
