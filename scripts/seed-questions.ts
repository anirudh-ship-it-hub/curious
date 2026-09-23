// Seeds the shared candidate pool for cold-start recommendations (source='seed', user_id=null
// — see supabase/schema.sql). Reuses the already-validated question list from
// eval-archetypes.ts rather than hand-authoring separate seed content, and runs each through
// the real interpret() pipeline so seed content has the exact same shape/quality as organic
// user questions. Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS — server-only, never
// exposed to the client) since seed rows have no owner a normal user policy could match.
// Run: npm run seed
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { interpret } from "../src/lib/ai/interpret";
import { CASES } from "./eval-archetypes";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  return createClient(url, key);
}

async function main() {
  const supabase = getServiceClient();
  const questions = CASES.map((c) => c.question);

  for (const [i, question] of questions.entries()) {
    if (i > 0) await sleep(40000); // same Groq rate-limit pacing as the eval scripts

    console.log(`[${i + 1}/${questions.length}] ${question}`);
    const result = await interpret(question);

    if (result.kind !== "full") {
      console.log(`  skipped — came back as "${result.kind}", not substantive enough to seed`);
      continue;
    }

    const { error } = await supabase.from("questions").insert({
      user_id: null,
      source: "seed",
      question: result.question,
      archetype: result.archetype,
      intent: result.intent,
      complexity: result.complexity,
      difficulty: result.difficulty,
      importance: result.importance,
      depth_recommendation: result.depthRecommendation,
      content: result.content,
      dependencies: result.dependencies,
      motif_tags: result.motifTags,
      core_takeaways: result.coreTakeaways,
      follow_up_predictions: result.followUpPredictions,
      has_visual_potential: result.hasVisualPotential,
      total_tokens: result.totalTokens,
    });

    if (error) {
      console.error(`  insert failed: ${error.message}`);
    } else {
      console.log(`  seeded (archetype=${result.archetype}, motifs=${result.motifTags.join(", ")})`);
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
