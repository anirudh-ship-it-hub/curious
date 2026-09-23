# Design Brief — Curious Shorts

First design brief actually run through `docs/design/framework.md` (the ask-a-question screen
predates this discipline — its styling is explicitly marked placeholder throughout the code).
Filled at ~70-80% confidence per the framework's own instruction; expect to revise after seeing
it live.

1. **Experience** — Calm, editorial, **premium** (explicit user correction: "shouldn't feel like
   a cheap app"). A curated magazine you scroll through, not a feed you fall into — directly
   counters the "engagement-machine" tension `docs/decisions.md` §10 already named as a risk.
   No urgency cues: no autoplay countdowns, no streak/badge chrome, no red notification dots.

2. **Information architecture** — A separate top-level destination (`/shorts`), not a tab on
   the ask screen. Matches the Wanderer (ask) vs. Bored Explorer (browse) split already drawn
   in `docs/product.md`. A small persistent nav (`AppNav`) switches between the two; added to
   both screens since neither had one before.

3. **Visual hierarchy** — The topic itself (headline) is what the eye lands on first — set in a
   serif display face for an editorial, "written for you to read" feel, distinct from the
   sans-serif UI chrome around it. Core takeaways second. Actions (go deeper, thumbs, next)
   deliberately quiet and last — small, low-contrast, corner-anchored, never competing with the
   content for attention.

4. **Layout** — Vertical scroll of discrete cards (not a full-viewport snap-per-card pager —
   that reads as more "app-like"/aggressive, the opposite of the editorial goal). Centered
   column, comfortable reading width, generous vertical whitespace between cards so each one
   reads as its own page, not a dense list.

5. **Visual language** — Same neutral (zinc) palette and rounded-corner language as the rest of
   the app for family resemblance, but warmer/quieter: soft card backgrounds over the page
   background rather than heavy borders, no drop shadows, no saturated accent colors. New serif
   font (Newsreader, via `next/font/google`) for headlines only; body/UI stays on the existing
   Geist Sans.

6. **Components & interaction** — Card = headline (question) + core-takeaways gist + quiet
   thumbs up/down + "Go deeper". Tapping "Go deeper" expands the full Explore-depth content and
   Make It Stick **inline**, in place, rather than navigating away (design decision: keeps the
   scroll uninterrupted, reuses the existing depth-switch idea from `docs/product.md`). A
   follow-up question tapped from within an expanded card asks it and renders the new result
   nested inline, same philosophy.

7. **Motion & feedback** — Minimal: a simple height/opacity transition on expand/collapse.
   Nothing bouncy, no confetti/celebration on thumbs — celebratory micro-interactions are a
   gamification cue the Curiosity Map explicitly avoids (`docs/decisions.md` §7), same spirit
   applies here.

8. **States** — Loading: a plain skeleton pulse, not a spinner. Empty/end-of-pool: the
   "caught up with learning for today" state locked in `docs/decisions.md` §10 (pool
   exhaustion addendum) — lists what was recently explored, nudges toward saying it out loud,
   invites a return later. Error: plain inline text, retry button. Responsive: single column at
   every width; the "centered column" narrows to full-bleed-with-padding on mobile rather than
   staying a fixed max-width.

**What's still genuinely open, not resolved by this brief**: exactly how much of a tree/graph's
depth to show at Gist vs. Explore (§12's own still-open item) — Shorts sidesteps it for now by
using `coreTakeaways` as the gist content (already-locked, unambiguous data) rather than a
partial tree/graph render. Revisit together once §12's open item is resolved generally.
