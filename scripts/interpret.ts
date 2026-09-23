// Terminal test harness for the interpretation pipeline — no UI needed to exercise it.
// Usage: npm run interpret -- "why did the Roman Empire collapse"
import { config } from "dotenv";
config({ path: ".env.local" });
import { interpret } from "../src/lib/ai/interpret";

async function main() {
  const question = process.argv.slice(2).join(" ").trim();
  if (!question) {
    console.error('Usage: npm run interpret -- "your question here"');
    process.exit(1);
  }

  console.log(`Provider: ${process.env.AI_PROVIDER ?? "groq"} (set AI_PROVIDER to switch)\n`);
  console.log(`Question: ${question}\n`);

  const result = await interpret(question);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
