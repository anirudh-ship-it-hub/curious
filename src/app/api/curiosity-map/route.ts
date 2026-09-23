import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Node sizing intentionally comes from questions.motif_tags, not motif_counts — see the "Data
// source note" in docs/design/curiosity-map.md. motif_counts is the recommendation engine's
// internal taste-weighting table (nudged by thumbs on content the person didn't necessarily
// ask about); this map is meant to be an honest reflection of what the user actually asked, so
// it aggregates their own questions directly. RLS already scopes this to the caller's own
// rows, so no admin/service-role client is needed here (unlike the recommendations route).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("questions")
    .select("id, question, motif_tags, core_takeaways, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("curiosity-map fetch error:", error);
    return NextResponse.json({ error: "Failed to load curiosity map" }, { status: 500 });
  }

  const questions = (data ?? []).map((row) => ({
    id: row.id as string,
    question: row.question as string,
    motifTags: (row.motif_tags ?? []) as string[],
    coreTakeaways: (row.core_takeaways ?? []) as string[],
    createdAt: row.created_at as string,
  }));

  return NextResponse.json({ questions });
}
