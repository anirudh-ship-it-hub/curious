export type DepthRecommendation = "gist" | "explore";

// Deterministic, not AI self-reported (docs/engineering.md reliability discipline).
// Tuned against a 20-question hand-labeled eval set (npm run eval:depth, docs/decisions.md
// §2) since real beta usage doesn't exist yet — NOT the same as leaving it a blind guess. The
// previous rule (complexity<=2 AND importance<=2) measured at only 53% against hand labels,
// and empirically NEVER fired on any real generated content: every one of 16 real seeded
// questions had importance >= 3, so it always fell through to "explore". c+i<=6 scored 84%,
// the best of five candidates tried; the misses are all the same (complexity=3, importance=4)
// pair split evenly between expected gist/explore in the eval set, i.e. genuine ambiguity at
// that one boundary rather than a rule defect. Still first-guess in the sense that no real
// usage data exists — revisit once it does.
export function recommendDepth(complexity: number, importance: number): DepthRecommendation {
  return complexity + importance <= 6 ? "gist" : "explore";
}
