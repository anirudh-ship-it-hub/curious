# Curious — Roadmap & PMO

## Status note

Original target dates below were set 2026-08-11 and have not been re-validated against actual progress. As of this repo's creation (2026-09-13), the "Enhancement Release" target of Sept 12 has already passed. **First action when picking this up: update this file with real current status before treating these dates as truth.** Per the project's own philosophy: if dates slip, update the source of truth — prefer scope reduction over indefinite delay.

## Current status (as of 2026-09-23, informal — not a full PMO pass)

**Built and live-validated**: core AI pipeline (incl. safety pre-filter + refusal backstop), the Ask flow (now with editorial-prose Explore rendering and a real Gist), the recommendation engine (incl. windowed motif-recency and a reasoned thumbs magnitude, §19), Curious Shorts, thumbs feedback (on both Ask and Shorts), beta metrics instrumentation (`npm run metrics`), a first version of the Curiosity Map (§7), tuned depth-selection thresholds (§2), a derived recommendation batch size (§18), Settings (§20 — appearance/theme, account details, a scoped-reversal feedback box), and now real signup + login (§21).

**Auth: closed out for real users, one piece still deliberately deferred.** Signup and login are unblocked and live-validated via actual browser form interaction — "Confirm email" is off (a confirmed, accepted trade-off for a small friends-only beta), so a real friend can sign up and start using Curious today with zero email involved. Password reset still needs real email delivery, which still only reaches the founder's own inbox (Resend sandbox sender) — interim answer is a manual dashboard reset if that rare case comes up; real SMTP (a domain, or Brevo/SendGrid single-sender verification) is the actual fix whenever it happens, but nothing is blocked on it anymore for normal use.

**No longer blocked on real usage data**: all three original recommendation tuning constants (batch size, thumbs magnitude, motif-count recency) are resolved — see §18/§19. Nothing left in the "waiting on real users to build" category except things that structurally require real behavioral data (which doesn't currently include anything on the open list).

**Now genuinely ready for real beta users** — this is the first point in this log where that's true without a caveat attached. Worth doing a real PMO pass and setting real target dates now that there's a concrete "beta can actually start" moment.

## Original targets (unverified — update on first real PMO pass)

- Curious Alpha — Aug 22, 2026
- Friends Beta — Sept 5, 2026
- Enhancement Release — Sept 12, 2026
- Enhancement Release — Sept 19, 2026

## Weekly PMO format (45-60 min, Sunday)

1. What artifacts were completed?
2. What moved forward?
3. What didn't move?
4. What blocked progress?
5. What should be de-scoped?
6. What are the top 1-3 outcomes for next week?
7. Which work sessions produce those outcomes?

Purpose: reduce uncertainty, not judge productivity.

## Beta feedback (decisions.md §6, amended by §20)

Passive behavioral metrics + a persistent thumbs up/down on any content (routed differently for recommended vs. self-asked content, `decisions.md` §11) + WhatsApp group for spontaneous feedback + personal weekly check-in per beta user folded into the Sunday PMO ritual, **plus** a plain open-text feedback box in Settings (§20, added 2026-09-22, a deliberate and scoped reversal of §6's original "no in-app feedback infrastructure" — a single always-available box for something specific and pointed, not the rating/survey system §6 was avoiding). Still no rating widgets, comment systems, or surveys.

## Change history

Use git commit history on this file as the change log — do not build separate change-tracking tooling (this replaces the original Curious HQ plan's bespoke change-tracking feature; see decisions.md §8).
