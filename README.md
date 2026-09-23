# Curious

Welcome to the actual build folder for Curious — the "wander intelligently, understand what you're curious about" app. If you're opening this after a break and need to remember where things stand, read this file first.

## How this folder is organized

There are two kinds of docs here, written for two different readers:

- **`CLAUDE.md`** and **`docs/`** are written for Claude Code — dense, cross-referenced, no scene-setting. They're what gets loaded automatically whenever you open this folder with Claude Code, so it always has the current state without you re-explaining anything.
- **`readme/`** is written for you — the same information, but as prose you'd actually want to read. `readme/project-overview.md` is the full story of how Curious was conceived and everything that's been figured out about it. `readme/decisions-explained.md` is the record of the concrete engineering/product decisions made in the working session on 2026-09-13, each one with the reasoning behind it, not just the conclusion.

If you just want the fastest possible refresh: read this file, skim `readme/decisions-explained.md`, and you're caught up.

## Where things stand right now (last refreshed 2026-09-15)

There's a real Next.js codebase here now: the interpretation pipeline (`src/lib/ai/interpret.ts`, `schema.ts`, `motifs.ts`, `depth.ts`, `provider.ts`) — including a tree/graph knowledge-content schema and a two-layer safety filter for self-harm queries, neither of which existed in the original plan — the recommendation bandit (`src/lib/recommend/bandit.ts`), API routes for `/api/interpret` and `/api/make-it-stick`, and a Supabase schema (`supabase/schema.sql`) covering the knowledge graph, motif counts, and recommendation logging. All of this is validated with hand-labeled eval scripts (`npm run eval:archetypes`, `eval:safety`, `eval:bandit`), not just eyeballed.

This was built by Claude Code working directly in this folder — this README is catching up to that progress, since it had gone stale while the code moved fast. If you're picking this up, check `git log` and read the actual source before trusting this file's specifics — a stale README is worse than no README, and the discipline is supposed to be Claude Code keeps this current going forward (see `CLAUDE.md`'s documentation-ownership section), but that clearly needs to actually be invoked per real decision, not assumed automatic.

Two newer decisions from a 2026-09-15 working session — Curious Shorts (a bite-sized recommendation feed) and content-type-routed thumbs feedback — are locked in `docs/decisions.md` §10-11 but not yet built. See "What's not decided yet" below for what's still blocking the next round of build.

Separately, the product thinking from the original ideation (what Curious is, the three learning contracts, the recommendation philosophy) has been carried forward, and a working session on 2026-09-13 closed out most of the open technical questions that were left unresolved — how depth gets selected, how the recommendation engine actually works, how Make It Stick evaluates someone's explanation, what metrics actually matter for a small beta, and how beta feedback gets collected. All of that is in `readme/decisions-explained.md`.

One structural change worth knowing about: the original plan involved building a separate internal tool ("Curious HQ") to help an AI agent keep track of context, because the tool being used at the time (Freebuff) lost context between sessions. Claude Code doesn't have that problem the same way — it reads `CLAUDE.md` and the actual code directly — so that separate tool was retired in favor of just keeping good docs in this repo. The old Freebuff-built HQ app still exists at `~/curious-hq` on this machine, untouched, in case it's ever wanted later as a nice-to-look-at dashboard — but it's not part of the active build anymore.

## What's not decided yet

The exact visual/design language and most frontend implementation details. How much of the tree/graph knowledge content to render at Gist vs. Explore depth. The AI provider is decided (defaults to Groq, swappable via `AI_PROVIDER` — see `src/lib/ai/provider.ts`), not re-evaluated against real cost/latency data yet but no longer blocking, and a Groq key is already in `.env.local`.

A Supabase project does NOT exist yet — that's the current blocker. Nothing involving persistence, auth, the recommendation engine's candidate queries, or Curious Shorts can be built and validated until one exists and `supabase/schema.sql` has been run against it.

## Suggested first move

If picking this up fresh: open this folder in Claude Code, it reads `CLAUDE.md` automatically. If continuing active work: create the Supabase project, add its credentials to `.env.local`, run `supabase/schema.sql` via the SQL Editor, then resume wiring auth + the recommendation engine — that's the next concrete milestone as of this refresh.
