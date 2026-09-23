// Hand-labeled eval set for the Gist-vs-Explore depth-selection thresholds (docs/decisions.md
// §2). Deliberately a SEPARATE set from eval-archetypes.ts's CASES — that set was curated to
// exercise archetype classification on substantial questions (it explicitly errors on a
// factoid short-circuit), which structurally skews it toward medium/high complexity and
// importance. Confirmed empirically: every one of those 16 questions, once seeded, has
// importance >= 3, so the original `complexity<=2 && importance<=2` rule never once
// recommended "gist" on any real generated content — not "no real usage data yet," an actual
// broken rule. This set deliberately spans genuinely light non-factoid questions through to
// genuinely heavy ones so the thresholds can be picked against real model output instead of a
// blind guess.
// Run: npm run eval:depth
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { interpret } from "../src/lib/ai/interpret";
import { recommendDepth, type DepthRecommendation } from "../src/lib/ai/depth";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const RESULTS_FILE = "scripts/.eval-depth-results.json";

interface Case {
  question: string;
  expectedDepth: DepthRecommendation;
  note?: string;
}

export const CASES: Case[] = [
  // Expected gist — light, low/moderate-stakes, a curious quick answer is genuinely enough
  { question: "why do onions make you cry", expectedDepth: "gist" },
  { question: "how does Velcro work", expectedDepth: "gist" },
  { question: "why do cats purr", expectedDepth: "gist" },
  { question: "what's the difference between a crocodile and an alligator", expectedDepth: "gist" },
  { question: "why do we get goosebumps", expectedDepth: "gist" },
  { question: "how does a zipper work", expectedDepth: "gist" },
  { question: "why do leaves change color in autumn", expectedDepth: "gist" },
  { question: "what's the difference between a shooting star and a star", expectedDepth: "gist" },
  { question: "why do we get hiccups", expectedDepth: "gist" },
  { question: "why do we yawn when we see someone else yawn", expectedDepth: "gist" },

  // Expected explore — genuinely complex and/or high-stakes, a gist would shortchange it
  { question: "why did the Roman Empire collapse", expectedDepth: "explore" },
  { question: "how does the human immune system work", expectedDepth: "explore" },
  { question: "why do stock markets crash", expectedDepth: "explore" },
  { question: "how did hip hop evolve as a genre", expectedDepth: "explore" },
  { question: "what is consciousness", expectedDepth: "explore", note: "philosophical" },
  { question: "why does inflation happen", expectedDepth: "explore" },
  { question: "how do neural networks learn", expectedDepth: "explore" },
  { question: "why did World War 1 start", expectedDepth: "explore" },
  { question: "what causes climate change", expectedDepth: "explore" },
  { question: "how does encryption keep data secure", expectedDepth: "explore" },
];

interface Row {
  question: string;
  complexity: number;
  importance: number;
  expectedDepth: DepthRecommendation;
  note?: string;
}

// Candidate threshold rules, compared against the hand labels above so the pick is measured,
// not guessed — same discipline as archetype/motif eval sets.
const CANDIDATE_RULES: Record<string, (complexity: number, importance: number) => DepthRecommendation> = {
  "current (c<=2 AND i<=2)": (c, i) => (c <= 2 && i <= 2 ? "gist" : "explore"),
  "c<=2 OR i<=2": (c, i) => (c <= 2 || i <= 2 ? "gist" : "explore"),
  "c<=2 only": (c, i) => (c <= 2 ? "gist" : "explore"),
  "c+i <= 5": (c, i) => (c + i <= 5 ? "gist" : "explore"),
  "c+i <= 6": (c, i) => (c + i <= 6 ? "gist" : "explore"),
};

async function runCase(c: Case): Promise<Row | { error: string; question: string }> {
  try {
    const result = await interpret(c.question);
    if (result.kind !== "full") {
      return { error: "unexpected factoid short-circuit", question: c.question };
    }
    return {
      question: c.question,
      complexity: result.complexity,
      importance: result.importance,
      expectedDepth: c.expectedDepth,
      note: c.note,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err), question: c.question };
  }
}

async function main() {
  const results: Row[] = [];
  const errors: Array<{ error: string; question: string }> = [];

  for (const [i, c] of CASES.entries()) {
    if (i > 0) await sleep(40000); // Groq free-tier rate-limit pacing, same as eval-archetypes.ts

    console.log(`[${i + 1}/${CASES.length}] ${c.question}`);
    let outcome = await runCase(c);

    if ("error" in outcome) {
      console.log(`  error: ${outcome.error} — retrying once after a longer cooldown`);
      await sleep(60000);
      outcome = await runCase(c);
    }

    if ("error" in outcome) {
      console.log(`  still failing, skipping: ${outcome.error}`);
      errors.push(outcome);
    } else {
      results.push(outcome);
    }

    writeFileSync(RESULTS_FILE, JSON.stringify({ results, errors }, null, 2));
  }

  if (errors.length > 0) {
    console.log(`\n${errors.length} case(s) failed after retry:`);
    for (const e of errors) console.log(`- "${e.question}": ${e.error}`);
  }

  console.table(
    results.map((r) => ({
      question: r.question.slice(0, 45),
      expected: r.expectedDepth,
      complexity: r.complexity,
      importance: r.importance,
      current: recommendDepth(r.complexity, r.importance),
    }))
  );

  console.log("\nCandidate rule accuracy against hand labels:");
  for (const [name, rule] of Object.entries(CANDIDATE_RULES)) {
    const correct = results.filter((r) => rule(r.complexity, r.importance) === r.expectedDepth).length;
    console.log(`  ${name}: ${correct}/${results.length} (${((correct / results.length) * 100).toFixed(0)}%)`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
