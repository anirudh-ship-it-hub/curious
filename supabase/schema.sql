-- Curious — schema.
-- Identity model: Supabase magic-link email auth (auth.users), decided 2026-09-14.
-- Recommendation engine scope decided 2026-09-15: motif matching + graph traversal +
-- epsilon-greedy bandit (docs/decisions.md §3), candidate pool = shared across all beta users
-- plus a curated seed set for cold start (see scripts/seed-questions.ts).
-- Thumbs feedback routing (docs/decisions.md §11, added 2026-09-15): recommended-content
-- thumbs are a taste signal (recommendation_log.thumbs_up, feeds motif_counts); self-asked
-- content thumbs are a quality signal only (content_feedback, never touches motif_counts).
-- Cross-user read access (docs/decisions.md §14, added 2026-09-15): RLS is owner-only on
-- questions/concept_edges, full stop — no client ever reads another user's or seed content
-- directly. The recommendations API (service_role, server-side) is the sole path for any
-- content the current user doesn't own, and returns it inline rather than by reference.
--
-- Run this whole file once in the Supabase SQL Editor on a fresh project.

create extension if not exists pgcrypto; -- gen_random_uuid()

-- One row per interpret() call — a node in the knowledge graph. Stores the full structured
-- knowledge object so past questions render instantly without re-calling AI.
-- user_id is nullable: null means a curated seed question (source='seed'), not owned by any
-- particular beta user, only ever written by the seed script via the service_role key.
-- RLS below is owner-only, no exceptions (docs/decisions.md §14) — any UI that renders content
-- the current user doesn't own (a recommendation, a friend's question, seed content) MUST get
-- it from the recommendations API's inline response, never from an independent client query.
create table questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  source text not null default 'user' check (source in ('user', 'seed')),
  question text not null,
  archetype text not null,
  intent text not null,
  complexity smallint not null,
  difficulty smallint not null,
  importance smallint not null,
  depth_recommendation text not null,
  content jsonb not null, -- the tree | graph KnowledgeContent union, rendered client-side
  dependencies text[] not null default '{}', -- informational concept names, NOT graph edges
  motif_tags text[] not null default '{}',
  core_takeaways text[] not null default '{}',
  follow_up_predictions text[] not null default '{}',
  has_visual_potential boolean not null default false,
  created_at timestamptz not null default now(),
  -- Sum of prompt+completion tokens across the AI calls that produced this row (safety
  -- pre-filter + factoid pre-filter + full interpretation) — the "AI cost per user/session"
  -- diagnostic KPI (docs/decisions.md §5). Nullable: rows persisted before this column existed
  -- have no data, and Make It Stick's evaluation call isn't included (no persistence table for
  -- those attempts yet) — a known, flagged gap, not silently pretended away.
  total_tokens integer,
  constraint seed_has_no_owner check (source <> 'seed' or user_id is null)
);

create index questions_user_id_idx on questions (user_id, created_at desc);
create index questions_motif_tags_idx on questions using gin (motif_tags);

-- Edges in the concept-dependency graph (docs/engineering.md: "concept graph edges"), used by
-- the recommendation engine's "adjacent" slot (one-hop traversal). Created only when a
-- follow-up question is actually asked and answered — connecting two real nodes someone has
-- actually explored. The `dependencies` list on a single node is NOT auto-materialized into
-- edges, since most of those concepts won't have been asked about yet as their own question.
create table concept_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  from_question_id uuid not null references questions (id) on delete cascade,
  to_question_id uuid not null references questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_question_id, to_question_id)
);

create index concept_edges_from_idx on concept_edges (from_question_id);
create index concept_edges_to_idx on concept_edges (to_question_id);

-- Per-user motif counts for the "relevant" recommendation slot (content-based motif matching,
-- docs/decisions.md §3). Recency-weighting (decay) is explicitly deferred — exact decay
-- formula is a build-and-tune-with-real-data detail like the depth thresholds, not locked yet.
-- For now this is a plain running count; decay logic lands once real usage data exists.
create table motif_counts (
  user_id uuid not null references auth.users (id) on delete cascade,
  motif text not null,
  count real not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, motif)
);

-- Shown/engaged log — the reward signal for the epsilon-greedy bandit (docs/engineering.md)
-- and the "recommendation acceptance rate" KPI (decisions.md §5). thumbs_up is the explicit
-- micro-active feedback signal from decisions.md §6, layered on top of implicit engagement.
create table recommendation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  slot text not null check (slot in ('relevant', 'adjacent', 'wildcard')),
  shown_at timestamptz not null default now(),
  clicked_at timestamptz,
  follow_up_asked boolean not null default false,
  thumbs_up boolean, -- null = no explicit feedback given
  reward real -- computed via computeReward() at the time engagement is recorded
);

create index recommendation_log_user_id_idx on recommendation_log (user_id, shown_at desc);

