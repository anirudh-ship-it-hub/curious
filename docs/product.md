# Curious — Product

## What it is / isn't

A place to satisfy random wandering curiosity, optimized for understanding and retention while respecting the user's time. Helps users go from **zero to one** on a topic — not mastery, not certification, not "complete a course."

Not: a course platform, an LMS, a generic chatbot, "ChatGPT with a nicer interface," a research engine, a productivity dashboard, a streak-driven learning app, a mastery platform, or an infinite-content engagement machine. Does not optimize for time-on-app — a satisfied user leaving is a successful outcome.

Thesis: **chatbots answer, Curious orchestrates continued understanding.**

## Two user types

- **Wanderer** — has a specific question, enters it directly.
- **Bored Explorer** — no specific question, browses suggested topics into the same system.

## Core loop

WONDER → UNDERSTAND → CONNECT → EXPLAIN → DISCOVER → WANDER DEEPER → SATISFIED. The user is never forced to continue past "satisfied," and is never locked out of going deeper.

## Three learning contracts (depth, not navigation)

These are controls inside a curiosity, not top-level nav (top-level nav is: Questions/Wonder, Discover, Curiosity Map, Settings).

- **Get the Gist** — <2 min. Quick context, few key lines. Where simple/factual curiosities end.
- **Explore** — ~8-12 min, the usual default for meaningful questions. Progressive disclosure, analogies, causal explanations, discovery moments. Editorial quality, not chatbot-answer quality.
- **Make It Stick** — retrieval practice for retention. Opt-in only, never a default. See `decisions.md` §4 for the locked session structure and evaluation mechanism.

See `decisions.md` §2 for how depth is actually selected (factoid pre-filter + metadata threshold — this mechanism didn't exist in the original vision and was designed in the 2026-09-13 session).

## Curious Shorts

A bite-sized, scrollable feed of recommended topics — a dedicated surface for the Bored Explorer persona (previously only implicit in "browses suggested topics"). Each short is a Get-the-Gist rendering of whatever the recommendation engine selected; "go deeper," "Make It Stick," and follow-ups are the same depth-switch mechanisms as the regular flow, just surfaced inline. No new content-generation mechanism — see `decisions.md` §10.

Deliberately allows unbounded scroll (no hard cap), but success is measured only by the existing North Star (Curiosity Continuation Rate), never by shorts-viewed or session length — those are logged only as a canary/watch-only signal during beta, specifically so a future scroll cap can be an evidence-based decision later rather than a guess now. This sits close to the "not an infinite-content engagement machine" non-goal below by design; the tension is resolved by measurement discipline, not by a hard interface limit.

## Differentiators (the actual "aha" moments)

Auto-suggested and user-added follow-up questions that expand the existing knowledge graph (not disconnected answers); Discovery Moments (cross-domain connections, e.g. "this same principle explains airplane lift"); visible knowledge-graph growth; Make It Stick as deliberate self-explanation. Follow-ups must be relevant, editable, optional, never pushy.

## Recommendations — curiosity taste, not category

Do not bucket by surface category (business/history). Infer deeper thematic patterns (collapse, transformation, adaptation) — this is "curiosity taste." See `decisions.md` §3 for the locked mechanism (motif tags + graph traversal + epsilon-greedy bandit).

A persistent thumbs up/down sits on every piece of content (extending the end-of-session feedback in `decisions.md` §6 to always-available). It means something different depending on context, and is handled that way rather than uniformly: reacting to something *recommended* is a real taste signal and feeds the motif model; reacting to something *you asked for yourself* is much more likely a complaint about explanation quality than about the topic, so it's kept out of the taste model entirely and routed to a separate quality signal instead. See `decisions.md` §11.

## Curiosity Map

Personal, self-awareness-focused view of what someone has explored and how it connects. Explicitly NOT a productivity dashboard. Visual form is not locked — see `decisions.md` §7 for the icebox extension (brain-like metaphor, personalized motif-based titles) and its constraints.

## Locked principles

User time is sacred. Understanding > information. Curiosity > obligation. Zero → one. Progressive depth, recommended not forced. Never lock deeper learning. Reduce decision fatigue. AI should not insist. Follow-ups editable. Don't optimize for screen time. Observe how curiosity evolves, don't constantly quiz. UI should not feel like a chatbot. Knowledge representation flexible — knowledge model ≠ UI. Product evolves through evidence, not more planning.

## Success metrics

See `decisions.md` §5 for the full short-term/long-term split. North Star: Curiosity Continuation Rate (does a session lead to a follow-up or new topic), tracked as raw per-user traces during beta, maturing into a real weekly-cohort rate at scale.
