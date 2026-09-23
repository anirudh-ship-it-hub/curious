# Curious — Product Decisions Log (2026-09-13)

*Companion to "Curious — Complete Project Context Dump" (2026-08-11). This log records decisions made in the 2026-09-13 working session that resolve items previously marked OPEN QUESTION in that document. Same status framework applies: LOCKED/AGREED, CURRENT HYPOTHESIS, OPEN QUESTION, ICEBOX.*

## 1. Archetype list — LOCKED

Collapsed from the original 10 to 7, removing structural overlap:

1. **Process/Mechanism** — how something works or how to do it (subsumes the old "practical step flow" — a plant-care how-to and a cricket-swing explanation render identically as ordered steps, so they don't need separate archetypes).
2. **Causal** — why something happened, especially with branching/multiple causes. Distinct from #1 by rendering as a causal graph rather than a strict sequence.
3. **Timeline/Historical evolution**
4. **Comparison** — X vs. Y, including decision/trade-off questions (subsumes the old "decision/trade-off" — a decision is a comparison with a "so what do I pick" tacked on, same side-by-side rendering).
5. **System** — interacting parts, feedback loops, dynamic behavior. Distinct from #6 by being dynamic.
6. **Hierarchy/Structure** — static organizational levels or taxonomy.
7. **Open-ended/Conceptual** — genuine catch-all for definitional/philosophical queries that don't fit a clean structure.

**Additional metadata field — LOCKED:** an **intent** tag (understand / practical-do / decide) captured separately from archetype, so the "why is someone asking this" signal isn't lost even though it no longer forks the rendering pipeline.

**Anti-catch-all safeguard — LOCKED:** the classifier must justify why a query isn't archetypes 1–6 (or emit a confidence score below a set threshold) before it's allowed to default to #7 (Open-ended/Conceptual). Flagged because the classification is itself AI-driven, and unconstrained catch-all buckets are a known failure mode of AI classifiers under uncertainty.

## 2. Depth-selection mechanism (Gist / Explore / Make It Stick) — LOCKED

This was previously aspirational ("AI determines depth recommendation") with no actual rule specified — a real gap, not just an unfinished detail.

Mechanism: a cheap **factoid pre-filter** runs before archetype classification. Single-fact lookup queries (e.g. "who is India's president") short-circuit to a minimal quick-answer format and skip the full knowledge-object pipeline entirely — no full archetype classification, no (or minimal) graph node. Everything that survives the filter proceeds to full interpretation, and its **complexity + importance** metadata drives a Gist-vs-Explore default recommendation. **Make It Stick is never a default recommendation** — always user-opt-in after Explore.

**Thresholds tuned (2026-09-22)**: `complexity + importance <= 6` → gist, else explore (`src/lib/ai/depth.ts`). Chosen against a 20-question hand-labeled eval set (`npm run eval:depth`) spanning genuinely light through genuinely heavy questions — not real beta usage (none exists yet), but not a blind guess either. The previous rule (`complexity<=2 AND importance<=2`) measured only 53% against hand labels and, more importantly, had **never once produced a "gist" recommendation on any real generated content to date** — every real seeded question had importance ≥ 3, so it always fell through to explore. `c+i<=6` scored 84%, best of five candidates tried; the remaining misses are all the identical `(complexity=3, importance=4)` pair split evenly between expected gist/explore in the eval set — genuine ambiguity at that one boundary, not a rule defect. Still first-guess in the sense that no real usage data exists yet — revisit once it does.

## 3. Recommendation algorithm — LOCKED

Ruled out: pure collaborative filtering (insufficient data density at beta scale) and heavy real-time LLM reasoning as the core decision engine (nondeterministic, not eval-able, expensive).

Mechanism:
- **"Relevant" slot** — content-based matching on **curiosity motifs**: a closed taxonomy (~15–20 abstract thematic tags like collapse-and-renewal, power-dynamics, unintended-consequences) tagged by the same interpretation AI call that already produces archetype/complexity/etc., at no extra cost. This specifically solves the "Nokia/Blackberry/Roman Empire" problem the original doc raised — plain semantic embeddings of question text would NOT solve it, since they cluster on topical similarity, not thematic similarity.
- **"Adjacent" slot** — graph-traversal on the existing concept-dependency graph (one-hop neighbors of recently explored concepts). Reuses infrastructure already committed to for follow-up expansion.
- **"Wildcard" slot / explore-exploit balance** — **epsilon-greedy bandit with decay**, replacing the original fixed 3/1/1 ratio. Explore rate starts high (~50%) for new users and decays toward ~15–20% as query history accumulates. Reward signal = engagement (click, read-through, follow-up added = positive; bounce = negative). Chosen over Thompson Sampling (more principled, but less intuitive to debug) and over sticking with a fixed ratio (chosen not to, since bandits directly implement the doc's own stated goal of increasing personalization without creating a filter bubble).
- **Infrastructure**: no vector DB, no embeddings pipeline needed for the beta — plain Supabase counters per user per motif.

## 4. Make It Stick structure & evaluation — LOCKED

- **Session structure**: one retrieval-practice session per core dependency node of a topic, capped at ~3–4 sessions so a complex topic doesn't turn into a course.
- **Evaluation mechanism**: rubric-check against 2–4 pre-defined **core takeaways** (already in the AI metadata schema) rather than open holistic grading. AI returns covered/missed per takeaway plus confidence, not a vague "correct/incorrect" verdict. Chosen specifically because open-ended grading of free text is unfalsifiable and impossible to eval-test — this mirrors the same discipline applied to archetype classification.
- **Voice input**: deferred. **V1 is typed-only.** Voice/speech-to-text is a later enhancement, not a beta requirement.

## 5. Success metrics & KPIs — LOCKED

**Short-term (beta, ~10 users) — diagnostic, "does the machine work correctly":**
- Curiosity Continuation Rate (did a session lead to a follow-up/new topic)
- Knowledge Expansion Rate (distinct concepts touched)
- Recommendation acceptance rate (doubles as the bandit's reward signal)
- Depth-selection distribution (Gist vs. Explore vs. Stick mix — sanity-checks the depth mechanism in §2)
- AI cost per user/session
- Raw per-user activity traces (sessions, questions, days active) **instead of** DAU/WAU/MAU percentages, which are noise at n=10

**Cut entirely:** "Understanding per Minute" — no ground-truth signal exists to measure it outside of Make It Stick (which is opt-in and sparse), so it would just measure reading speed and mislabel it as understanding.

**Downgraded from instrumented KPI to qualitative/Map-level observable during beta:** Knowledge Reuse Rate, Concept Connectivity — become real cohort-level metrics later once there's enough usage history for them to carry signal; during beta, look at them via the Curiosity Map rather than a dashboard number.

**Long-term (post-beta, real user counts):**
- Retention curves (D1/D7/D30) replacing raw activity traces
- DAU/WAU/MAU and DAU/MAU stickiness ratio
- Activation rate (% of new users reaching a real first-value moment, e.g. one Explore + one follow-up)
- Cost per active user at scale
- Knowledge Reuse Rate / Concept Connectivity, graduated to real cohort metrics
- Recommendation acceptance rate trend over a user's lifetime (tests whether personalization actually improves engagement as the bandit learns — direct test of the product's personalization promise)

**North Star metric — LOCKED:** Curiosity Continuation Rate, promoted to cohort level long-term — "% of weekly active users who trigger a continuation event (follow-up or related topic) in a session." Same signal as the beta diagnostic metric, matured from an individual trace into a real rate once cohorts are large enough.

## 6. Beta feedback mechanism — LOCKED

Explicitly avoided building in-app feedback infrastructure (rating widgets, comment systems, surveys) at this stage — treated as premature engineering effort for a problem 10 known people solve better through direct conversation. Three layers:
1. **Passive** — the behavioral metrics from §5, zero user effort.
2. **Micro-active** — an optional thumbs up/down at the end of a session, no text required. Doubles as an explicit signal for the recommendation engine's reward function (cleaner than inferring purely from bounce/follow-up behavior).
3. **Macro-active** — a personal weekly check-in with each of the 10 beta users, folded into the existing Sunday weekly-PMO ritual rather than treated as separate work. Suggested check-in framing: concrete questions ("what did you look up this week that you didn't finish," "did anything take longer than it should have") over an open-ended "any feedback?" (Originally paired with a shared WhatsApp group for spontaneous bugs/comments — dropped 2026-09-23, no group was ever actually created; §20's feedback box is the spontaneous-feedback channel instead.)

## 7. Curiosity Map / "brain dashboard" — un-iceboxed 2026-09-20, v1 built, LOCKED

**Update**: exited ICEBOX per this section's own exit condition — the visual form is now
decided and built, not just brainstormed. Full brief: `docs/design/curiosity-map.md`. Summary
of what was actually decided, since it differs from the original 3D brainstorm below in a few
specific ways:

- **2D, not 3D** — confirms rather than overturns this section's own original argument (a
  well-built 2D graph carries the same information at a fraction of the build cost).
- **One node per motif, not per question** — sized by how many of the user's own questions
  carry that motif tag. Positioned via a simple deterministic spiral-placement +
  overlap-relaxation pass (no physics/graph library dependency needed at this node count).
- **Node sizing source is `questions.motif_tags`, not `motif_counts`** — deliberate, see the
  "Data source note" in the design brief. `motif_counts` is the recommendation engine's
  taste-weighting table (nudged by thumbs on content the person didn't necessarily ask about);
  this map's entire premise is an honest reflection of what was actually explored, so it
  aggregates the user's own questions directly instead.
- **Time-range filtering** (all/7d/30d) — built as approved below, client-side recompute over
  already-fetched data, no new query mechanism.
- **Click → side panel**, not navigation away — lists the questions behind a motif, each
  expandable inline to its core takeaways, map stays mounted underneath.
- **Personalized curiosity titles and Map-surfaced recommendations — still deferred**, not
  part of this v1, kept as explicitly separable future scope per the guardrails below.

Validated live via Playwright against a real seeded test account (varied motif counts, dates
spread across the time-range boundaries) — node sizing, panel open/list/expand, time-range
recompute, pan, and zoom all confirmed correct. One real bug found and fixed in the process:
the zoom controls and the side panel were both anchored to the same corner, so opening the
panel hid the zoom buttons behind it — moved zoom controls to top-left.

**Original ICEBOX note (context, superseded above on visual form specifically):**

Brainstormed extension to the existing Curiosity Map concept (§34 of the original doc), explicitly for a later stage, not the beta build. Captured with two constraints attached so future work doesn't drift from locked principles by default:

- **Visual form is not locked.** The idea as raised was a 3D rotatable brain visualization with nodes sized by exploration volume, time-range filtering, and Map-surfaced recommendations. The "brain-like visual metaphor" is worth keeping as an aesthetic direction, but the specific 3D/rotatable form should go through an actual Design Brief (8-bucket framework) before being committed to — a 3D brain doesn't inherently convey more information than a well-built 2D node graph, and carries real build cost (WebGL, interaction design, mobile performance) that hasn't been weighed against a simpler alternative yet.
- **Node sizing (by exploration volume/frequency) and time-range filtering** — straightforward, no new mechanism needed, reuses existing motif/frequency data.
- **Map-surfaced recommendations** — no new engine needed; same recommendation mechanism from §3, just a new surface for it.
- **Personalized "curiosity titles"** (e.g. "Mr. Bug Fixer" for a failure/troubleshooting-dominant motif profile) — reuses the motif-tagging data from §3 at no extra cost. Framing constraint: must read as **discovered self-insight** (Spotify Wrapped-style honest reveal), **not a gamification/retention hook** — the original doc explicitly locks in that the Map stays self-awareness-focused, not productivity/engagement-focused, and a badge-like title system can violate that if executed as an "earned reward" rather than an observed truth about the user.

## 8. Build workflow — Curious HQ retired as a separate product — LOCKED

**Context for the change:** the original Curious HQ concept was designed around Freebuff, which struggled to retain context between sessions. Its stated reason for existing was explicit: *"Curious HQ exists because AI agents lose context."* Claude Code doesn't have that problem in the same way — it auto-loads a `CLAUDE.md` at the start of every session in a repo, and reads the actual source code directly rather than needing a hand-maintained mirror of it (which also removes a docs-vs-code drift risk the original plan didn't have to worry about, since it wasn't reading real code anyway).

**What carries over vs. what doesn't, reasoned through:**
- The "AI Context" workstream (context packs generated "from current saved HQ state" for a memoryless agent) — mostly obsolete. Solved natively by Claude Code's repo access + `CLAUDE.md`.
- The Design workstream's rationale ("AI implements functionality well but won't invent visual taste from a vague instruction") — **not** Freebuff-specific, still fully applies to Claude Code. The 8-bucket Design Brief discipline stays.
- PMO/roadmap/decisions/change-history — still needed, but doesn't need a bespoke coded web app. Git already gives free change history, better than the bespoke tracking the original plan wanted to build.

**Decision:** retire Curious HQ as a separate build target. Replace with docs living directly in the Curious repo: a `CLAUDE.md` at the root (principles, non-goals, architecture, pointers to `/docs`) plus a `/docs` folder (roadmap, decisions, design briefs, engineering notes), organized around the same six categories as plain markdown, versioned by git. All near-term build effort goes into Curious itself, not into a tool whose only job was helping build Curious — this also better matches the already-locked priority order (NOW: Curious; LATER: tooling), which building HQ first had arguably inverted.

**Optional, explicitly deprioritized:** a nicer personal "read mode" dashboard for this content is a legitimate later want, not blocking infrastructure.

**Build location:** the actual Curious codebase is being built in this Cowork session's cloud workspace (not via local Claude Code CLI), so scaffolding happens here directly.

## Status of remaining open items (from the original doc's §56)

Still genuinely open, not addressed in this session: exact Curiosity Map visualization (partially bounded above — form deferred to Design phase), exact neuroscience/learning techniques beyond what's now specified for Make It Stick, exact design language, exact AI model/cost optimization, exact frontend implementation.

## 9. Ongoing documentation ownership — LOCKED

While active build work happens in Claude Code, Claude Code itself is responsible for keeping `README.md`, `CLAUDE.md`, and `/docs` updated as work progresses — not just this chat. This closes the one-directional sync gap noted earlier in the session (this chat can write into the local folder, but has no way to see decisions or changes made during local Claude Code sessions unless told). Practically: explicitly ask Claude Code to update the relevant doc(s) whenever a build decision is made or a milestone is reached — same discipline already applied to this chat.

**Refinement (locked):** update `decisions.md`/`decisions-explained.md` specifically when a *real* decision is made — an architecture choice, a locked mechanism, a reversal of something previously locked — not on every commit. The point is a trustworthy, skimmable record, not a changelog.

## 10. Drift — LOCKED

New feature: a bite-sized, scrollable feed of recommended topics, for the "innate curiosity, or just want to pass time" use case (the existing Bored Explorer persona, given an explicit dedicated surface). Reasoned through in the 2026-09-15 session.

**No new mechanism needed.** Each card is a Get-the-Gist-depth rendering of a topic the existing recommendation engine (§3 — motif matching, graph traversal, the bandit) selected. "Go deeper" / "Make It Stick" / "ask a follow-up" are the already-locked depth-switch and Make It Stick mechanisms, surfaced inline instead of behind a page navigation. This is the direct payoff of "knowledge model ≠ UI" (`docs/product.md`) — a new consumption format built entirely on already-decided infrastructure.

**Named tension (not fully resolved by design, resolved by discipline instead):** an algorithmically-fed, infinite-scroll bite-sized feed is the canonical engagement-maximizing UI pattern (TikTok/Reels/YouTube Shorts), which sits close to the explicitly locked non-goal of not being "an infinite-content engagement machine" and not optimizing for screen time. Decision: **unbounded scroll is allowed** (no hard batch cap, no forced stopping point in the UI) — but success is measured *only* by the existing North Star (Curiosity Continuation Rate / Knowledge Expansion), never by drift-viewed or session length. The recommendation engine's reward function is not changed by this feature.

**Canary metric — LOCKED:** session length and scrolls-per-session/day ARE logged, but explicitly as a watch-only signal reviewed during beta check-ins — never fed into the bandit, never a target, never a dashboard KPI. Purpose: catch it if the feed quietly becomes a time-sink despite the metric discipline above, since measurement discipline constrains what the *team* optimizes for but doesn't by itself constrain what an infinite-scroll *interface* does to someone's stopping impulse. This data is also being collected specifically so that **a future scroll-count cap (per session or per day) can be an evidence-based decision later**, not a guess now — explicitly not being built in V1, but the canary data collection starts with the feature so that decision has real data behind it whenever it's made.

**Content generation — LOCKED:** just-in-time with a small prefetch buffer (generate the next 1-2 cards while the current one is showing), not eager whole-batch pre-generation. Chosen over eager generation specifically to avoid paying AI cost for cards a user scrolls past without reading — consistent with the "essentially zero cost for ~10 users" constraint (`docs/engineering.md`).

**Pool exhaustion — LOCKED (2026-09-18):** the shared candidate pool is tiny at beta scale (~16 seed rows plus whatever users have asked), and the recommendation engine's "never re-show the same item to the same user" rule (§3/§14) is deliberately kept as-is, not relaxed for Drift. So an unbounded-scroll feed genuinely can run out. When it does, the feed does **not** repeat content — it shows an explicit "you're caught up with learning for today" end state instead, which nudges the user toward **Make It Stick's existing retrieval-practice idea** (say what you looked at out loud, from memory) rather than a dead end or a fake "loading" spinner, and invites them back later. Reuses what the user actually explored recently as the nudge's content (no new AI call). Chosen over generating fresh topics on the fly to keep the pool from running dry — that's real new infrastructure (JIT topic generation) that a ~16-question beta pool doesn't yet justify; revisit once the seed pool and organic usage are large enough that exhaustion becomes rare instead of near-certain.

## 11. Thumbs feedback — routed by content type — LOCKED

A small thumbs up/down control (consistent corner placement) on every piece of content — both Drift items and the regular self-asked curiosity flow (Gist/Explore/Make It Stick). Extends §6's micro-active feedback layer from "end of session only" to persistently available on any content. `EngagementEvent.thumbsUp` in `src/lib/recommend/bandit.ts` already has the field for this.

**Routing is NOT uniform — this is the actual decision.** A thumbs-down means different things depending on whether the content was requested or recommended, and treating them the same would corrupt the taste model:

- **Thumbs on recommended content** (Drift, Discover feed items) — the person didn't ask for it, so their reaction is a real taste signal. Writes a small adjustment (positive or negative) directly to that motif's weight in the **same per-user motif-count store** that "questions asked" already writes to (§3) — this is the literal "two inputs, one model" design: implicit signal from what they ask, explicit signal from what they react to. Magnitude is deliberately small, roughly equivalent to one implicit signal, not an override — a single ambiguous thumbs-down (dislike the topic? dislike this specific card?) shouldn't swing a motif hard; a real pattern across several should.
- **Thumbs on self-asked content** (they typed the question themselves) — down-voting the *answer* isn't evidence against the *topic* they deliberately sought out; it's much more likely a complaint about explanation quality (wrong, unclear, too long). This does **NOT** touch the motif-taste model. It feeds a separate content-quality signal instead — logged for review, useful for the eval sets (`docs/engineering.md`) and the weekly beta check-in (§6), not for personalization.
- The bandit's existing reward function (`computeReward` in `bandit.ts`) is unaffected by this split — it already uses `thumbsUp` as a reward signal for the specific recommendation instance it was attached to; this decision adds the additional motif-counter write path for recommended-content thumbs specifically, on top of that existing reward-signal use.

## 12. Knowledge content schema — tree vs. graph — LOCKED

Resolves how "archetypes render as their own natural structure" (§1) actually gets represented in the AI's structured output — not specified when §1 was written, decided and validated 2026-09-14 during the Claude Code build session (retroactively documented now; this is exactly the doc-drift gap identified in the 2026-09-15 status check).

**Mechanism**: a discriminated union on the interpretation object's `content` field.
- Process/Mechanism, Timeline/Historical, Comparison, Hierarchy/Structure, and Open-ended/Conceptual render as a **tree** — a root node with nested children (label + detail + children), shaped naturally per archetype (ordered steps, chronological periods, comparison dimensions, hierarchy levels).
- Causal and System render as a **graph** — nodes plus explicit typed edges (e.g. "leads to," "feeds back into"). A plain tree cannot express what these two archetypes actually need: one cause driving multiple effects, or a feedback loop back to an earlier node.

**Validated empirically** before being wired in: a generic-tree-only prototype produced thematic clusters for causal questions with no real cross-links; the discriminated union produced genuine multi-effect fan-out and feedback loops (e.g. a thermostat's regulation loop, the Roman Empire's political-instability/military-overextension mutual reinforcement).

**Known trade-off, fixed during build**: giving the classifier a "graph" option initially degraded archetype accuracy — process-mechanism questions started misclassifying as causal, since mechanical steps also involve local cause-effect. Fixed with explicit prompt guidance distinguishing process-mechanism (one-directional, terminating sequence) from causal (multi-factor, one-time explanation) from system (ongoing, feedback-driven); re-validated via the hand-labeled eval set after the fix.

**Resolved (2026-09-22, LOCKED)**: Gist depth does not render a partial tree/graph at all — it renders `coreTakeaways` (2-4 AI-generated points, already a locked, unambiguous field — the same rubric data Make It Stick evaluates against). This was Drift' own workaround (`docs/design/curious-drift.md`) for the same open question, proven out live before the Ask screen ever got a real Gist rendering; adopting it here instead of inventing a second, tree-slicing-specific mechanism keeps the two surfaces consistent and avoids solving "how much of a tree counts as a gist" as its own hard problem when a simpler answer already existed and worked. `src/app/home-client.tsx`'s Gist tab, previously a literal placeholder message, now renders this.

**Explore rendering resolved too (2026-09-22, LOCKED)** — a related but separate gap: `KnowledgeContentView` (`src/components/knowledge-view.tsx`) was rendering the tree/graph object as a structural data-dump (indented label/detail pairs; for graphs, a flat node list plus a disconnected "Relations" list of edge sentences underneath). That's exactly what the **"knowledge model ≠ UI"** locked principle (`CLAUDE.md`, `docs/product.md`) says not to do — the discriminated union exists so the AI's answer can carry real structure (multi-effect fan-out, feedback loops), not as a spec for what appears on screen, and "editorial quality, not chatbot-answer quality" (`docs/product.md`'s Explore definition) was not being met. Fixed as a **formatting-only change, no new AI call**: the interpretation prompt already asks for editorial-quality per-node text, so `TreeView`/`GraphView` now render that same data as sectioned prose — heading + paragraph per tree node, and for graphs, each node's paragraph immediately followed by its outgoing relations as inline "→ relation → target" connectors (nodes kept in the AI's own return order, which reads cause-to-effect in practice; no topological sort attempted, since a real feedback loop is a cycle with no well-defined topological order anyway). Explicitly does not touch `dependencies`, `motifTags`, `followUpPredictions`, or `concept_edges` creation (`src/app/api/interpret/route.ts`) — those are separate fields/mechanisms untouched by how `content` renders, confirmed live: asked a real causal question and a real process-mechanism question through the actual UI, then clicked a real follow-up prediction and verified a `concept_edges` row was created correctly in the database, exactly as before the rendering change.

## 13. Safety layer — self-harm/suicide handling — LOCKED

New mechanism, absent from the original product/engineering docs — added 2026-09-14 after testing surfaced a real gap: harmful queries (explicit self-harm method-seeking) were falling through to the normal pipeline with no distinct handling, relying entirely on the underlying AI provider's own refusal behavior, which surfaces to the app as a generic, indistinguishable error.

**Mechanism, two layers:**
1. **Dedicated pre-filter** — a cheap classification call (same pattern as the factoid pre-filter in §2), scoped specifically to self-harm/suicide method-seeking. Flags a question as method-seeking (distinct from legitimate psychological/causal curiosity about the topic) and short-circuits to a fixed compassionate response with a crisis-resource pointer, skipping the rest of the pipeline entirely.
2. **Refusal backstop** — catches the underlying provider's own refusal (e.g. for violence/weapons instruction-seeking, deliberately left outside the dedicated pre-filter's scope) and maps it to the same safe response instead of a generic technical error.

**Scope decision**: the dedicated pre-filter covers self-harm/suicide only, not a broader harm taxonomy. Narrower categories (weapons, violence) rely on the backstop layer rather than a second dedicated classifier — avoids over-building a moderation system beyond what a 10-person friends beta needs.

**Validated**: both layers tested against real harmful queries (all correctly short-circuited, no harmful content generated in any test) and a legitimate control question ("why do people feel suicidal" — correctly NOT flagged, full causal explanation returned), confirming no over-blocking of genuine mental-health curiosity.

**Refinement (2026-09-15, LOCKED)**: the fixed safe-response message names **KIRAN** (India's government mental health helpline, 1800-599-0019, free/24-7) explicitly, since the beta cohort is India-based — a named, real, callable number beats a generic "reach out to a helpline in your area" for a friends beta where we know exactly where "area" is. Generic crisis-helpline language is kept as a fallback for anyone outside India. Revisit if/when the user base stops being India-only.

## 14. Cross-user content access — server-inline, not client-readable — LOCKED

Surfaced 2026-09-15 during schema review: the original recommendation-engine schema gave every authenticated client a blanket `select using (true)` on `questions` and `concept_edges` to support the shared candidate pool (§3). That conflated two different things — "the recommendation engine matches across all users' content" (true, needed) and "any client can directly read anyone's raw rows via the anon key" (an unintended, broader capability that was never actually decided on its own).

**Mechanism — one rule, no exceptions:** RLS on `questions` and `concept_edges` is owner-only (`auth.uid() = user_id`), full stop — this includes `source='seed'` content, which has no owner and is therefore unreadable by a plain client query too. Any content the current user doesn't own — a recommendation, a friend's question, seed/cold-start content — is read server-side only, via the recommendations API route using the `service_role` key (which legitimately bypasses RLS in that trusted server context), and returned **inline in the API response**. The client renders directly from that response and never independently re-queries Supabase for a row it doesn't own.

**Why not an EXISTS-based RLS policy instead** (e.g. `using (source = 'seed' or auth.uid() = user_id or exists(select 1 from recommendation_log where question_id = questions.id and user_id = auth.uid()))`) — considered and rejected: `recommendation_log` is `for all` with only `auth.uid() = user_id` checked on insert, meaning a client can self-insert a row claiming anything was "recommended" to them, and an EXISTS-based policy keyed off that table would treat that self-report as authorization. Locking `recommendation_log` inserts to service-role-only would close that hole, but at that point it's more moving parts for no benefit over the simpler rule: "can render it" and "was legitimately served it by the server" are the same fact by construction, never two things that can drift out of sync.

## 15. Identity model — OTP code, not magic-link — LOCKED

Reverses the original "Supabase magic-link email auth" identity model (2026-09-14) after the real magic-link flow reproducibly failed in production on 2026-09-18: a freshly-sent link landed on `/login?error=auth#error=access_denied&error_code=otp_expired&...`. This wasn't a one-off — it was chased down through several layers (an admin-API testing shortcut that couldn't produce a PKCE-matching link at all, suspected as the sole cause; then a real user hitting the same failure class on a genuinely fresh link) without a fix that could be trusted, so the mechanism itself was replaced rather than debugged further.

**Mechanism**: `signInWithOtp()` still sends the email, but the login screen now asks the person to type the 6-digit code from that email (`verifyOtp({ email, token, type: "email" })`) instead of clicking a link. This sidesteps the entire redirect-URL/PKCE-code-exchange mechanism that was failing — code verification is a direct email+token API call with no callback route, no redirect URL, no flow-type mismatch for a stale or reused link to trip over.

**Name collection, folded into the same screen**: the login form now also asks for a name, always shown alongside email — not a separate signup flow. `signInWithOtp`'s `options.data` only takes effect on first account creation (Supabase ignores it for an existing email), so collecting it unconditionally is safe and requires no "is this a new or returning person" check (which would otherwise need either an extra round-trip or an email-enumeration risk). Stored in `user_metadata.name`, used for a personalized greeting on both the ask screen and Drift.

**"Skip the code for returning users" — already true, not a new mechanism.** Verified live (real session cookies, no active browser state, a fresh context reusing only what was persisted): once someone completes the code once, the existing Supabase session-cookie refresh (`src/proxy.ts`, already built for the ask/Drift screens) keeps them signed in on return visits automatically — no code, no email, nothing to build. This only breaks on sign-out, a cleared/different browser, or a genuinely expired refresh token, all standard and expected. The code is a first-visit (or new-device) cost, not a recurring one.

**Operational flag, escalated**: testing this surfaced that Supabase's default built-in mailer has a low email-sending rate limit — tripped repeatedly just from test traffic this session, and still blocked two days later, which rules out a simple hourly window. This looks like a much stricter cap (Supabase's built-in mailer is explicitly meant for testing, not production traffic). **This now blocks finishing this work, not just a future beta-launch nicety** — custom SMTP (Resend/Postmark/etc.) needs to be configured in the Supabase Auth settings before the remaining live verification (signup code, password reset code) can be completed.

## 16. Identity model — password auth, replacing OTP-code — LOCKED

Reverses §15 (2026-09-18, four days after it was locked) after the OTP-code approach hit the same class of friction it was meant to avoid: the "Confirm signup" and "Magic Link" email templates are separate in Supabase and both needed the `{{ .Token }}` edit (easy to miss, and did get missed on the first attempt), and — more fundamentally — every single login still depended on an email round-trip actually arriving, which is exactly the dependency §15 was trying to reduce, not eliminate.

**Mechanism**: `signInWithPassword` for returning users — no email involved at all, the actual point of this change. `signUp` (name + email + password) for new users, followed by the same in-email **code** verification as §15 (`verifyOtp({ type: "signup" })`), not a link. Forgot-password is `resetPasswordForEmail` followed by the same code pattern (`verifyOtp({ type: "recovery" })`) plus `updateUser({ password })` — deliberately code-based here too, not the link `resetPasswordForEmail` would otherwise redirect through, so the redirect/PKCE issue class §15 fought doesn't resurface on this rarer path either.

**Validated (2026-09-20, updated)**: custom SMTP (Resend) configured in Supabase Auth settings, unblocking the rate limit described above. The full signup → verify → sign-out → sign-in-with-password → forgot-password → verify → set-new-password → sign-in-with-new-password chain was proven correct end-to-end via direct API calls, with real emails actually delivered through Resend to a real inbox at each step (not just mechanically valid — visually confirmed). Both the "Confirm signup" and "Reset Password" email templates were rewritten to show `{{ .Token }}` (the code) instead of the default `{{ .ConfirmationURL }}` link — the default templates were still link-based even after the OTP-code switch in §15, which would have silently broken both flows for any real user (no code would ever have appeared in the email). The actual browser UI forms are built and type-check but have not yet been click-tested live in a browser — only the underlying API calls have been exercised directly.

**New operational flag**: SMTP is currently on Resend's sandbox sender (`onboarding@resend.dev`), which only delivers to the email address the Resend account itself is registered under — not to arbitrary recipients, and not even to plus-aliases of that same address. This means **no other beta user can receive an email yet**. A verified custom domain in Resend (tracked as a pending decision — no domain owned yet, see the "sender identity" discussion) is required before onboarding anyone beyond the founder's own account.

**Still true from §15, unaffected by this change**: session persistence already means a returning user on the same device/browser skips even the password — `signInWithPassword` is the fallback for a new device or an expired session, not something asked for on every visit.

**Consequence, stated explicitly so it isn't rediscovered as a bug later:** any UI surface showing content the current user doesn't own — Drift, Discover, a friend's followed-up question — MUST go through the recommendations API, never a direct client-side Supabase query. This is a real constraint on future feature code, not just a note about the current one.

## 17. `hasVisualPotential` — ICEBOX

Surfaced 2026-09-22 while reviewing what's pending: every interpretation call already flags whether a diagram/visual would meaningfully help explain the answer (`hasVisualPotential`, part of the schema since early in the build), and it's generated, persisted (`questions.has_visual_potential`), and threaded through every type definition that carries an interpretation result — but **nothing renders it or acts on it anywhere**. Not a bug (nothing is broken), but a real, previously-undocumented gap: a live signal the pipeline produces on every single question, sitting unused.

**Current call, explicit**: no scope right now. Not building an actual diagram/visual-generation feature (or even a simple "this could use a diagram" UI hint) at this time — deliberately deferred, not forgotten. Tracked here so it surfaces again the next time rendering/Explore work is picked up, rather than staying silently invisible the way it was until this review caught it. Revisit if/when there's an actual reason to act on it (e.g. real usage showing people want visuals for certain archetypes).

## 18. Recommendation batch size — derived, not guessed — LOCKED

Reverses "placeholder, build-and-tune with real data" for this one specific constant (2026-09-22) — the other two in that same category (thumbs motif-nudge magnitude, motif-count decay) genuinely stay blocked on real usage; batch size turned out to be different, because a real target ("keep fetch latency invisible without over-fetching a small pool, paced to how long a card actually takes to read") can be reasoned about now, using research that already exists, rather than waiting on usage data that doesn't.

**The actual discipline here — keeping four research strands honest about what each one does and doesn't support, rather than stretching all of them to look like independent confirmation of the same number:**

- **Load-bearing**: reading speed. Brysbaert (2019), a 190-study meta-analysis of 18,573 participants, puts adult non-fiction reading speed at **238 wpm** with comprehension intact — not the popularly-cited 300 wpm. This is the number that actually sets per-card time.
- **Measured, not assumed**: average Gist-card length. Queried directly from real generated content (`coreTakeaways` word count across all seeded questions at the time, n=16): mean 70.4 words, range 52–99. At 238 wpm that's ~17.6s of reading, plus an estimated (not measured) few seconds of fixed overhead per card — orienting on a new question, glancing at the takeaway, deciding whether to go deeper — for a real per-card time in the high-teens to low-twenties of seconds.
- **Sanity floor only, not direct evidence**: Cowan (2001)'s "~4 chunks" working-memory figure describes items held simultaneously in the focus of attention — a different phenomenon from sequentially-scrolled feed items. Used only as `MIN_BATCH_SIZE = 4` (fewer than that and re-fetch network chatter becomes visible), not as justification for the specific number chosen. Treating reading-span/serial-recall research as if it validated a scrolling-feed batch size would be the same kind of overclaim flagged and avoided here.
- **Confirms the mixing strategy, not a batch-size number**: interleaving research (Samani & Pan 2021, npj Science of Learning, undergrad physics) found interleaved topic practice beat blocked practice at d = 0.40 and d = 0.91 across two stages. Real support for the recommendation engine's relevant/adjacent/wildcard mixing (§3) — mixing topics aids retention, not just intuition — but it's a statement about *whether* to mix, not *how many* mixed items to serve per fetch. Not cited as batch-size evidence for that reason.
- **Confirms the existing canary, not a batch-size number**: vigilance-decrement research operates on session-timescale (studies measure decline across 10-minute blocks over 30–40+ minutes), not per-fetch-page timescale. This is why the existing §10 canary (session length, scrolls-per-session, watch-only during beta) is the right mechanism for a *future* scroll-cap decision — not evidence for sizing a single API response today.

**The number**: `DEFAULT_BATCH_SIZE` is now a derived constant (`src/app/api/recommendations/route.ts`, `computeDefaultBatchSize()`), not a hardcoded guess — per `CLAUDE.md`'s own discipline ("anywhere a value can be computed deterministically, compute it"). `Math.round(TARGET_READING_SECONDS / secondsPerCard)`, clamped to `[MIN_BATCH_SIZE, MAX_BATCH_SIZE] = [4, 8]`. `TARGET_READING_SECONDS = 120` (the upper end of a reasoned 90–120s uninterrupted-scroll target) was chosen deliberately paired with the upper end of the measured per-card time range, rather than mixing a high per-card estimate with a low target — using the midpoint of both (105s) would compute to 5, not 6; this is a real, stated choice, not a number forced to match the old placeholder. Current output: **6**.

**Stated plainly**: this is a starting default informed by real research and one real measurement, not a final answer verified against actual behavior. The §10 canary is still what confirms or corrects it once real usage exists — same relationship between a research-informed default and empirical correction as the depth thresholds (§2) and the bandit epsilon-decay constants (`bandit.ts`).

**Surfaced in product, not left as a silent backend detail**: Drift (`src/app/drift/drift-client.tsx`) shows a one-time, quiet note after the first batch — "We showed you N to start — paced to how long it actually takes to read one closely, not to keep you scrolling" — directly connecting to the locked principle "User time is sacred... don't optimize for screen time" (`docs/product.md`). Deliberately anchored on the *actual* number of items the first fetch returned, not the abstract target: a cold-start user's sparse relevant/adjacent pool (no slot backfilling, `candidates.ts`) can return fewer than the target batch size, and citing "6" in the copy while only 2–4 cards actually appeared would read as simply wrong. No dismiss button (matches the Drift design brief's "no urgency cues, no chrome competing with content") — shown once ever per browser (`localStorage`), then never again. Live-validated: a fresh cold-start test account correctly saw the note reflecting its real (sparse) first-batch count, and it correctly did not reappear on reload.

## 19. Motif taste model — windowed recency, not decay; thumbs magnitude sized relative to the organic unit — LOCKED

Reverses "blocked on real usage data" for the last two of the three original recommendation tuning constants (2026-09-22) — the motif-count decay formula and the thumbs motif-nudge magnitude (batch size was the first, §18). All three turned out to have a way forward without real usage data after all; none of them were actually blocked in the way they looked.

**Windowed count instead of a decay half-life.** The original plan was a continuously-decaying accumulator (`count = count * decayFactor(timeSinceLastUpdate) + 1`), which needs a half-life constant with no substitute data: too short and a twice-a-week user's whole taste profile decays to near-zero between visits; too long and it never tracks a daily user's actual drift — one free parameter, two distinct ways to break the system, no way to know which side of it a real cohort would land on without watching them.

Replaced with two numbers instead of one decaying one, kept genuinely simple:
- **All-time count** (`motif_counts`, unchanged) — a stable baseline that never vanishes. A motif this user has ever meaningfully cared about keeps scoring even if they haven't touched it in weeks.
- **Recent-window count** (new) — not time-based at all, interaction-based: a tally of motif tags across the user's own **last 20 asked questions** (`RECENT_WINDOW_FOR_MOTIF_RECENCY` in `candidates.ts`, `tallyMotifs()` in `scoring.ts`), fetched from `questions`, not `recommendation_log` — self-asked questions are the direct "what do they want to know right now" signal; `recommendation_log` only records recommended-content impressions/engagement and would miss organic question-asking (the dominant signal) entirely.

Combined **additively** for relevant-slot scoring (`scoreRelevant`'s `motifWeights`), not as a replacement: `combined[motif] = recentWindowCount[motif] + allTimeCount[motif]`. This is why a motif purely from history still scores (via its all-time weight), a motif that's brand-new-but-currently-hot scores too (via the recency window, even with zero all-time history — previously invisible to relevant-slot scoring entirely until it accumulated enough history to make the all-time top-5 cut), and a motif present in both gets emphasized in the blend without needing an extra tunable multiplier.

**The actual reasoning for why this is shippable now and decay wasn't**: window size is a forgiving parameter — 15 vs. 30 only shifts how sensitive the "current focus" signal is, the qualitative behavior holds either way, regardless of whether the user opens the app daily or twice a week (it's counted in interactions, not elapsed time). A decay half-life is fragile — get it wrong and the system actively breaks in one of two opposite directions. Picked `20` as a starting value within that range; real usage tunes the exact number later, but doesn't gate shipping the mechanism.

**Correction made during implementation, stated so it isn't silently lost**: the original proposal mapped all-time count to the "adjacent" slot. That slot doesn't consume `motif_counts` at all — it already has its own, separate recency mechanism (last 5 questions' `dependencies`, substring-matched). Both all-time and recent-window numbers actually needed to combine into **relevant**-slot scoring together, the only slot that ever reads `motif_counts`.

**Thumbs motif-nudge magnitude: `THUMBS_MOTIF_NUDGE` raised from 1 to 4.** The original question — how much should an explicit vote move the taste model relative to what already exists — turned out to have a defensible starting answer without real behavior data: size it as a multiple of the organic unit already defined (one asked question contributes +1 per motif), not as an unrelated invented number the way batch size's original "6" was. A thumbs vote is rare and deliberate; an asked question's motif contribution is often incidental to what the person was actually after. 3-5x that unit is a reasoned range; `4` is the starting pick.

**Correction made during implementation**: the original framing compared thumbs weight to "6-10 organic views per session." There is no "passive view" increment in this system — viewing a recommended card touches `motif_counts` not at all; only an asked question (+1) or an explicit thumbs vote ever writes to it. The reasoning (a deliberate vote should outweigh one incidental question-driven increment, not overwhelm weeks of accumulated signal) still holds — it's just anchored to the correct existing unit now.

**Explicitly still blocked, not solved by this**: if thumbs voting is ever extended to *compound* (successive same-direction votes weighted differently) or scale by some notion of confidence, that genuinely has no organic reference point to size against and stays blocked on real data, same as before — this only resolves the flat, single-vote-magnitude case.

**Validated**: `npm run eval:recommend` extended with `tallyMotifs` unit tests and a scenario test of the additive combination (historical-only motif keeps its weight, zero-history-but-recent motif scores via the window alone, a motif in both sums correctly) — all passing. Live-validated against the real running API with a seeded test account: a motif with 10 all-time count and zero recent activity remained reachable via the relevant slot; a motif with zero all-time history but 3 recent questions became reachable via the relevant slot for the first time (previously invisible under the old top-5-all-time-only weighting); one thumbs-up on the latter correctly moved its `motif_counts` row from 0 to 4.

## 20. Settings screen — built, and a scoped reversal of §6 — LOCKED

Built 2026-09-22 (`src/app/settings/`) — the fourth top-level nav destination named in `docs/product.md` from the start (Questions/Wonder, Discover, Curiosity Map, Settings), the last of the four to actually exist. Three sections:

- **Appearance** — Light/Dark/System toggle. Required a real architecture change, not just a UI control: dark mode had only ever followed `prefers-color-scheme` (no manual override existed anywhere in the app). Added `ThemeProvider` (`src/components/theme-provider.tsx`), switched Tailwind's `dark:` variant to class-based (`@custom-variant dark (&:where(.dark, .dark *));`, `globals.css`), and added a blocking inline script in `layout.tsx` that runs before first paint so there's no flash of the wrong theme while React hydrates. Preference is `localStorage`-only, deliberately — per-viewer convenience, not state that needs to sync across devices or that Claude/the backend ever needs to read.
- **Account** — email (read-only), editable display name, change password. Change password works directly for an authenticated session via `supabase.auth.updateUser({ password })` — no email round-trip at all, which means it's unaffected by the auth/SMTP blocker in §16/§18-adjacent territory; this one path was buildable despite auth otherwise being tabled.
- **Feedback** — a plain open-text box, `POST /api/feedback` → new `beta_feedback` table (RLS owner-only, insert/select own rows). **A deliberate, scoped reversal of §6's "no in-app feedback infrastructure"** — explicitly confirmed with the user first rather than silently built either way, given §6 is a locked decision. The distinction that makes this not a contradiction of §6's original reasoning: §6 was avoiding a **rating/survey system** (structured, recurring, engagement-shaped); this is a single always-available box for "something specific and pointed." **Amended 2026-09-23**: the planned WhatsApp group (§6) was never actually created, so this box is now the sole spontaneous-feedback channel, not a supplement to it — the box's copy no longer points anywhere else. Read directly during the existing weekly check-in ritual, not a support queue with its own workflow.

**Bug found and fixed during validation, not a design placeholder**: both the name-save and password-change handlers called `supabase.auth.updateUser()` with no `try/catch`. The first live test showed both buttons stuck on "Saving…"/"Updating…" indefinitely with no error surfaced — a real UX dead-end, not a slow network fluke that resolved on retry with more patience alone (though a too-short wait in the first test run also contributed to the initial read; fixed the missing error handling regardless, since an unhandled rejection leaving a button permanently stuck is a real defect independent of what caused any single instance of it).

**Validated live**: theme toggle switches instantly and the choice survives a reload with no flash; name change confirmed via a direct database read after saving; password change confirmed by actually signing in with the new password afterward, not just checking for a success message; feedback submission confirmed by reading back the real inserted row.

## 21. Signup/login unblocked — email confirmation off for the beta — LOCKED

Closes out the auth work tabled since §16/§18. The SMTP/sandbox-sender blocker (§16, §18) only ever affected paths that need real email delivery — signup verification and password reset. Rather than wait on a domain purchase or Brevo/SendGrid single-sender verification (both still real options for later, both still require the user to act in an external dashboard), **"Confirm email" was turned off in Supabase Auth settings** (user action, Dashboard → Authentication → Sign In / Providers) — a real, explicitly-confirmed trade-off, not a silent default: anyone can now sign up with an email they don't type correctly or own, no verification that they control it. Accepted specifically because this is a small group of friends being personally invited, not a public signup surface; revisit if that ever changes.

**No code changes needed for this to work** — `signup/page.tsx`'s `if (data.session) { router.push("/") ... }` branch was already written anticipating exactly this case (see §16), so the existing code correctly skips the code-verification step the moment Supabase returns a live session immediately from `signUp()`.

**Bug found and fixed while testing this, the same class as §20's**: `login/page.tsx`, `signup/page.tsx`, and `forgot-password/page.tsx` all called their respective `supabase.auth.*()` methods with no `try/catch` — the exact same gap just found and fixed in Settings. Fixed across all three. A real live-test run did get stuck on "Creating…" indefinitely on the first attempt; a second run with a longer wait and console-error capture showed no actual error — the real cause was the test being too impatient (~2s) for a real signup's network+password-hashing round-trip (~6s), not a genuine failure. The `try/catch` fix stands regardless, on the same reasoning as §20: an unhandled rejection leaving a button permanently stuck is a real defect independent of what causes any single instance of it, and this is now the second time this exact gap has surfaced across the codebase — worth remembering as a pattern to check for in any new auth-adjacent form, not just something fixed twice in isolation.

**Validated live, real browser form interaction, not a scripted API call**: typed into the actual `/signup` form (name, email, password, confirm) and submitted — landed directly on the home page with zero code-entry step and zero email sent, confirming "Confirm email" is genuinely off end-to-end. Signed out, then signed back in through the actual `/login` form with the same credentials — succeeded. Confirmed via direct database read that the account's `email_confirmed_at` was set automatically (no confirmation ever pending).

**Still genuinely blocked, unchanged**: password reset (`/forgot-password`) still needs real email delivery, which still only reaches the founder's own inbox (Resend sandbox sender). For a beta this size, the interim answer is manual — the founder can reset anyone's password directly via the Supabase dashboard if the rare case comes up. Real SMTP (a purchased+verified domain, or Brevo/SendGrid single-sender verification) is still the actual fix, whenever it happens.
