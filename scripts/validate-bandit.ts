// Pure logic validation — no DB, no AI, should run instantly.
import { computeEpsilon, assignSlots, computeReward } from "../src/lib/recommend/bandit";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAILED: ${message}`);
  console.log(`ok: ${message}`);
}

// Epsilon decay shape
const eps0 = computeEpsilon(0);
const eps5 = computeEpsilon(5);
const eps20 = computeEpsilon(20);
const eps100 = computeEpsilon(100);
console.log({ eps0, eps5, eps20, eps100 });

assert(Math.abs(eps0 - 0.5) < 1e-9, "epsilon at 0 history starts at ~0.5");
assert(eps5 < eps0 && eps5 > eps20, "epsilon decreases monotonically with history");
assert(eps100 >= 0.175 && eps100 < 0.18, "epsilon approaches the ~15-20% floor at high history");

// Slot distribution over a large deterministic sample
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const N = 20000;
const epsilon = 0.3;
const slots = assignSlots(N, epsilon, seededRandom(42));
const counts = { relevant: 0, adjacent: 0, wildcard: 0 };
for (const s of slots) counts[s]++;
const wildcardRate = counts.wildcard / N;
const relevantShareWithinExploit = counts.relevant / (counts.relevant + counts.adjacent);

console.log({ counts, wildcardRate, relevantShareWithinExploit });
assert(Math.abs(wildcardRate - epsilon) < 0.02, "wildcard rate matches epsilon within sampling noise");
assert(Math.abs(relevantShareWithinExploit - 0.75) < 0.02, "relevant:adjacent split within exploit matches 0.75");

// Reward signal
assert(computeReward({ clicked: false, followUpAsked: false, thumbsUp: false }) === -1, "explicit thumbs-down is worst");
assert(computeReward({ clicked: true, followUpAsked: true, thumbsUp: true }) === 1, "thumbs-up is best");
assert(computeReward({ clicked: false, followUpAsked: true, thumbsUp: null }) === 1, "follow-up without explicit feedback is still positive");
assert(computeReward({ clicked: true, followUpAsked: false, thumbsUp: null }) === 0.5, "click alone is mildly positive");
assert(computeReward({ clicked: false, followUpAsked: false, thumbsUp: null }) === -0.25, "shown and ignored is a soft bounce");

console.log("\nAll bandit logic checks passed.");
