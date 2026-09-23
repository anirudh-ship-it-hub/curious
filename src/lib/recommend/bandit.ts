// Epsilon-greedy explore/exploit logic (docs/decisions.md §3), replacing the original fixed
// 3/1/1 relevant:adjacent:wildcard ratio. Pure functions, no DB/AI — fully unit-testable.
//
// Reading of the locked spec: epsilon decides explore (wildcard) vs exploit (relevant/adjacent)
// per recommendation slot. Within the exploit portion, relevant is weighted higher than
// adjacent (motif match is a stronger signal than a one-hop graph guess) — EXPLOIT_RELEVANT_SHARE
// preserves the spirit of the original 3:1 relevant:adjacent ratio without hard-locking slot
// counts. All constants below are explicitly tunable placeholders (same status as the depth
// thresholds in depth.ts) — build-and-tune with real data, not locked.

export type Slot = "relevant" | "adjacent" | "wildcard";

const EPSILON_START = 0.5; // new user, zero history
const EPSILON_FLOOR = 0.175; // asymptote, midpoint of the documented 15-20% range
const EPSILON_DECAY_SCALE = 8; // higher = slower decay; ~8 questions to approach the floor
const EXPLOIT_RELEVANT_SHARE = 0.75; // within exploit slots, relevant vs adjacent split

export function computeEpsilon(questionCount: number): number {
  if (questionCount < 0) throw new Error("questionCount must be >= 0");
  return EPSILON_FLOOR + (EPSILON_START - EPSILON_FLOOR) * Math.exp(-questionCount / EPSILON_DECAY_SCALE);
}

export function assignSlot(epsilon: number, random: () => number = Math.random): Slot {
  if (random() < epsilon) return "wildcard";
  return random() < EXPLOIT_RELEVANT_SHARE ? "relevant" : "adjacent";
}

export function assignSlots(count: number, epsilon: number, random: () => number = Math.random): Slot[] {
  return Array.from({ length: count }, () => assignSlot(epsilon, random));
}

// Reward signal (docs/engineering.md): click/read-through/follow-up = positive, bounce =
// negative. Used for the "recommendation acceptance rate" KPI (decisions.md §5) and future
// tuning — not fed back into candidate selection online (Thompson Sampling was explicitly
// rejected in favor of this simpler, more debuggable design).
export interface EngagementEvent {
  clicked: boolean;
  followUpAsked: boolean;
  thumbsUp: boolean | null; // explicit micro-active signal (decisions.md §6), null if not given
}

export function computeReward(event: EngagementEvent): number {
  if (event.thumbsUp === false) return -1;
  if (event.thumbsUp === true) return 1;
  if (event.followUpAsked) return 1;
  if (event.clicked) return 0.5;
  return -0.25; // shown but ignored — a soft bounce signal
}
