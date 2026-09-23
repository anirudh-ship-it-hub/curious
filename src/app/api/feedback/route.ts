import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Beta-scoped feedback box (docs/decisions.md §20). Plain insert, no reply/status workflow —
// read directly during the existing weekly check-in ritual (docs/decisions.md §6), not a
// support queue.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { message } = await request.json();
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const { error } = await supabase.from("beta_feedback").insert({
    user_id: user.id,
    message: message.trim(),
  });

  if (error) {
    console.error("feedback insert error:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
