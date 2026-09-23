import { generateObject, NoObjectGeneratedError, APICallError } from "ai";
import { getInterpretationModel } from "./provider";
import {
  FactoidCheckSchema,
  InterpretationSchema,
  MakeItStickEvalSchema,
  SafetyCheckSchema,
  type Interpretation,
  type MakeItStickEval,
} from "./schema";
import { recommendDepth, type DepthRecommendation } from "./depth";

export type InterpretResult =
  | { kind: "safety"; question: string; message: string }
  | { kind: "factoid"; question: string; answer: string }
  | ({ kind: "full"; question: string; depthRecommendation: DepthRecommendation; totalTokens: number } & Interpretation);

// KIRAN (India's national mental health helpline, Ministry of Social Justice and Empowerment)
// named explicitly since the beta cohort is India-based; kept alongside the generic fallback
// so the message still holds up if a future user is elsewhere.
const SAFE_RESPONSE_MESSAGE =
  "This isn't something Curious can help with directly. If you're going through something difficult, please reach out for support — you don't have to deal with this alone. In India, KIRAN (the government's mental health helpline) is free and available 24/7: 1800-599-0019. Outside India, please contact a local crisis helpline or mental health professional.";

// Backstop for whatever the safety pre-filter doesn't catch (e.g. violence/weapons
// instruction-seeking, deliberately left to the provider's own refusal behavior rather than a
// second dedicated flag — see conversation history for the scope decision).
//
// Found via a real bug (docs/engineering.md, 2026-09-18): the previous version matched on the
// AI SDK's generic "failed to generate JSON" MESSAGE, which fires for any malformed/truncated
// response — not just genuine refusals. During a rate-limited seeding batch, a benign question
// ("python vs javascript for a beginner") hit this generic failure and got silently mapped to
// the crisis-helpline message, mislabeling a technical hiccup as a safety refusal. Reproduced
// clean 3/3 outside the rate-limited batch, confirming it wasn't a real classification issue.
//
// Fix: inspect the actual raw text the model produced instead of guessing from an error
// message string. Two different shapes carry it, depending on how the failure surfaces:
// - NoObjectGeneratedError (AI SDK's own wrapping) exposes it as `.text`.
// - Groq (and other OpenAI-compatible providers) instead fail the HTTP call outright with a
//   400 `json_validate_failed` APICallError, whose response body carries the raw model output
//   under `error.failed_generation` — this is what the actual weapons-refusal case throws, and
//   what the eval below is checking against.
// A genuine refusal reads as refusal prose ("I'm sorry, I can't help with that..."); a
// truncated/malformed JSON response (the real cause of the python-vs-JS misfire) does not —
// so the latter now correctly rethrows as a real error instead of being swallowed into a wrong
// "safety" result.
function extractFailedGenerationText(err: unknown): string | undefined {
  if (NoObjectGeneratedError.isInstance(err)) return err.text;
  if (APICallError.isInstance(err) && typeof err.responseBody === "string") {
    try {
      const body = JSON.parse(err.responseBody);
      return body?.error?.failed_generation;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function isRefusalShapedError(err: unknown): boolean {
  if (NoObjectGeneratedError.isInstance(err) && err.finishReason === "content-filter") return true;
  const raw = extractFailedGenerationText(err);
  if (!raw) return false;
  // Normalize curly apostrophes (models routinely write "I'm"/"can't" as U+2019, not U+0027) —
  // without this the pattern below silently never matches real refusal prose.
  const text = raw.trim().toLowerCase().replace(/[‘’]/g, "'");
  return /^(i can(no|')t|i am (not able|unable)|i'm (sorry|not able)|i won'?t)\b/.test(text);
}

// The core pipeline (docs/engineering.md), with a safety pre-filter ahead of it:
//   question -> safety check -> (short-circuit) OR
//   factoid pre-filter -> (short-circuit) OR full interpretation -> depth recommendation
// Three AI calls in the worst case (safety, factoid, interpretation) — more than the "one call"
// cost philosophy for the interpretation step itself, but each pre-filter call is cheap and this
// mirrors the pattern the factoid pre-filter already established.
export async function interpret(question: string): Promise<InterpretResult> {
  const model = getInterpretationModel();
  // Sum of prompt+completion tokens across every AI call this invocation actually makes —
  // the "AI cost per user/session" diagnostic KPI (docs/decisions.md §5). Only meaningful for
  // the "full" result: safety/factoid short-circuits aren't persisted anywhere today, so their
  // (small) token cost has nowhere to be stored — a known, flagged gap, not silently dropped.
  let totalTokens = 0;

  try {
    const { object: safetyCheck, usage: safetyUsage } = await generateObject({
      model,
      schema: SafetyCheckSchema,
      prompt: `You are a safety classifier for a content-moderation system — you are not answering the question, only classifying it.\n\nQuestion: "${question}"\n\nIs this asking HOW to carry out self-harm or suicide (methods, means, dosages, instructions)? Do not over-flag legitimate curiosity about causes, psychology, prevention, or support.`,
    });
    totalTokens += safetyUsage.totalTokens ?? 0;

    if (safetyCheck.isSelfHarmMethodSeeking) {
      return { kind: "safety", question, message: SAFE_RESPONSE_MESSAGE };
    }

    const { object: factoidCheck, usage: factoidUsage } = await generateObject({
      model,
      schema: FactoidCheckSchema,
      prompt: `Question: "${question}"\n\nIs this a single-fact lookup with one short, unambiguous correct answer? If so, answer it directly. If it benefits from explanation, has multiple facets, or is open-ended, it is NOT a factoid.`,
    });
    totalTokens += factoidUsage.totalTokens ?? 0;

    if (factoidCheck.isFactoid && factoidCheck.quickAnswer) {
      return { kind: "factoid", question, answer: factoidCheck.quickAnswer };
    }

    const { object: interpretation, usage: interpretationUsage } = await generateObject({
      model,
      schema: InterpretationSchema,
      prompt: buildInterpretationPrompt(question),
    });
    totalTokens += interpretationUsage.totalTokens ?? 0;

    return {
      kind: "full",
      question,
      depthRecommendation: recommendDepth(interpretation.complexity, interpretation.importance),
      totalTokens,
      ...interpretation,
    };
  } catch (err) {
    if (isRefusalShapedError(err)) {
      return { kind: "safety", question, message: SAFE_RESPONSE_MESSAGE };
    }
    throw err;
  }
}

function buildInterpretationPrompt(question: string): string {
  return `You are the interpretation layer for Curious, a curiosity-driven learning app. Analyze this question and produce a structured knowledge object.

Question: "${question}"

Guidance:
- archetype: pick the single best fit from the 7 options. Three easily-confused ones:
  - "process-mechanism" — how something works or how to do it, as a ONE-DIRECTIONAL sequence of steps that runs once through and ends (e.g. an engine's four-stroke cycle, changing a tire). Steps can mechanically cause the next step — that alone does not make it causal.
  - "causal" — "why did X happen": multiple, often independent, contributing factors that combined to cause a past event or outcome. Not a repeating process; a one-time explanation.
  - "system" — ONGOING interacting parts with feedback: something that keeps regulating, balancing, or responding to itself over time (a thermostat, an ecosystem, the immune system, a market). The signature is a loop or a part that affects multiple other parts, not a sequence that finishes. If regulation, balance, or continuous feedback is the actual point of the question, it's system, not process-mechanism.
  Archetypes 1-6 are specific renderings; only use open-ended-conceptual as a genuine last resort, and justify why 1-6 don't fit.
- content: if archetype is causal or system, use kind="graph" — nodes plus explicit edges with a relation label, showing a node affecting MULTIPLE other nodes or a feedback loop wherever the real content actually has that shape (don't force one that isn't there). Otherwise use kind="tree" — a root node with nested children shaped naturally for the archetype (ordered steps, chronological periods, comparison dimensions, hierarchy levels).
- Be concrete, not just correct. Real beta feedback: content was reading as accurate but vague — technically-right sentences with nothing a reader could actually picture or hold onto. Ground every node's detail in a specific real example, number, comparison, or scenario wherever one would clarify it, not a correctly-worded abstraction. Test: could you show this sentence to someone with zero background and have them go "oh, like ___" — if not, it's too abstract. This is the difference between a great explainer and a textbook, at every depth, not just Explore.
- complexity/difficulty/importance: rate independently, 1-5 each. Don't default everything to the middle.
- dependencies: name concrete prerequisite or closely related concepts (not vague topics).
- motifTags: pick abstract THEMATIC patterns (e.g. why this event/topic rhymes with others), not surface topic categories.
- coreTakeaways: the 2-4 things someone must actually grasp — these become the rubric for a later retrieval-practice check, so make them specific and falsifiable, not vague platitudes.
- followUpPredictions: questions a genuinely curious person would naturally ask next.`;
}

// Make It Stick evaluation — a separate call by design (docs/engineering.md cost philosophy:
// additional calls only for genuinely dynamic needs). Rubric-check only, never open grading.
export async function evaluateMakeItStick(
  coreTakeaways: string[],
  userExplanation: string
): Promise<MakeItStickEval> {
  const model = getInterpretationModel();

  const { object } = await generateObject({
    model,
    schema: MakeItStickEvalSchema,
    prompt: `A learner was asked to explain a topic in their own words as a retrieval-practice exercise.

Core takeaways they needed to demonstrate:
${coreTakeaways.map((t, i) => `${i + 1}. ${t}`).join("\n")}

What they wrote:
"""
${userExplanation}
"""

For EACH core takeaway above, judge whether their explanation demonstrates it (covered) or not (missed), with a confidence score and one short sentence of feedback. Be a fair but honest evaluator — don't mark something covered just because a related word appears; it must show actual understanding of that specific point.`,
  });

  return object;
}
