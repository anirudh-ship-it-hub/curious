# Curious — Project Context for Claude Code

This file is auto-loaded at the start of every session in this repo. Read `/docs` for full detail — this file is the fast-orientation summary. Everything here is LOCKED unless marked otherwise; don't relitigate locked decisions without new evidence.

## What Curious is

A place to satisfy random curiosity and go from zero to one on a topic — not a course platform, not a mastery/certification tool, not "ChatGPT with a nicer UI." Optimizes for understanding-per-minute, not time-on-app. Two entry modes: **Wanderer** (has a specific question) and **Bored Explorer** (browsing suggestions). Full product philosophy: `docs/product.md`.

## Non-goals

Not an LMS. Not a streak-driven engagement app. Not optimizing for session length or DAU for its own sake. Not a decision-support or task-completion tool (practical/how-to queries are in scope, but archetypally treated the same as any other curiosity, not as a distinct product mode).

## Architecture summary

Stack: Next.js, React, TypeScript, Tailwind, Supabase, Git/GitHub, Vercel. Deliberately simple — no complex auth, multi-user, or collaboration infra needed yet. Full rationale: `docs/engineering.md`.

**Core pipeline:** one AI call per question produces a rich structured knowledge object (archetype, complexity, difficulty, importance, dependencies, motif tags, follow-up predictions, and a `content` tree/graph — see below) — NOT three separate calls for Gist/Explore/Make It Stick. The three depths are different *renderings* of the same object. Knowledge model ≠ UI.

**Knowledge content shape:** `content` is a discriminated union, not flat prose — Process/Timeline/Comparison/Hierarchy/Open-ended render as a tree (nested label/detail/children); Causal/System render as a graph (nodes + typed edges), the only shape that can express one cause driving multiple effects or a feedback loop. `docs/decisions.md` §12.

**Safety layer:** ahead of the rest of the pipeline — a dedicated pre-filter for self-harm/suicide method-seeking, plus a backstop that catches the underlying provider's own refusal (e.g. weapons/violence queries) — both short-circuit to a fixed compassionate response instead of a generic error. `docs/decisions.md` §13.

**Depth selection:** a factoid pre-filter runs before archetype classification; single-fact lookups short-circuit to a minimal answer and skip the full pipeline. Everything else gets a Gist/Explore recommendation from complexity+importance thresholds (exact thresholds tuned empirically, not hardcoded yet). Make It Stick is never a default — always user-opt-in.

**Recommendation engine:** content-based motif matching (relevant) + concept-dependency graph traversal (adjacent) + epsilon-greedy bandit with decay (wildcard/explore-exploit balance). No vector DB or embeddings infra for the beta — plain Supabase counters. Candidate pool is shared across all beta users plus a curated seed set for cold start. **Curious Shorts** (`docs/decisions.md` §10) is a bite-sized scrollable feed built entirely on this same engine — no new mechanism. A persistent thumbs up/down routes differently by content type: on recommended content it adjusts the motif-taste model, on self-asked content it never touches the taste model and instead feeds a separate quality signal (`docs/decisions.md` §11).

**Make It Stick:** one retrieval-practice session per core dependency node (capped ~3-4). Evaluation is a rubric-check against 2-4 pre-defined core takeaways (covered/missed + confidence), never open holistic grading. Typed-only for V1 — no voice/speech-to-text yet.

Full decision rationale for all of the above: `docs/decisions.md`.

## Engineering discipline (non-negotiable, not a style preference)

This project deliberately does NOT trust a single unconstrained AI call to make decisions the rest of the system depends on. Concretely:
- Every AI classification/tagging call uses structured output (schema-constrained), never free-text parsing.
- Classification tasks (archetype, motif) need a hand-labeled eval set before shipping prompt changes — no "I think it's better," measure it.
- Anywhere a value can be computed deterministically (read time from word count, etc.), compute it — don't ask the AI to self-report it.
- The recommendation engine's backbone is deterministic (motif counters, graph traversal), with AI narrowed to the smallest possible judgment call at each step.

## Working style

- Don't over-engineer infrastructure for a ~10-person beta. Reach for a vector DB, a bandit library, or complex infra only when a fixed/simple mechanism has demonstrably failed.
- Build → test → observe → decide, over more planning. At ~70-80% clarity, push to execution.
- This repo, not a separate "Curious HQ" product, is the source of truth. Git history is the change log. See `docs/decisions.md` §8 for why the original Curious HQ plan was retired.

## Docs index

- `docs/product.md` — vision, philosophy, user journeys, learning contracts, non-goals in full
- `docs/decisions.md` — every locked technical decision with the reasoning behind it
- `docs/roadmap.md` — milestones, current status, weekly PMO format
- `docs/engineering.md` — architecture, AI pipeline detail, cost philosophy
- `docs/design/` — the 8-bucket design framework + design briefs (written per-screen, not upfront)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
