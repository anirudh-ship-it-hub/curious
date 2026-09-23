import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCandidatesByIds } from "@/lib/recommend/candidates";

// "Save for later" bookmark (added 2026-09-23) — a toggle, not an engagement/quality signal
// (those are recommendation_log.thumbs_up and content_feedback respectively; saved_questions is
// deliberately its own table, see supabase/schema.sql). Works for self-asked AND recommended/
// seed content, since most of what gets saved from Drift won't be something the user owns.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: savedRows, error } = await supabase
    .from("saved_questions")
    .select("id, question_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("saved_questions list error:", error);
    return NextResponse.json({ error: "Failed to load saved items" }, { status: 500 });
  }

  const rows = savedRows ?? [];
  // Most saved questions won't belong to this user (seed/other users' content shown via
  // recommendations) — same service-role lookup as the Drift revisit list (docs/decisions.md
  // §14), not a direct client query.
  const admin = createAdminClient();
  const candidates = await fetchCandidatesByIds(
    admin,
    rows.map((r) => r.question_id as string)
  );
  const candidateById = new Map(candidates.map((c) => [c.id, c]));

  const saved = rows
    .map((r) => {
      const candidate = candidateById.get(r.question_id as string);
      if (!candidate) return null; // underlying question was deleted since being saved
      return { savedId: r.id, savedAt: r.created_at, ...candidate };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return NextResponse.json({ saved });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { questionId } = await request.json();
  if (typeof questionId !== "string" || !questionId) {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("saved_questions")
    .upsert({ user_id: user.id, question_id: questionId }, { onConflict: "user_id,question_id", ignoreDuplicates: true });

  if (error) {
    console.error("saved_questions insert error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { questionId } = await request.json();
  if (typeof questionId !== "string" || !questionId) {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("saved_questions")
    .delete()
    .eq("user_id", user.id)
    .eq("question_id", questionId);

  if (error) {
    console.error("saved_questions delete error:", error);
    return NextResponse.json({ error: "Failed to unsave" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
