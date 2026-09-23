# Design Brief — Curiosity Map

Un-icebox of `docs/decisions.md` §7, per its own stated exit condition: visual form was
explicitly left unlocked, and the note itself already argued a well-built 2D node graph can
carry the same information as a 3D rotatable one at a fraction of the build cost. This brief
is that "actual Design Brief" the §7 note said had to happen before committing to a form.

1. **Experience** — Self-insight, not a dashboard and not a game. A quiet, personal map of
   "here's what you've actually been curious about" — closer to a Spotify Wrapped reveal than
   an analytics panel. No leaderboards, no streaks, no "level up" framing (§7's own guardrail:
   must read as discovered truth about the user, never an earned reward).

2. **Information architecture** — A third top-level destination alongside Ask and Shorts
   (`/map`), added to `AppNav`. Matches `docs/product.md`'s nav list (Questions/Wonder,
   Discover, Curiosity Map, Settings) — this is the first build of that third item.

3. **Visual hierarchy** — Node size is the entire story: bigger circle = more of your own
   questions have touched that motif. No numbers or leaderboard-style ranking overlaid on the
   canvas itself — count is only shown once you open a node's panel, keeping the map itself
   calm and pattern-first rather than stats-first.

4. **Layout** — One node per **motif** (not per question) — a handful to a few dozen circles,
   not hundreds. Motifs are already the recommendation engine's own tagging vocabulary
   (`docs/decisions.md` §3), so this reuses existing data rather than inventing a new taxonomy.
   Nodes are packed via a simple deterministic spiral-placement + overlap-relaxation pass
   (no physics library needed at this node count) so bigger/more-explored motifs settle nearer
   the center, smaller ones toward the edges — a soft "center of gravity," not a strict ranking.

5. **Visual language** — Same zinc/neutral palette as the rest of the app, one warm accent
   color for node fill (variation in size does the work, not color-coding by category). Canvas
   background slightly darker than page background so the map reads as its own space. Pan via
   drag, zoom via scroll wheel or +/- buttons (covers desktop and mobile without needing a
   pinch-gesture library).

6. **Components & interaction** — Clicking a node opens a side panel (slides in from the
   right on desktop, from the bottom as a sheet on narrow screens) listing the actual questions
   behind that motif — each a one-line gist (first core takeaway), tappable to jump into the
   Ask screen's follow-up flow for that question. The map itself stays mounted underneath;
   closing the panel returns to the same pan/zoom state. A time-range filter (All time / Last
   7 days / Last 30 days) recomputes node sizes from the same already-fetched data — no new
   query mechanism, just a client-side re-aggregation (§7's own note: "straightforward, no new
   mechanism needed").

7. **Motion & feedback** — Minimal: nodes fade/scale in on first load, panel slides rather than
   pops. No celebratory animation on any interaction — explicitly the same anti-gamification
   guardrail as §7's note on personalized "curiosity titles."

8. **States** — Loading: skeleton circles pulsing in rough final positions. Empty (no questions
   yet): a plain message inviting the person to ask something first, no fake placeholder map.
   Error: plain inline text, retry. Responsive: side panel becomes a bottom sheet under a
   width breakpoint; canvas fills remaining viewport either way.

**Explicitly deferred from this pass** (kept small on purpose, matching "build the smallest
correct thing, tune later"):
- **Personalized curiosity titles** (§7's "Mr. Bug Fixer"-style reveal) — real feature, real
  fit for this surface, but a second, separable piece of scope. Not included in v1.
- **Map-surfaced recommendations** (§7) — same reasoning; the map is read-only in v1, doesn't
  yet feed back into what gets recommended next.

**Data source note, stated explicitly so it isn't second-guessed later**: node sizing comes
from aggregating `questions.motif_tags` across the current user's own rows — **not**
`motif_counts` (the recommendation engine's internal taste-weighting table). `motif_counts`
is nudged by thumbs on content the person didn't necessarily ask about, which would corrupt a
surface whose entire premise is "an honest reflection of what you actually explored." The two
tables now serve genuinely different jobs: `motif_counts` drives personalization,
`questions.motif_tags` drives self-insight.
