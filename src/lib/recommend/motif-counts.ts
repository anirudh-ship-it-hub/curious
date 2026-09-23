import type { SupabaseClient } from "@supabase/supabase-js";

// Implicit taste signal — "questions asked" writes to the per-user motif-count store
// (docs/decisions.md §3, extended by §11 for the explicit thumbs path — a thumbs-down on
// recommended content calls this with a negative amount). Simple read-then-write increment,
// not atomic — fine at 10-user beta concurrency. A real increment (Postgres function or SQL
// fragment) would be needed at higher concurrency; noted, not built, since recency-weighting
// itself is already an explicitly deferred build-and-tune detail.
export async function incrementMotifCounts(
  supabase: SupabaseClient,
  userId: string,
  motifs: string[],
  amount = 1
) {
  for (const motif of motifs) {
    const { data: existing } = await supabase
      .from("motif_counts")
      .select("count")
      .eq("user_id", userId)
      .eq("motif", motif)
      .maybeSingle();

    // Floored at 0 — a "count" going negative has no interpretable meaning, and §11 explicitly
    // scopes a single thumbs-down as a small nudge, not something that should overdraw a motif
    // the user otherwise has no history with.
    const nextCount = Math.max(0, (existing?.count ?? 0) + amount);

    await supabase.from("motif_counts").upsert({
      user_id: userId,
      motif,
      count: nextCount,
      updated_at: new Date().toISOString(),
    });
  }
}
