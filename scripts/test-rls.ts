// One-off validation: does RLS actually enforce owner-only access (docs/decisions.md §14),
// or does it just look right on paper? Creates two throwaway test users via the admin API,
// signs in as each with the anon key (same access a real browser client would have), and
// checks isolation empirically. Cleans up the test users at the end either way.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

function assert(condition: boolean, message: string) {
  console.log(condition ? `ok: ${message}` : `FAILED: ${message}`);
  if (!condition) process.exitCode = 1;
}

async function signInAs(email: string, password: string) {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

async function main() {
  const password = "test-password-" + Math.random().toString(36).slice(2);
  const emailA = `rls-test-a-${Date.now()}@curious.local`;
  const emailB = `rls-test-b-${Date.now()}@curious.local`;

  const { data: userA, error: errA } = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
  });
  const { data: userB, error: errB } = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
  });
  if (errA || errB) throw errA || errB;

  try {
    const clientA = await signInAs(emailA, password);
    const clientB = await signInAs(emailB, password);

    // A inserts their own question — should succeed.
    const { data: inserted, error: insertErr } = await clientA
      .from("questions")
      .insert({
        user_id: userA.user.id,
        source: "user",
        question: "rls test question",
        archetype: "open-ended-conceptual",
        intent: "understand",
        complexity: 1,
        difficulty: 1,
        importance: 1,
        depth_recommendation: "gist",
        content: { kind: "tree", root: { label: "x", detail: "x", children: [] } },
      })
      .select()
      .single();
    assert(!insertErr && !!inserted, `A can insert their own question (${insertErr?.message ?? "ok"})`);

    // A trying to insert as source='seed' — should be rejected by RLS.
    const { error: seedInsertErr } = await clientA.from("questions").insert({
      user_id: null,
      source: "seed",
      question: "sneaky seed row",
      archetype: "open-ended-conceptual",
      intent: "understand",
      complexity: 1,
      difficulty: 1,
      importance: 1,
      depth_recommendation: "gist",
      content: { kind: "tree", root: { label: "x", detail: "x", children: [] } },
    });
    assert(!!seedInsertErr, "A CANNOT insert a source='seed' row (RLS should reject this)");

    // A trying to insert a row claiming to be someone else — should be rejected.
    const { error: spoofErr } = await clientA.from("questions").insert({
      user_id: userB.user.id,
      source: "user",
      question: "spoofed row",
      archetype: "open-ended-conceptual",
      intent: "understand",
      complexity: 1,
      difficulty: 1,
      importance: 1,
      depth_recommendation: "gist",
      content: { kind: "tree", root: { label: "x", detail: "x", children: [] } },
    });
    assert(!!spoofErr, "A CANNOT insert a row with someone else's user_id (RLS should reject this)");

    // A can read their own row back.
    const { data: ownRead } = await clientA.from("questions").select("*").eq("id", inserted!.id);
    assert((ownRead?.length ?? 0) === 1, "A can read their own row back");

    // B should NOT be able to read A's row — by direct id lookup or by listing.
    const { data: bDirectRead } = await clientB.from("questions").select("*").eq("id", inserted!.id);
    assert((bDirectRead?.length ?? 0) === 0, "B CANNOT read A's row by direct id lookup");

    const { data: bList } = await clientB.from("questions").select("*");
    assert((bList?.length ?? 0) === 0, "B's own question list is empty (doesn't include A's row)");

    // Admin (service role) can see it regardless — this is what the recommendations API relies on.
    const { data: adminRead } = await admin.from("questions").select("*").eq("id", inserted!.id);
    assert((adminRead?.length ?? 0) === 1, "service_role client CAN read A's row (bypasses RLS as expected)");

    console.log("\nRLS validation complete.");
  } finally {
    // Cleanup — delete test users (cascades to their questions via the FK).
    await admin.auth.admin.deleteUser(userA.user.id);
    await admin.auth.admin.deleteUser(userB.user.id);
    console.log("Cleaned up test users.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
