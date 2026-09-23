import { NextResponse } from "next/server";
import { evaluateMakeItStick } from "@/lib/ai/interpret";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { coreTakeaways, userExplanation } = await request.json();

  if (!Array.isArray(coreTakeaways) || typeof userExplanation !== "string" || !userExplanation.trim()) {
    return NextResponse.json({ error: "coreTakeaways and userExplanation are required" }, { status: 400 });
  }

  try {
    const result = await evaluateMakeItStick(coreTakeaways, userExplanation.trim());
    return NextResponse.json(result);
  } catch (error) {
    console.error("make-it-stick error:", error);
    return NextResponse.json({ error: "Failed to evaluate explanation" }, { status: 500 });
  }
}
