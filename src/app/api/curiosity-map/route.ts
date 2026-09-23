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

  // Dedupe by normalized question text (2026-09-25 — same root cause as the Drift pool dedup,
  // a different symptom: a real person asking "game theory" twice inflated both the motif
  // bubble's size AND its question list with two identical-looking entries, visible directly
  // in the Map side panel ("shows duplicates," live screenshot). This map is meant to be "the
  // shape of what you've actually been curious about," not a literal ask-by-ask audit log, so
  // asking the same thing twice shouldn't count twice. Keeps the newest occurrence — data is
  // already created_at desc, so that's just "first seen" in iteration order.
  const seenText = new Set<string>();
  const questions = (data ?? [])
    .filter((row) => {
      const normalized = (row.question as string).trim().toLowerCase();
      if (seenText.has(normalized)) return false;
      seenText.add(normalized);
      return true;
    })
    .map((row) => ({
      id: row.id as string,
      question: row.question as string,
      motifTags: (row.motif_tags ?? []) as string[],
      coreTakeaways: (row.core_takeaways ?? []) as string[],
      createdAt: row.created_at as string,
    }));

  return NextResponse.json({ questions });
}
