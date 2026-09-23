import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeEpsilon, assignSlots, computeReward } from "@/lib/recommend/bandit";
import { buildCandidatePools, fillSlots } from "@/lib/recommend/candidates";
import { incrementMotifCounts } from "@/lib/recommend/motif-counts";

// §11/§19: sized relative to the organic unit that already exists — one asked question
// contributes +1 per motif (motif-counts.ts). A thumbs vote is rare and deliberate (a tap
// someone chose to make), where an asked question's motif contribution is often incidental to
// what they were actually after; a single clear vote reasonably outweighs a handful of
// incidental exposures without swamping weeks of accumulated organic signal in one tap. 4 is a
// starting pick within a defensible 3-5x range — a REASONED default (multiple of a unit
// that's already defined), not an invented number the way an isolated constant would be.
// Correction from an earlier draft of this reasoning: there is no "passive view" increment in
// this system to size against — viewing a recommended card touches nothing; only an asked
// question or an explicit thumbs vote ever writes to motif_counts.
const THUMBS_MOTIF_NUDGE = 4;
function thumbsAmount(thumbsUp: boolean | null): number {
  if (thumbsUp === true) return THUMBS_MOTIF_NUDGE;
  if (thumbsUp === false) return -THUMBS_MOTIF_NUDGE;
  return 0;
}

// Default batch size — a DERIVED constant, not a guess (CLAUDE.md: "anywhere a value can be
// computed deterministically, compute it"). Full reasoning: docs/decisions.md §18. Summary,
// deliberately keeping straight which research strand does which job rather than stretching
// all of them to look like they independently confirm the same number:
//   - Reading speed IS the load-bearing number: Brysbaert (2019), a 190-study meta-analysis of
//     18,573 participants, puts adult non-fiction reading speed at 238 wpm with comprehension
//     intact (not the popularly-cited 300 wpm). This sets real per-card reading time.
//   - AVG_WORDS_PER_GIST_CARD below is MEASURED, not assumed — actual coreTakeaways word count
//     across all real generated content at the time of writing (n=16, mean 70.4, range 52-99).
//   - FIXED_OVERHEAD_SECONDS_PER_CARD is an estimate (orienting on a new question, glancing at
//     the takeaway, deciding whether to go deeper) — flagged as such, not measured.
//   - TARGET_READING_SECONDS is a target buffer of uninterrupted scrolling before the next
//     fetch is needed — keeps fetch latency invisible without over-fetching a small beta pool.
//   - Cowan (2001)'s "~4 chunks" working-memory figure is used ONLY as MIN_BATCH_SIZE, a sanity
//     floor (fewer than that and re-fetch chatter becomes visible) — it is NOT direct evidence
//     for a feed batch size. That figure is about simultaneously-held items in the focus of
//     attention, not sequentially-scrolled feed items; treating reading-span/serial-recall
//     research as if it validated a scrolling-feed batch size would be an overclaim.
//   - Interleaving research (Samani & Pan 2021, npj Science of Learning) is real support for
//     MIXING topic types — the relevant/adjacent/wildcard slot strategy (docs/decisions.md §3)
//     — not for how many mixed items to serve per fetch. Not cited here for that reason.
//   - Vigilance-decrement research operates on session-timescale (10+ minute blocks), not
//     per-fetch timescale — it's the actual justification for the existing §10 session-length/
//     scrolls-per-session canary metric, not for sizing a single API response.
// This is a starting default, not a final answer — the §10 canary (session length,
// scrolls-per-session) is what confirms or corrects it once real usage exists, same
// relationship between a research-informed default and empirical correction as everywhere
// else in this codebase (depth thresholds, bandit epsilon decay).
const READING_WPM = 238;
const AVG_WORDS_PER_GIST_CARD = 70;
const FIXED_OVERHEAD_SECONDS_PER_CARD = 4;
const TARGET_READING_SECONDS = 120;
const MIN_BATCH_SIZE = 4;
const MAX_BATCH_SIZE = 8;

function computeDefaultBatchSize(): number {
  const secondsPerCard = (AVG_WORDS_PER_GIST_CARD / READING_WPM) * 60 + FIXED_OVERHEAD_SECONDS_PER_CARD;
  const raw = Math.round(TARGET_READING_SECONDS / secondsPerCard);
  return Math.min(MAX_BATCH_SIZE, Math.max(MIN_BATCH_SIZE, raw));
}

const DEFAULT_BATCH_SIZE = computeDefaultBatchSize();

