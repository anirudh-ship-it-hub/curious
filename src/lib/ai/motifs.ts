// Closed motif taxonomy for the "curiosity taste" recommendation engine (docs/decisions.md §3).
// Draft list — refine once real questions/tagging data exists. Keep closed (don't let the
// classifier invent new tags), abstract/thematic (not topical), and roughly 15-20 entries.
export const MOTIF_TAGS = [
  "collapse-and-renewal",
  "unintended-consequences",
  "power-dynamics",
  "scarcity-and-abundance",
  "hidden-connections",
  "feedback-loops",
  "tradeoffs",
  "emergence",
  "adaptation",
  "innovation-diffusion",
  "cooperation-and-conflict",
  "scale-effects",
  "constraints-as-drivers",
  "information-and-uncertainty",
  "identity-and-belonging",
  "cause-and-blame",
  "incentives",
  "boundaries-and-categories",
] as const;

export type MotifTag = (typeof MOTIF_TAGS)[number];

// Display-only formatting for a motif tag — the stored/matched value stays the raw kebab-case
// slug (motif_counts, candidate scoring, everywhere else) so this never touches logic, only
// what's shown in a pill/label. Without it, slugs like "collapse-and-renewal" render verbatim
// next to Title Case labels (the archetype badge, nav, headings) — the exact "case looks messed
// up" inconsistency flagged 2026-09-23.
const LOWERCASE_CONNECTORS = new Set(["and", "as"]);
export function formatMotifTag(tag: string): string {
  return tag
    .split("-")
    .map((word, i) => (i > 0 && LOWERCASE_CONNECTORS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}
