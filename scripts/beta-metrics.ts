// Computes the §5 short-term diagnostic KPIs (docs/decisions.md) for the weekly beta
// check-in (§6) — a plain report, not a dashboard. Consistent with the project's own
// "don't over-engineer infrastructure for a ~10-person beta" rule: these are read-only
// aggregation queries against the service-role client, run on demand, not a standing service.
// Run: npm run metrics
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

// Two consecutive questions more than this apart count as separate "sessions" — a heuristic,
// not a tracked concept (no session boundary is stored anywhere yet). Tunable placeholder,
// same status as the depth/bandit thresholds elsewhere in this codebase.
const SESSION_GAP_MS = 30 * 60 * 1000;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  return createClient(url, key);
}

function countSessions(timestampsMs: number[]): number {
  if (timestampsMs.length === 0) return 0;
  const sorted = [...timestampsMs].sort((a, b) => a - b);
  let sessions = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > SESSION_GAP_MS) sessions++;
  }
  return sessions;
}

function pct(n: number, total: number): string {
  return total === 0 ? "n/a" : `${((n / total) * 100).toFixed(0)}%`;
}

async function main() {
  const admin = getServiceClient();

  const { data: users } = await admin.auth.admin.listUsers();
  const { data: ownQuestions } = await admin
    .from("questions")
    .select("id, user_id, created_at, total_tokens")
    .eq("source", "user");
  const { data: edges } = await admin.from("concept_edges").select("from_question_id");
  const { data: recLog } = await admin
    .from("recommendation_log")
    .select("user_id, clicked_at, follow_up_asked, thumbs_up, reward");
  const { data: depthViews } = await admin.from("depth_views").select("user_id, depth");

  console.log("=== Curious beta metrics — docs/decisions.md §5 ===\n");

  // 1. Curiosity Continuation Rate — proxy: % of a user's own questions that led to at least
  // one follow-up (has an outgoing concept_edge). No session-boundary infra exists yet, so this
  // is measured per-question rather than per-session; flagged, not silently assumed equivalent.
  const followUpSourceIds = new Set((edges ?? []).map((e) => e.from_question_id as string));
  const continuationEligible = (ownQuestions ?? []).length;
  const continuationHits = (ownQuestions ?? []).filter((q) => followUpSourceIds.has(q.id as string)).length;
  console.log("1. Curiosity Continuation Rate (proxy: % of asked questions with >=1 follow-up)");
  console.log(`   ${pct(continuationHits, continuationEligible)} (${continuationHits}/${continuationEligible})\n`);

  // 2. Knowledge Expansion Rate — distinct concepts (questions) touched, per user.
  const byUser = new Map<string, { questions: number[]; tokens: number }>();
  for (const q of ownQuestions ?? []) {
    const uid = q.user_id as string;
    const entry = byUser.get(uid) ?? { questions: [], tokens: 0 };
    entry.questions.push(new Date(q.created_at as string).getTime());
    entry.tokens += (q.total_tokens as number | null) ?? 0;
    byUser.set(uid, entry);
  }
  console.log("2. Knowledge Expansion Rate (distinct questions asked, per user)");
  for (const [uid, entry] of byUser) {
    const email = users?.users.find((u) => u.id === uid)?.email ?? uid;
    console.log(`   ${email}: ${entry.questions.length}`);
  }
  console.log();

  // 3. Recommendation acceptance rate — doubles as the bandit's reward signal.
  const shown = recLog?.length ?? 0;
  const clicked = (recLog ?? []).filter((r) => r.clicked_at !== null).length;
  const followedUp = (recLog ?? []).filter((r) => r.follow_up_asked).length;
  const thumbsUp = (recLog ?? []).filter((r) => r.thumbs_up === true).length;
  const thumbsDown = (recLog ?? []).filter((r) => r.thumbs_up === false).length;
  const rewards = (recLog ?? []).map((r) => r.reward).filter((r): r is number => r !== null);
  const avgReward = rewards.length > 0 ? rewards.reduce((a, b) => a + b, 0) / rewards.length : null;
  console.log("3. Recommendation acceptance rate");
  console.log(`   shown: ${shown}, clicked: ${pct(clicked, shown)}, led to follow-up: ${pct(followedUp, shown)}`);
  console.log(`   thumbs up: ${pct(thumbsUp, shown)}, thumbs down: ${pct(thumbsDown, shown)}`);
  console.log(`   avg reward (of ${rewards.length} engaged): ${avgReward !== null ? avgReward.toFixed(2) : "n/a"}\n`);

  // 4. Depth-selection distribution — Gist vs Explore vs Stick MIX of what was actually viewed
  // (questions.depth_recommendation is only what the AI suggested, not what was looked at).
  const depthCounts = { gist: 0, explore: 0, stick: 0 };
  for (const v of depthViews ?? []) depthCounts[v.depth as "gist" | "explore" | "stick"]++;
  const depthTotal = depthCounts.gist + depthCounts.explore + depthCounts.stick;
  console.log("4. Depth-selection distribution (actually viewed, via depth_views)");
  console.log(
    `   gist: ${pct(depthCounts.gist, depthTotal)}, explore: ${pct(depthCounts.explore, depthTotal)}, stick: ${pct(depthCounts.stick, depthTotal)} (n=${depthTotal})\n`
  );

  // 5. AI cost per user/session — raw tokens, not a fabricated $ figure (Groq free-tier by
  // default per docs/engineering.md's cost philosophy — a $ estimate would currently mean $0
  // regardless of usage, which isn't a useful number to report). Make It Stick's evaluation
  // call isn't included — no persistence for those attempts yet, a known gap.
  console.log("5. AI cost per user (total tokens across safety+factoid+full-interpretation calls)");
  console.log("   NOTE: excludes Make It Stick evaluation calls (not yet persisted). Raw tokens, not $ — see script comment.");
  for (const [uid, entry] of byUser) {
    const email = users?.users.find((u) => u.id === uid)?.email ?? uid;
    const sessions = countSessions(entry.questions);
    console.log(`   ${email}: ${entry.tokens} tokens total, ~${Math.round(entry.tokens / Math.max(sessions, 1))}/session`);
  }
  console.log();

  // 6. Raw per-user activity traces — sessions (heuristic, see SESSION_GAP_MS), questions,
  // distinct days active. Explicitly not DAU/WAU/MAU percentages (§5: noise at n=10).
  console.log(`6. Raw per-user activity traces (session = gap > ${SESSION_GAP_MS / 60000}min heuristic, not tracked infra)`);
  for (const [uid, entry] of byUser) {
    const email = users?.users.find((u) => u.id === uid)?.email ?? uid;
    const days = new Set(entry.questions.map((t) => new Date(t).toDateString())).size;
    console.log(`   ${email}: ${entry.questions.length} questions, ~${countSessions(entry.questions)} sessions, ${days} distinct days active`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
