// Hand-labeled eval set for archetype classification (docs/decisions.md: "Hand-labeled eval
// sets for classification tasks (archetype, motif) before shipping prompt changes.").
// Run: npm run eval:archetypes
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { interpret } from "../src/lib/ai/interpret";
import type { Archetype } from "../src/lib/ai/schema";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const RESULTS_FILE = "scripts/.eval-results.json";

interface Case {
  question: string;
  expectedArchetype: Archetype;
  expectedKind: "tree" | "graph";
  note?: string;
}

export const CASES: Case[] = [
  // process-mechanism
  { question: "how does a car engine work", expectedArchetype: "process-mechanism", expectedKind: "tree" },
  { question: "how do vaccines work", expectedArchetype: "process-mechanism", expectedKind: "tree" },

  // causal
  { question: "why did the Roman Empire collapse", expectedArchetype: "causal", expectedKind: "graph" },
  { question: "why do stock markets crash", expectedArchetype: "causal", expectedKind: "graph" },

  // timeline-historical
  { question: "brief history of the internet", expectedArchetype: "timeline-historical", expectedKind: "tree" },
  { question: "how did hip hop evolve as a genre", expectedArchetype: "timeline-historical", expectedKind: "tree" },

  // comparison
  { question: "python vs javascript for a beginner", expectedArchetype: "comparison", expectedKind: "tree" },
  { question: "renting vs buying a home", expectedArchetype: "comparison", expectedKind: "tree" },

  // system
  { question: "how does a thermostat regulate temperature", expectedArchetype: "system", expectedKind: "graph" },
  { question: "how does the human immune system work", expectedArchetype: "system", expectedKind: "graph" },

  // hierarchy-structure
  { question: "what is the organizational structure of the US military", expectedArchetype: "hierarchy-structure", expectedKind: "tree" },
  { question: "how is biological taxonomy structured, from kingdom to species", expectedArchetype: "hierarchy-structure", expectedKind: "tree" },

  // open-ended-conceptual (philosophical edge cases — anti-catch-all safeguard should still fire)
  { question: "what is consciousness", expectedArchetype: "open-ended-conceptual", expectedKind: "tree", note: "philosophical" },
  { question: "what is justice", expectedArchetype: "open-ended-conceptual", expectedKind: "tree", note: "philosophical" },

  // extra edge cases
  { question: "what is the meaning of life", expectedArchetype: "open-ended-conceptual", expectedKind: "tree", note: "philosophical, maximally vague" },
  { question: "how do I change a car tire", expectedArchetype: "process-mechanism", expectedKind: "tree", note: "intent should be practical-do" },
  { question: "should I buy an electric car or a gas car", expectedArchetype: "comparison", expectedKind: "tree", note: "intent should be decide" },
];

interface Row {
  question: string;
  expectedArchetype: string;
  actualArchetype: string;
  archetypeMatch: boolean;
  expectedKind: string;
  actualKind: string;
  kindMatch: boolean;
  confidence: number;
  intent: string;
  note?: string;
}

async function runCase(c: Case): Promise<Row | { error: string; question: string }> {
  try {
    const result = await interpret(c.question);
    if (result.kind !== "full") {
      return { error: "unexpected factoid short-circuit", question: c.question };
    }
    return {
      question: c.question,
      expectedArchetype: c.expectedArchetype,
      actualArchetype: result.archetype,
      archetypeMatch: result.archetype === c.expectedArchetype,
      expectedKind: c.expectedKind,
      actualKind: result.content.kind,
      kindMatch: result.content.kind === c.expectedKind,
      confidence: result.archetypeConfidence,
      intent: result.intent,
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
    if (i > 0) {
      // Groq free tier: 8000 tokens/minute (rolling window), each case uses ~4-4.3k tokens
      // across the factoid + interpretation calls, and the live site may share the budget.
      // Pace well under sustainable throughput to leave headroom.
      await sleep(40000);
    }

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
      question: r.question.slice(0, 40),
      expected: r.expectedArchetype,
      actual: r.archetypeMatch ? r.actualArchetype : `❌ ${r.actualArchetype}`,
      kind: r.kindMatch ? r.actualKind : `❌ ${r.actualKind} (exp ${r.expectedKind})`,
      conf: r.confidence.toFixed(2),
      intent: r.intent,
    }))
  );

  const archetypeAccuracy = results.filter((r) => r.archetypeMatch).length / results.length;
  const kindAccuracy = results.filter((r) => r.kindMatch).length / results.length;
  console.log(`\nArchetype accuracy: ${(archetypeAccuracy * 100).toFixed(0)}% (${results.filter((r) => r.archetypeMatch).length}/${results.length})`);
  console.log(`Content-kind accuracy: ${(kindAccuracy * 100).toFixed(0)}% (${results.filter((r) => r.kindMatch).length}/${results.length})`);

  const misses = results.filter((r) => !r.archetypeMatch || !r.kindMatch);
  if (misses.length > 0) {
    console.log("\nMisses:");
    for (const m of misses) {
      console.log(`- "${m.question}" -> expected ${m.expectedArchetype}/${m.expectedKind}, got ${m.actualArchetype}/${m.actualKind}${m.note ? ` (${m.note})` : ""}`);
    }
  }
}

// Guarded: seed-questions.ts imports CASES from this module, and without this check that
// import would silently trigger a second full eval run (module-scope side effect on import) —
// this is what doubled the Groq token usage and caused rate-limit failures during seeding.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