-- Thumbs feedback on SELF-ASKED content only (docs/decisions.md §11) — deliberately a
-- separate table from recommendation_log, not a shared one, because these two are NOT the
-- same signal: this is a content-quality complaint (wrong/unclear/too long), never a taste
-- signal, and must never touch motif_counts. Recommended-content thumbs use
-- recommendation_log.thumbs_up instead (that IS a taste signal, and legitimately touches
-- motif_counts). Logged for eval-set review and beta check-ins, not for personalization.
-- One row per (user, question) — a persistent thumbs state per content item, not an event
-- log, matching the "small thumbs up/down control" being a toggle a person can change their
-- mind on, not an append-only click stream.
create table content_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  thumbs_up boolean not null,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index content_feedback_user_id_idx on content_feedback (user_id, created_at desc);

-- Explicit "save for later" bookmark (added 2026-09-23) — deliberately separate from
-- content_feedback: a save is "I want this again," not a quality judgment, and separate from
-- recommendation_log: it must survive independently of engagement/bandit bookkeeping and cover
-- self-asked questions too, which never get a recommendation_log row at all. question_id is
-- intentionally NOT restricted to rows the saving user owns — most saves will be recommended/
-- seed content (docs/decisions.md §14: read access for that content still goes through the
-- service-role recommendations-style path, only the save/unsave row itself is a plain per-user
-- table). One row per (user, question) — saving is a toggle, not an event log.
create table saved_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index saved_questions_user_id_idx on saved_questions (user_id, created_at desc);

-- Which depth (Gist/Explore/Make It Stick) a user actually viewed for a given question — the
-- "depth-selection distribution" diagnostic KPI (docs/decisions.md §5). Without this there is
-- no stored signal for what was actually looked at, only what the AI recommended
-- (questions.depth_recommendation) — a real instrumentation gap, added 2026-09-18. One row per
-- (user, question, depth) — a depth either has been viewed or hasn't; repeated toggling
-- between tabs shouldn't inflate the distribution.
create table depth_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  depth text not null check (depth in ('gist', 'explore', 'stick')),
  viewed_at timestamptz not null default now(),
  unique (user_id, question_id, depth)
);

create index depth_views_user_id_idx on depth_views (user_id, viewed_at desc);

-- Beta-scoped feedback box (docs/decisions.md §20, a deliberate, scoped reversal of §6's
-- "no in-app feedback infrastructure" — a lightweight open-text box for pointed beta feedback,
-- not the rating/survey system §6 was avoiding). Plain insert log, no status/reply workflow —
-- read directly by the founder during the existing weekly check-in ritual, not a support queue.
create table beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index beta_feedback_user_id_idx on beta_feedback (user_id, created_at desc);

-- Row Level Security.
alter table questions enable row level security;
alter table concept_edges enable row level security;
alter table motif_counts enable row level security;
alter table recommendation_log enable row level security;
alter table content_feedback enable row level security;
alter table depth_views enable row level security;
alter table saved_questions enable row level security;

-- questions: a client can read ONLY its own rows — nothing else, no carve-out, not even
-- source='seed'. One rule, no exceptions to remember later (docs/decisions.md §14).
-- Everything that isn't the current user's own content — seed content, another user's
-- question, an adjacent/relevant recommendation — is read server-side (service_role, bypasses
-- RLS) by the recommendations API route, which returns the FULL content payload inline in its
-- response. The client renders directly from that response and never independently re-queries
-- Supabase for a row it doesn't own — "was this legitimately served to me" and "can I render
-- it" are the same fact by construction, not two things that can drift out of sync.
create policy "users read their own questions" on questions
  for select to authenticated using (auth.uid() = user_id);

create policy "users insert only their own questions" on questions
  for insert to authenticated with check (auth.uid() = user_id and source = 'user');

create policy "users update their own questions" on questions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users delete their own questions" on questions
  for delete to authenticated using (auth.uid() = user_id);

-- concept_edges: same rule as questions — own rows only via the client SDK. Full-graph
-- adjacency traversal (any beta user's follow-up connections) happens server-side via
-- service_role, and results come back as part of the recommendations API's inline payload.
create policy "users read their own concept edges" on concept_edges
  for select to authenticated using (auth.uid() = user_id);

create policy "users manage their own concept edges" on concept_edges
  for insert to authenticated with check (auth.uid() = user_id);

-- motif_counts: strictly per-user — this is someone's own taste profile, not shared content.
create policy "users manage their own motif counts" on motif_counts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recommendation_log: strictly per-user — nobody needs to read what was shown to someone else.
create policy "users manage their own recommendation log" on recommendation_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- content_feedback: strictly per-user — quality signal, not shared content.
create policy "users manage their own content feedback" on content_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- depth_views: strictly per-user — an internal usage-instrumentation signal, not content.
create policy "users manage their own depth views" on depth_views
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- beta_feedback: insert/read own rows only — no client needs to read anyone else's feedback.
alter table beta_feedback enable row level security;
create policy "users manage their own feedback" on beta_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- saved_questions: strictly per-user — the bookmark relationship itself, not the question
-- content (which flows through the service-role path per §14 when it isn't the user's own).
create policy "users manage their own saved questions" on saved_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
