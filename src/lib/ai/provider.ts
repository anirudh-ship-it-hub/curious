import { createGroq } from "@ai-sdk/groq";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

// Provider choice is deliberately NOT locked (docs/engineering.md: "Exact AI model/provider
// choice" is an open item). Swap by setting AI_PROVIDER — nothing else in the pipeline
// depends on which one is active. Default is Groq while we're evaluating structured-output
// reliability/latency/cost against DeepSeek and Anthropic.
export type AiProvider = "groq" | "deepseek" | "anthropic";

const DEFAULT_MODELS: Record<AiProvider, string> = {
  groq: "openai/gpt-oss-120b",
  deepseek: "deepseek-chat",
  anthropic: "claude-sonnet-5",
};

export function getInterpretationModel(): LanguageModel {
  const provider = (process.env.AI_PROVIDER ?? "groq") as AiProvider;
  const model = process.env.AI_MODEL ?? DEFAULT_MODELS[provider];

  switch (provider) {
    case "groq": {
      const groq = createGroq({ apiKey: requireEnv("GROQ_API_KEY") });
      return groq(model);
    }
    case "deepseek": {
      const deepseek = createDeepSeek({ apiKey: requireEnv("DEEPSEEK_API_KEY") });
      return deepseek(model);
    }
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
      return anthropic(model);
    }
    default:
      throw new Error(`Unknown AI_PROVIDER "${provider}". Expected one of: groq, deepseek, anthropic.`);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} — set it in .env.local (see .env.example).`);
  }
  return value;
}
