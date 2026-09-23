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
