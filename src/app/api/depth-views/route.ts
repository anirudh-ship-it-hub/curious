import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Logs which depth (Gist/Explore/Make It Stick) a user actually viewed for a question — the
// only stored signal behind the "depth-selection distribution" diagnostic KPI (docs/decisions.md
// §5). Fire-and-forget from the client; failures here should never block reading. Upserts on
// (user_id, question_id, depth) so repeated toggling between tabs doesn't inflate the count —
// a depth either has been viewed at least once or hasn't.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { questionId, depth } = await request.json();
  if (typeof questionId !== "string" || !questionId) {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }
  if (depth !== "gist" && depth !== "explore" && depth !== "stick") {
    return NextResponse.json({ error: "depth must be gist, explore, or stick" }, { status: 400 });
  }

  const { error } = await supabase
    .from("depth_views")
    .upsert({ user_id: user.id, question_id: questionId, depth }, { onConflict: "user_id,question_id,depth", ignoreDuplicates: true });

  if (error) {
    console.error("depth view insert error:", error);
    return NextResponse.json({ error: "Failed to log depth view" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
