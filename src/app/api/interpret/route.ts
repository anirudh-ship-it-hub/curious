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
    const result = await interpret(question.trim());

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

    // Follow-up expands the existing graph (docs/engineering.md) — only when the client says
    // this question came from an existing node the user was just looking at.
    if (typeof parentQuestionId === "string" && parentQuestionId) {
      const { error: edgeError } = await supabase.from("concept_edges").insert({
        user_id: user.id,
        from_question_id: parentQuestionId,
        to_question_id: inserted.id,
      });
      if (edgeError) console.error("concept edge error:", edgeError);
    }

    // Implicit taste signal — "questions asked" writes to the motif-count store (§3/§11).
    await incrementMotifCounts(supabase, user.id, result.motifTags);

    return NextResponse.json({ ...result, id: inserted.id });
  } catch (error) {
    console.error("interpret error:", error);
    return NextResponse.json({ error: "Failed to interpret question" }, { status: 500 });
  }
}
