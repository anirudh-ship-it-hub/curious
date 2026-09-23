import { NextResponse } from "next/server";
import { interpret } from "@/lib/ai/interpret";
import { createClient } from "@/lib/supabase/server";
import { incrementMotifCounts } from "@/lib/recommend/motif-counts";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { question, parentQuestionId } = await request.json();

  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  try {
    // Exact-rematch short-circuit (2026-09-25) — root-causing "duplicate content in Drift/Map":
    // real testing showed the same person re-asking the identical question (typo-for-typo)
    // created a second, fully-separate row, which the display-side dedup then had to filter
    // back out downstream. This stops the duplicate row from ever being CREATED for the exact
    // "asked the exact same thing again" case, instead of only cleaning it up after the fact —
    // also skips a redundant AI call. Scoped to the asking user's OWN history only (an
    // RLS-scoped read, no service-role needed) — reusing another user's matching content would
    // need a cross-user copy and isn't what caused the observed bug, so it's left alone.
    // ilike with no % wildcards is an exact, case-insensitive match in Postgres.
    const trimmedQuestion = question.trim();
    const { data: existing } = await supabase
      .from("questions")
      .select(
        "id, question, archetype, intent, complexity, difficulty, importance, depth_recommendation, content, dependencies, motif_tags, core_takeaways, follow_up_predictions, has_visual_potential, total_tokens"
      )
      .eq("user_id", user.id)
      .ilike("question", trimmedQuestion)
      .limit(1)
      .maybeSingle();

    let resultId: string;
    let responsePayload: Record<string, unknown>;
    let motifTagsForCount: string[];

    if (existing) {
      resultId = existing.id;
      motifTagsForCount = (existing.motif_tags ?? []) as string[];
      responsePayload = {
        kind: "full",
        id: existing.id,
        question: existing.question,
        archetype: existing.archetype,
        intent: existing.intent,
        complexity: existing.complexity,
        difficulty: existing.difficulty,
        importance: existing.importance,
        depthRecommendation: existing.depth_recommendation,
        totalTokens: existing.total_tokens ?? 0,
        content: existing.content,
        dependencies: existing.dependencies,
        motifTags: existing.motif_tags,
        coreTakeaways: existing.core_takeaways,
        followUpPredictions: existing.follow_up_predictions,
        hasVisualPotential: existing.has_visual_potential,
      };
    } else {
      const result = await interpret(trimmedQuestion);

      if (result.kind !== "full") {
        // Factoids and safety short-circuits aren't persisted as graph nodes
        // (docs/decisions.md §2: "no full archetype classification, no (or minimal) graph node").
        return NextResponse.json(result);
      }

      const { data: inserted, error: insertError } = await supabase
        .from("questions")
        .insert({
          user_id: user.id,
          source: "user",
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
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("persist question error:", insertError);
        return NextResponse.json({ error: "Failed to save question" }, { status: 500 });
      }

      resultId = inserted.id;
      motifTagsForCount = result.motifTags;
      responsePayload = { ...result, id: inserted.id };
    }

    // Follow-up expands the existing graph (docs/engineering.md) — only when the client says
    // this question came from an existing node the user was just looking at. Still recorded
    // even when content was reused above — the edge reflects real navigation, independent of
    // whether the destination content is fresh or a rematch.
    if (typeof parentQuestionId === "string" && parentQuestionId) {
      const { error: edgeError } = await supabase.from("concept_edges").insert({
        user_id: user.id,
        from_question_id: parentQuestionId,
        to_question_id: resultId,
      });
      if (edgeError) console.error("concept edge error:", edgeError);
    }

    // Implicit taste signal — "questions asked" writes to the motif-count store (§3/§11).
    // Still counted on a rematch — asking about it again is itself a real interest signal.
    await incrementMotifCounts(supabase, user.id, motifTagsForCount);

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("interpret error:", error);
    return NextResponse.json({ error: "Failed to interpret question" }, { status: 500 });
  }
}