// "Recently explored" window for the pool-exhaustion nudge (docs/decisions.md §10 addendum) —
// a rolling 24h, not a calendar-day boundary, so late-night use doesn't get cut off oddly.
const RECENTLY_EXPLORED_WINDOW_MS = 24 * 60 * 60 * 1000;
const RECENTLY_EXPLORED_LIMIT = 5;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : DEFAULT_BATCH_SIZE;

  const admin = createAdminClient();

  try {
    // Epsilon decays with the user's own question count (docs/decisions.md §3: "explore rate
    // starts high for new users, decays as query history accumulates") — count comes from
    // their own rows only, which RLS already scopes correctly on the authenticated client.
    const { count: questionCount } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Never re-show the same pool item twice (docs/decisions.md §14 consequence: content the
    // client renders always comes from a server response, so "already shown" is tracked here,
    // not inferred client-side). All-time, not windowed — fine at beta pool size; revisit if
    // the pool grows large enough that repetition becomes desirable again.
    const { data: shownRows } = await supabase.from("recommendation_log").select("question_id").eq("user_id", user.id);
    const alreadyShownIds = (shownRows ?? []).map((r) => r.question_id as string);

    const epsilon = computeEpsilon(questionCount ?? 0);
    const slots = assignSlots(limit, epsilon);
    const pools = await buildCandidatePools(admin, user.id, alreadyShownIds);
    const filled = fillSlots(slots, pools);

    // Pool exhaustion (docs/decisions.md §10 addendum, locked 2026-09-18): distinct from "this
    // batch's assigned slots happened to come up empty" — this checks whether there is
    // genuinely nothing left, anywhere in the shared pool, that this user hasn't already seen.
    // relevant/adjacent/wildcard are mutually exclusive by construction (candidates.ts filters
    // each subsequent list against the previous ones), so summing is safe.
    const poolExhausted = pools.relevant.length + pools.adjacent.length + pools.wildcard.length === 0;

    if (poolExhausted) {
      const { data: recentlyExplored } = await supabase
        .from("questions")
        .select("id, question, core_takeaways")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - RECENTLY_EXPLORED_WINDOW_MS).toISOString())
        .order("created_at", { ascending: false })
        .limit(RECENTLY_EXPLORED_LIMIT);

      return NextResponse.json({
        recommendations: [],
        poolExhausted: true,
        batchSize: limit,
        recentlyExplored: (recentlyExplored ?? []).map((r) => ({
          id: r.id,
          question: r.question,
          coreTakeaways: r.core_takeaways,
        })),
      });
    }

    if (filled.length === 0) {
      return NextResponse.json({ recommendations: [], poolExhausted: false, batchSize: limit });
    }

    const { data: inserted, error: logError } = await supabase
      .from("recommendation_log")
      .insert(
        filled.map(({ slot, candidate }) => ({
          user_id: user.id,
          question_id: candidate.id,
          slot,
        }))
      )
      .select("id, question_id, slot");

    if (logError || !inserted) {
      console.error("recommendation_log insert error:", logError);
      return NextResponse.json({ error: "Failed to log recommendations" }, { status: 500 });
    }

    const byQuestionId = new Map(filled.map(({ candidate }) => [candidate.id, candidate]));
    const recommendations = inserted.map((row) => ({
      recommendationId: row.id,
      slot: row.slot,
      ...byQuestionId.get(row.question_id as string),
    }));

    return NextResponse.json({ recommendations, poolExhausted: false, batchSize: limit });
  } catch (error) {
    console.error("recommendations error:", error);
    return NextResponse.json({ error: "Failed to build recommendations" }, { status: 500 });
  }
}

// Records engagement against an already-shown recommendation and recomputes its reward
// (docs/decisions.md §3, bandit.ts computeReward). Also implements the §11 thumbs-routing
// mechanism for RECOMMENDED content specifically: a thumbs here is a real taste signal (the
// person didn't ask for it), so it writes a small nudge to the same motif_counts store
// "questions asked" already writes to, on top of feeding computeReward as before. Thumbs on
// SELF-ASKED content is the mirror case and deliberately a different endpoint
// (POST /api/content-feedback) writing to content_feedback instead — same content_id shape,
// structurally incapable of touching motif_counts, per §11's "does NOT touch the taste model."
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { recommendationId, clicked, followUpAsked, thumbsUp } = await request.json();
  if (typeof recommendationId !== "string" || !recommendationId) {
    return NextResponse.json({ error: "recommendationId is required" }, { status: 400 });
  }
  if (thumbsUp !== undefined && typeof thumbsUp !== "boolean") {
    return NextResponse.json({ error: "thumbsUp must be a boolean" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("recommendation_log")
    .select("question_id, thumbs_up, clicked_at, follow_up_asked")
    .eq("id", recommendationId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  }

  const previousThumbsUp: boolean | null = existing.thumbs_up;
  const nextThumbsUp: boolean | null = thumbsUp === undefined ? previousThumbsUp : thumbsUp;
  const nowClicked = Boolean(clicked) || existing.clicked_at !== null;
  const nowFollowUpAsked = Boolean(followUpAsked) || existing.follow_up_asked;
  const reward = computeReward({
    clicked: nowClicked,
    followUpAsked: nowFollowUpAsked,
    thumbsUp: nextThumbsUp,
  });

  const { error: updateError } = await supabase
    .from("recommendation_log")
    .update({
      clicked_at: nowClicked && !existing.clicked_at ? new Date().toISOString() : undefined,
      follow_up_asked: nowFollowUpAsked,
      thumbs_up: nextThumbsUp,
      reward,
    })
    .eq("id", recommendationId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("recommendation engagement update error:", updateError);
    return NextResponse.json({ error: "Failed to record engagement" }, { status: 500 });
  }

  // Net motif adjustment — handles first-time thumbs AND changing your mind (up->down,
  // down->up) without double-counting a value that was already applied.
  const netAdjustment = thumbsAmount(nextThumbsUp) - thumbsAmount(previousThumbsUp);
  if (netAdjustment !== 0) {
    const admin = createAdminClient();
    // Reading this question's motif_tags is a server-only, §14-compliant read of content the
    // user may not own (a recommendation) — used only to pick which motif counters to nudge,
    // never returned to the client.
    const { data: question } = await admin.from("questions").select("motif_tags").eq("id", existing.question_id).single();
    if (question?.motif_tags?.length) {
      await incrementMotifCounts(supabase, user.id, question.motif_tags, netAdjustment);
    }
  }

  return NextResponse.json({ reward });
}
