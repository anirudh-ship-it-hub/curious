import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// §11: thumbs on SELF-ASKED content. Down-voting an answer you asked for isn't evidence
// against the topic you deliberately sought out — it's much more likely a complaint about
// explanation quality. Deliberately a separate table/endpoint from recommendation_log's
// thumbs_up (PATCH /api/recommendations) so this can NEVER touch motif_counts — it's a
// content-quality signal for eval-set review and beta check-ins, not personalization.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { questionId, thumbsUp } = await request.json();
  if (typeof questionId !== "string" || !questionId) {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }
  if (typeof thumbsUp !== "boolean") {
    return NextResponse.json({ error: "thumbsUp must be a boolean" }, { status: 400 });
  }

  // Must be the user's OWN question — this endpoint only exists for the self-asked case.
  // Feedback on content the user doesn't own (a recommendation) belongs to
  // PATCH /api/recommendations instead, which is the only place that's allowed to touch
  // motif_counts for a thumbs signal.
  const { data: question, error: fetchError } = await supabase
    .from("questions")
    .select("id")
    .eq("id", questionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const { error: insertError } = await supabase.from("content_feedback").upsert(
    {
      user_id: user.id,
      question_id: questionId,
      thumbs_up: thumbsUp,
    },
    { onConflict: "user_id,question_id" }
  );

  if (insertError) {
    console.error("content feedback insert error:", insertError);
    return NextResponse.json({ error: "Failed to record feedback" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
