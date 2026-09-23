# Curious — Full Project Story

*This is the complete narrative version of everything that's been figured out about Curious so far — written to actually read, not just reference. If you want the quick technical summary instead, see `../CLAUDE.md` or `../docs/`.*

# Curious — Complete Project Context Dump

*Captured 2026-09-13, originally written as of 2026-08-11. This is the founder's institutional memory for the Curious product, Curious HQ (the internal build OS), and the broader Founder OS concept. Treat as accumulated context, not a blank slate — distinguish LOCKED/AGREED, CURRENT HYPOTHESIS, OPEN QUESTION, and ICEBOX items as marked throughout.*

## How to use this document

You are joining an ongoing project called Curious. This document contains the accumulated product thinking, decisions, philosophy, architecture direction, design framework, Curious HQ operating system, build workflow, founder working style, roadmap, and current state.

Treat this as the project's institutional memory. Do not restart the ideation process from zero. Do not unnecessarily reopen decisions that have already been aligned on.

However, distinguish between:
- **LOCKED / AGREED** — do not change without evidence or a deliberate decision.
- **CURRENT HYPOTHESIS** — use as the current direction but validate through building/users.
- **OPEN QUESTION** — explicitly requires further thinking.
- **ICEBOX** — interesting but not relevant to current build.

The overarching goal: build Curious into a genuinely useful product while simultaneously developing a repeatable system for turning ideas into working products.

## 1. The founder / builder context

The founder's broader goal is to become someone who can repeatedly turn ideas into working products. He is transitioning toward Product Management / Product Strategy and wants to strengthen: problem definition, product thinking, prioritization, user understanding, experimentation, technology, AI-assisted software development, architecture, metrics, execution.

He enjoys: complex problems, strategy, experimentation, technology/AI, product thinking, independent research, building, autonomy, learning.

He has a tendency toward: overthinking, planning extensively, exploring many ideas, procrastinating when work remains abstract.

Operating principle: **give structure without suffocating exploration.**

He works best with: Direction + Routine + Autonomy + Novelty + Visible Progress + Meaningful Connection.

Execution rule: when ~70–80% of something is understood, push toward execution. Don't solve execution problems by giving him more ideas. Prefer *experiment → information → decision → build* over *more planning → more planning → more planning*.

## 2. Previous project: Ascend

Built more manually (ChatGPT for code, Cursor, manual file/folder/README creation, `.env.local`, API keys, Supabase, Git, Vercel, local dev). Gave him working knowledge of Next.js, React, frontend/backend separation, APIs, Supabase/Postgres, Git/GitHub, Vercel, localhost, `npm run dev`, deployment, AI integration.

He is not a professional engineer but not a blind code-copier either. Wants AI to do most implementation while he understands architecture and major technical decisions. Rule: **AI can write 95%+ of the code, but the founder should understand 100% of the high-level architecture.**

## 3. Origin of Curious

Originated from thinking about how adults learn and how curiosity behaves. Kids ask random questions naturally; adults still have them but face friction (no one around knows, feels silly to ask, research takes effort, too many sources, curiosity is fleeting). AI has made getting an answer effortless — but that creates a different problem (see Why Now).

## 4. Why now

AI has made answers abundant. Information is a commodity. Attention is fragmented. **Understanding is now the scarce resource.** The problem isn't scarcity of information, it's abundance — search, AI answers, articles, videos, podcasts, Reddit, books, social media, courses — with nothing trimming it down to "here's what you actually need to understand first." Curious exists in that gap.

## 5. What Curious is

Not another learning platform. A place to satisfy random wandering and curiosity: explore bite-sized topics, satisfy questions, discover unexpected subjects, understand topics from zero to one, build a personal picture of current fascinations, observe how curiosity evolves.

"A platform for random curiosity, optimized for understanding and retention while respecting the user's time." Helps users go from **0 → 1** on a topic — not mastery, not certification, not "complete a course."

## 6. Core product promise

Answers: "I wonder about this. I want enough context to understand it." User might want a 30-second glance, a 2-minute answer, a 10-minute exploration, or deeper learning. Curious should adapt intelligently.

## 7. What Curious is NOT

Not a course platform, LMS, generic chatbot, "ChatGPT with a nicer interface," "Google AI Mode with a different skin," a research engine, a productivity dashboard, a streak-driven learning app, a mastery platform, or an infinite-content engagement machine.

Should not optimize for "how long can we keep the user here." Instead: how much useful understanding can we create with as little unnecessary time as possible? A satisfied user leaving is a successful outcome.

## 8. Four major things Curious does

1. **Satisfy random curiosity questions** — user enters a wondering, Curious helps them understand it.
2. **Browse bite-sized curiosity topics** — for bored users wanting something interesting, feels productive without feeling like homework.
3. **Intelligent recommendations** — follow-ups, adjacent concepts, random discoveries; understands the *type* of curiosity, not just content categories.
4. **Visualize the user's curiosity** — Curiosity Map / personal curiosity graph showing what they've explored, current "muse," how interests change, how topics connect.

## 9. Two core user types

- **Wanderer** — has a specific question ("Why does a cricket ball swing?"), enters it, Curious provides a satisfying path.
- **Bored Explorer** — no specific question, wants something interesting; Curious presents suggested topics; same learning system from there.

## 10. Random curiosity / discovery

Discovery shows ~5 topics/questions. New user (no history): diverse, wildcard, exploratory. As history develops: increasingly personalized based on curiosity patterns, not just broad categories.

Original proposed mix (current direction, not permanent algorithm): 3 relevant / 1 adjacent / 1 wildcard.

Goal: recommend things the user is likely to enjoy while simultaneously learning more about what kind of curiosity they have.

## 11. Recommendation philosophy

**Do NOT use simple category buckets.** E.g., a user searching "Why did Nokia fail?", "Why did Blackberry fail?", "Why did the Roman Empire fail?", "How did Germany transform after WWII?" should NOT be bucketed as "likes business/history." Instead infer deeper patterns: transformation, failure, collapse, adaptation, recovery, systemic change after shocks. The engine should eventually understand *how* the person is curious, not merely *what* category they searched — this is "curiosity taste."

## 12. Curiosity taste

May emerge from: types of questions asked, follow-ups, depth selected, adjacent topics explored, recurring concepts, concepts revisited, relationships between topics, recommendation choices, reading behavior. Future signal (enhancement, not V1): books being read, articles saved, external reading list.

## 13. The core curiosity journey

Evolved into: **Wonder → Unpack → Explore → Connect → Explain → Wander deeper / leave satisfied.** Should not feel overly gamified.

Conceptual flow:
1. **Question** — user enters a curiosity.
2. **Interpretation** — AI determines meaning, archetype, complexity, dependencies, knowledge structure, depth recommendation, supporting concepts, likely follow-ups, visual opportunities.
3. **Recommended depth** — Get the Gist / Explore / Make It Stick. Explore is often the recommended default for meaningful questions.
4. **User explores** — information progressively reveals itself.
5. **Follow-ups / connections** — suggested questions appear; user can add their own.
6. **Deeper learning** — optional Make It Stick.
7. **Leave satisfied OR wander deeper** — never lock the user out of deeper exploration.

## 14. Three learning contracts

**Get the Gist** — quick context, target <2 minutes. Concise, few key lines, highly readable, attractive UI, visuals if useful. Many everyday curiosities end here (e.g., "Why do I see lightning before hearing thunder?").

**Explore** — recommended default for many meaningful curiosities, target ~8–12 minutes. Takes the user from zero to one; creates a useful mental model. Can use progressive disclosure, structured sections, analogies, diagrams, causal explanations, supporting concepts, discovery moments, lightweight interactions. Closer to high-quality editorial explanation than a chatbot answer.

**Make It Stick** — for stronger retention. Can be longer; complex topics broken into multiple bite-sized Explore-sized sessions (loosely compared to Duolingo-style chunking, without unnecessary gamification). Potential techniques: Feynman method, retrieval practice, prediction, reflection, application, explanation by user (voice or typed), spaced reinforcement later. AI is called for evaluation, not just more content generation. Example: after learning cricket swing, "Without looking back, can you explain why the seam is important?" — user responds by voice or text, AI evaluates.

## 15. Depth should not create decision fatigue

UI should clearly show the recommended path, but recommended ≠ mandatory. Users can switch; AI should not insist. User should understand what's recommended, roughly how long it takes, and what the other options mean — without complicated decisions.

## 16. Important UI decision about depth

Get the Gist / Explore / Make It Stick are **depth controls inside a curiosity**, not primary app navigation. Global navigation should separate: Questions/Wonder, Random Curiosity/Discover, Curiosity Map, Settings. (Important correction made after initial Stitch designs.)

## 17. Single-screen learning experience

Entering a question should already recommend a depth on the same screen (e.g., "Explore — ~10 min") with nearby controls for Get the Gist / Explore / Make It Stick. User should feel like they're changing depth of the *same* curiosity, not navigating between three unrelated screens.

## 18. Content length (current directional targets)

- Get the Gist: under ~2 minutes.
- Explore: ~8–12 minutes.
- Make It Stick: potentially longer, divided into bite-sized sessions (exact count still a design/learning question).

## 19. Follow-up questions (key USP candidate)

1. Automatically suggested follow-up questions.
2. Ability for users to add their own.
3. Adjacent-topic suggestions.

If a follow-up expands the current concept, expand the existing knowledge graph/structure rather than treating it as an unrelated answer.

## 20. Discovery moments

E.g., "This same principle explains why airplane wings generate lift" or "You're one concept away from understanding reverse swing." Point: meaningful conceptual connections that feel like discovery, not random trivia.

## 21. Knowledge archetypes

Initial list (expected to evolve): process/mechanism, causal explanation, timeline/historical evolution, comparison, system, hierarchy, decision/trade-off, conceptual explanation, practical step flow, philosophical/open-ended exploration. E.g. "How do I keep my snake plant alive?" → step-flow/practical process; "Why does a cricket ball swing?" → process/mechanism.

*(Note: this list was refined down to 7 archetypes in the 2026-09-13 working session — see `decisions-explained.md` §1 for the current locked version and the reasoning behind the change.)*

## 22. Knowledge representation

AI classifies archetype, then chooses an appropriate representation (timeline, causal graph, process flow, hierarchy, comparison, steps, conceptual map) — while maintaining one consistent overall design language rather than a separate UI per archetype.

## 23. Flexible AI output

AI should produce **rich structured knowledge**, not a fixed visual presentation — enough metadata for the frontend to render flexibly, so the UI can evolve without changing the generation format every time. **Knowledge model ≠ UI.**

Output should capture: archetype, core concepts, relationships, dependencies, complexity, difficulty, importance, estimated reading time, prerequisites, visual potential, interaction types, core takeaways, follow-up predictions, wildcard concepts, expandable sections, supporting concepts, depth suitability, confidence. Not every field needs to surface to users.

## 24. Complexity vs. difficulty

**Complexity** = how structurally complicated (concepts/relationships required). **Difficulty** = how hard it may be for a typical user to understand. These can differ — structurally complex but intuitive, or structurally simple but conceptually difficult. Can help determine recommended depth, section count, explanation style, Make It Stick recommendation — but shouldn't automatically determine UX without testing.

## 25. "Important" metadata

Helps determine what appears early, what's omittable from Gist, what's emphasized in Explore, which supporting concepts deserve attention. Should remain an implementation mechanism, not a visible user-facing concept.

## 26. Read time

Distinguish overall knowledge volume vs. depth-specific time (Gist ~45 sec / Explore ~8–12 min / Make It Stick longer) — different renderings/depths of the same underlying knowledge object, not contradictory.

## 27. Prerequisites / dependencies

Knowledge graph should encode "Concept B depends on Concept A" (e.g., inswing/outswing depends on seam orientation, ball movement, airflow, swing mechanism). Enables better progressive disclosure, follow-up handling, graph expansion, learning paths, recommendations.

## 28. Visual potential / interaction types

AI should identify whether a concept benefits from a diagram, comparison, interactive element, timeline, or process diagram — metadata for the rendering engine. Not every concept needs an interaction.

## 29. Core takeaways

May help the rendering engine determine what must survive summarization, what belongs in Gist, what's repeated in Make It Stick, what the user should remember — but don't treat as a rigid requirement if the system can derive the same info from the knowledge structure.

## 30. Follow-up prediction

AI predicts useful next questions (e.g., after cricket swing: "What happens if both sides become equally rough?" → leads to reverse swing). Follow-ups should be relevant, editable, optional, non-pushy.

## 31. Learning philosophy

Optimize for human understanding, not information volume. Potential techniques: chunking, progressive disclosure, retrieval practice, Feynman explanation, analogies, prediction, visual learning, reflection, application, spaced reinforcement — each used only because it improves understanding/retention, not injected as neuroscience-flavored decoration.

## 32. Rendering engine

Long-term: a continuously improving **Knowledge Representation & Rendering Engine** deciding what matters, what can be removed, ordering, best representation, where visual/interactive support helps, when to reveal supporting concepts, when to create a Discovery Moment, how much depth to provide. Major long-term technical/product differentiator.

## 33. Differentiation from ChatGPT / Google AI Mode

Can't win on a better model alone. Differentiate through: structured zero-to-one learning, time-bounded depth, knowledge representation, progressive disclosure, intelligent follow-ups, curiosity recommendations, discovery moments, learning/retention mechanisms, personal curiosity graph, purpose-built UI, human learning optimization.

Thesis (not proven marketing claim): **"Chatbots answer. Curious orchestrates understanding."**

## 34. Curiosity Map

Should be built before beta if feasible. Shows major learned/explored nodes, current interests, changing interests, date filtering, connections, recurring patterns. Founder's inspiration: scattered points/nodes within a brain-like outline, major nodes highlighted by date — conceptual inspiration, not locked visual design. Should stay learning/self-awareness focused, NOT productivity focused.

*(Extended in the 2026-09-13 session with a "brain dashboard" brainstorm — node sizing, time filters, and personalized motif-based titles. See `decisions-explained.md` §7 — logged as icebox, not yet built.)*

## 35. Success metrics

Insight: "The best learning products don't constantly ask whether you've learned. They observe how your curiosity evolves." Founder dislikes "Did you understand this?" after every question (friction).

Potential low-friction signals: follow-up questions, surrounding topics explored, concept connections, depth chosen, recommendation acceptance, returning to concepts, curiosity continuation.

Experimental metrics (hypotheses, not validated): Curiosity Continuation Rate, Knowledge Expansion Rate, Knowledge Reuse Rate, Concept Connectivity, Understanding per Minute.

Also track standard metrics: DAU/WAU/MAU, retention, churn, sessions, minutes, questions, completion, drop-off, recommendation acceptance, AI cost, performance. But don't optimize for minutes just because they're easy to measure.

*(This whole section was substantially refined in the 2026-09-13 session — see `decisions-explained.md` §5 for the actual locked short-term/long-term metrics and North Star.)*

## 36. Product story / pitch

1. **Problem** — abundance, fragmented attention, interrupted curiosity.
2. **Story** — kids ask random questions naturally; adults suppress/lose them.
3. **Vision** — a place where random curiosity can be satisfied; not a course, not a chatbot; a place to wander intelligently.
4. **Philosophy** — understanding over information, user time first, curiosity over obligation, zero to one, progressive depth, human learning optimization.
5. **Product vision** — curiosity questions, discovery feed, recommendations, curiosity map.
6. **User journeys** — Ask, Explore, Follow up, Discover, Map.
7. **USP** — AI interpretation, flexible knowledge representation, learning contracts, follow-up engine, discovery moments, recommendation engine, curiosity graph, neuro/cognitive-science-informed rendering.
8. **Long-term vision** — continuously improving rendering engine, personal curiosity graph, deep understanding of curiosity patterns.

## 37. Product design — major new discovery

Product and Engineering alone were insufficient. First Curious HQ UI worked functionally but looked generic/AI-generated/SaaS-dashboard-like/ugly. Lesson: **AI coding agents implement functionality well but shouldn't be expected to invent visual taste from a vague instruction like "make it beautiful."** Design is now a first-class Curious HQ workstream.

## 38. New six-workstream structure (Curious HQ)

- **PMO** — roadmap, milestones, deadlines, blockers, risks, decisions, weekly PMO, change history.
- **Product** — problem, users, vision, philosophy, journeys, requirements, learning contracts, recommendations, rendering philosophy, future ideas.
- **Design** — experience, IA, hierarchy, layout, visual language, interaction, motion, responsive/accessibility/states, references, design system, design briefs.
- **Engineering** — architecture, frontend, backend, database, AI, APIs, testing, deployment, Git, technical decisions.
- **Strategy** — positioning, Build in Public, Instagram, X, content, community, beta, distribution.
- **Monitoring** — product metrics, business metrics, learning signals, feedback, experiments, observations.

*(This section describes Curious HQ as originally conceived — a bespoke coded product. That plan was retired in the 2026-09-13 session in favor of docs living directly in this repo. See `decisions-explained.md` §8 for the full reasoning. The six categories still organize this repo's docs — they just aren't a separate app anymore.)*

## 39. The 8-bucket design framework (standard build mechanism)

1. **Experience** — calm/energetic? serious/playful? dense/spacious? editorial/tool-like? premium/utilitarian? focused/exploratory? → Output: Experience North Star.
2. **Information architecture** — primary spaces, navigation, hierarchy of sections, one-click vs. deeper, persistent vs. hidden → Output: IA.
3. **Visual hierarchy** — what the eye notices first/second/third → Output: attention model / page hierarchy.
4. **Layout & spatial system** — sidebar/top nav, column structure, content width, whitespace, density, cards vs. open sections, responsive behavior → Output: layout system.
5. **Visual language** — typography, color, spacing, shape, borders, shadows, icons, imagery (outputs of the visual language, not the whole design system).
6. **Components & interaction** — buttons, tabs, forms, search, edit mode, save state, modals, hover, expansion, loading, errors, confirmation → Output: interaction language.
7. **Motion & feedback** — motion should explain state change, not decorate → Output: motion/feedback principles.
8. **Responsive / accessibility / states** — desktop, mobile, tablet, keyboard, touch, contrast, focus, loading/empty/error states, long content, slow network, accessibility → Output: responsive/state spec.

References are cross-cutting, not a ninth bucket (Pinterest, Mobbin, Stitch, Apple, Linear, Notion, Arc, Substack, Read.cv). Don't say "make it like Linear" — instead: "I like Linear's navigation hierarchy but not its visual treatment," or "I like this screenshot's typography and content width, ignore its colors." References should communicate what we like + why + what not to copy.

Every significant experience should eventually have a **Design Brief** (Experience, IA, Visual Hierarchy, Layout, Visual Language, Components & Interactions, Motion & Feedback, Responsive/Accessibility/States, References). Process shouldn't require 100% certainty — once ~70–80% understood: prototype → inspect → learn → refine (protects against design becoming procrastination).

## 40. ChatGPT design analysis (learning example)

Reverse-engineered ChatGPT via the eight buckets to teach design thinking. Key insight: a product's design isn't "sidebar + fonts + colors," it's a system of decisions (approachable/simple experience; conversation history in nav with current conversation owning the main workspace; current task dominates hierarchy; nav without demanding attention; composer as central interaction; restrained visual language; progressive-generation interaction; motion communicates state change; handles mobile/long content/files/errors/accessibility). Lesson: a design language is the set of principles that *cause* the visual/interaction decisions, not merely font/color/radius values.

## 41. Curious HQ (original conception — see note on §38 above; retired as a build target)

Internal operating system / source of truth used to build Curious, because AI agents lose context. Provides project truth for product, design, engineering, strategy, monitoring, PMO, and AI-ready context.

**IA:** Overview, PMO, Product, Design, Engineering, Strategy, Monitoring, AI Context.

**Overview** should show: current milestone/phase, next release, status, top priorities, biggest blocker, workstream status, upcoming dates, next public content, recent important changes. Should NOT become a dense corporate dashboard / KPI wall / generic SaaS dashboard.

**PMO** must support: roadmap, milestones, target dates, status, weekly priorities, blockers, risks, decisions, weekly reviews, change history. Dates must be editable — if a date moves, the new date becomes current truth; lightweight history can retain old/new/date/reason.

**Product** sections: story, problem, Why Now, vision, philosophy, beliefs, non-goals, product pillars, user journeys, learning contracts, rendering engine, recommendation philosophy, curiosity map, requirements, future ideas. Principle: **consumption is beautiful, maintenance is easy.**

**Design** (first-class workstream): Experience North Star, IA, Visual Hierarchy, Layout System, Visual Language, Component Language, Interaction, Motion, Responsive/accessibility, reference library, design briefs, design decisions, design system.

**Engineering**: architecture, stack, frontend, backend, database, AI, schemas, APIs, deployment, testing, implementation state, technical decisions.

**Strategy**: positioning, differentiation, Build in Public, content calendar, Instagram, X, beta, community, competitor thinking, growth ideas. Posting direction: Wednesday = thinking/philosophy/design/AI/product decisions; Saturday = build progress/screenshots/experiments/failures/learnings.

**Monitoring**: business health, product health, learning intelligence, user feedback, experiments, observations. Experimental learning metrics clearly marked as hypotheses.

**AI Context** (one of the most important features) — possible context packs: Master Context (everything an agent needs), Product Context, Design Context, Engineering Context, Current Build Context (milestone/task/priorities/blockers/relevant decisions). Generated from current saved HQ state where practical — avoid manually maintaining duplicate copies of the same truth.

**Editability**: Curious HQ is NOT a static docs site — must support changing dates, requirements, priorities, blockers, risks, decisions, strategy, design principles, technical architecture. Current saved version = current truth; lightweight change tracking should exist.

**Architecture direction**: Next.js, React, TypeScript, Tailwind, Supabase, Git/GitHub, Vercel. Keep it simple — no need (yet) for complex auth, multi-user, collaboration, AI agents, automatic PMO/roadmap, Jira, GitHub project management, Codex integration, Claude API integration, enterprise doc version control.

**First build**: generated via Freebuff — created Next.js structure, `.next`, `node_modules`, `src`, Supabase folder, migrations/SQL, `.env.local`, PMO/Product/Engineering/Strategy/Monitoring/AI Context sections, README. Reported working, though at one point Claude Code flagged env vars as possibly empty/not fully connected — should be verified rather than assumed. Main problem: looked ugly/generic/AI-generated → led to the design framework above. **This build still exists at `~/curious-hq` on your machine, untouched — kept as a possible future "nice read-mode dashboard," not the active project.**

## 42. Claude Code

Purchased by the founder. Mental model: **Claude Code = senior software engineer / engineering agent**, not autocomplete. Expected to: inspect repo, understand architecture, implement, modify multiple files, run commands, test, debug, refactor, use Git, deploy, explain technical decisions. Founder intends to use it via the Claude subscription rather than a raw API key for the dev workflow (exact billing mechanics depend on plan — check current docs if needed).

**Workflow**: Product Brief → Design Brief → Engineering Brief → Current Context → Claude Code → Implement → Run → Test → Review → Commit → Push → Deploy → Observe → Iterate. Claude should implement requirements, not invent them.

**Design + Claude**: don't say "make it beautiful" or "make it look like Notion" — instead give experience direction, IA, hierarchy, layout, visual language, interaction, motion, responsive behavior, references + reasons. Claude implements design intent, doesn't invent visual taste.

## 43. Ascend as a design experiment

Considered as a controlled experiment before using Claude Code aggressively on Curious — since Ascend already exists and the founder knows what feels bad and what the intended experience was. Path: existing Ascend → design framework → Design Brief → Claude Code rebuild → Vercel. Tests: can Claude produce a major visual upgrade given good design context; can Claude manage the engineering loop with less manual intervention; can the founder communicate design intent effectively; can he still understand the architecture. Useful learning experiment — should not become a multi-week side project.

## 44. Founder OS

Broader conceptual system that emerged from Curious HQ. Potential future idea: an Ideation → Production framework helping a founder define an idea, answer product questions, create context, define design/engineering, use AI agents, deploy, monitor, iterate. Potential future integrations: Claude Code, Codex, GitHub, Vercel, other tools. Possibly, much later, a more controlled alternative to tools like Lovable (more control over what/why vs. just generating an app).

**Do not build Founder OS now.** Plan: (1) build Curious HQ, (2) build Curious, (3) use the system through September, (4) assess what worked, (5) remove unnecessary process, (6) improve Founder OS later.

*(Step 1 here has effectively changed — see §38/§41 notes above.)*

## 45. Build in public

Wants to build Curious in public — initially possibly via anonymous/separate accounts (posting from main accounts feels uncomfortable). Channels: Instagram, X/Twitter. Cadence: Wednesday + Saturday (see §41 Strategy). Objective isn't immediate influencer status — it's accountability, distribution/marketing practice, community, visible progress. Content should come from real product work.

## 46. Roadmap (original target, dates can move)

- Curious Alpha — August 22, 2026
- Friends Beta — September 5, 2026
- Enhancement Release — September 12, 2026
- Enhancement Release — September 19, 2026

If dates slip, update the source of truth — prefer scope reduction → shipping over indefinite delay. **(These dates have not been re-validated — see `../docs/roadmap.md` for the current status note.)**

## 47. Super Sprint

Previously planned two-week intensive periods: most engineering push happens, more frequent PMO tracking, daily blocker monitoring. Outside Super Sprints: weekly PMO, normal builder cadence.

## 48. Weekly PMO

Preferred: 45–60 min on Sunday. Questions: (1) What artifacts were completed? (2) What moved forward? (3) What didn't move? (4) What blocked progress? (5) What should be de-scoped? (6) What are the top 1–3 outcomes next week? (7) Which work sessions produce those outcomes? Purpose: reduce uncertainty, not judge productivity.

## 49. Builder routine

Prefers: gym 3–4x/week, protected sleep, work, family/relationships, recovery. Builder blocks protected but flexible. Typical pattern: Tuesday builder, Thursday builder, Saturday deep builder, Sunday deep builder/review. Routine should stay stable 8–12 weeks rather than being redesigned weekly.

## 50. Current execution philosophy

Founder previously procrastinated on starting Curious HQ despite extensive planning. Lesson: the system should prevent planning from becoming the work. Current philosophy: **no more tweaking unless something is broken or evidence contradicts us — build.**

## 51. Locked high-level product principles

User time is sacred. Understanding > information. Curiosity > obligation. Zero → one. Progressive depth. Recommended path, not forced path. Never lock deeper learning. Reduce decision fatigue. AI should not insist. AI should not create unnecessary uncertainty. Follow-ups should be editable. Discovery should feel meaningful. Recommendations should understand curiosity patterns. Don't optimize for screen time. Observe how curiosity evolves. UI should not feel like a chatbot. Design should serve understanding. Knowledge representation should be flexible. Product should evolve through evidence.

## 52. Core design principle

**"Curious should feel like a place to wander intelligently, not a place to study."** The user isn't necessarily saying "I want to learn" — they're saying "I wonder why..." Curious should meet them there.

## 53. Long-term vision

A **personal curiosity engine** (understands what you wonder about, patterns, how curiosity changes, what connects, what you're reading, what you might enjoy next); a **knowledge rendering engine** (continually improving structure, visualization, pacing, connections, retention support); a **personal curiosity graph** ("this is what you've been fascinated by"). NOT a productivity dashboard — it's **self-awareness through curiosity.**

## 54. Current build priority

**NOW**: Curious. **NEXT**: future enhancements based on evidence. **LATER**: Founder OS. Do not let Founder OS become the project. *(Originally read "Curious, supported by Curious HQ" — HQ is no longer a separate build target, see §38/§41.)*

## 55. How to challenge the founder

When he proposes a feature, ask: (1) What user problem does it solve? (2) How will success be measured? (3) Can a simpler version test the same idea? Challenge assumptions, point out risks, suggest simpler versions, push toward shipping — but don't endlessly reopen settled decisions.

## 56. Open questions (resolve via building/testing, not theorizing)

Exact archetype list; exact AI metadata schema; exact recommendation algorithm; exact Curiosity Map visualization; Make It Stick session count; exact neuroscience techniques; exact design language; exact metrics; exact beta feedback mechanism; exact AI model/cost optimization; exact frontend implementation. Prefer: build → test → observe → decide.

*(Most of these were resolved in the 2026-09-13 session — see `decisions-explained.md` for the full record of what got decided and why. Still genuinely open: exact design language, exact AI model/cost choice, exact frontend implementation.)*

## 57. AI / engineering direction

Earlier tech thinking: Supabase, Vercel, Groq, DeepSeek or other low-cost models. Primary constraint: build a good-enough product at essentially zero cost for ~10 trusted users. Choose AI provider based on quality, structured-output reliability, cost, latency, free/cheap availability. Don't over-engineer infrastructure for 10 users.

**High-level pipeline**: User Question → Interpretation Engine → Archetype Classification → Knowledge Architecture → Rich Structured Knowledge → Rendering Engine → Get the Gist / Explore / Make It Stick.

**Follow-up pipeline**: User Follow-up → determine if it expands current knowledge → if yes, expand existing graph/structure; if no, create connected knowledge.

**Make It Stick pipeline**: Existing Knowledge → user explains/speaks → AI evaluation → feedback → retention.

**Cost philosophy**: prefer one rich AI generation call for the main knowledge object, then render different depths from that structure. Avoid separate calls per depth unless necessary. Additional calls only for new information, follow-ups, evaluation, genuinely dynamic needs (reduces cost, latency, inconsistency).

## 58. The core product loop

WONDER → UNDERSTAND → CONNECT → EXPLAIN → DISCOVER → WANDER DEEPER → SATISFIED. User is never forced to continue.

## 59. The product's "aha" moment

Beyond "here's an AI-generated answer": auto-suggested follow-ups, user-created follow-ups, Discovery Moments (cross-domain connections), knowledge graph expansion (visible growth), Make It Stick (user explains it themselves). Combined effect should make Curious feel meaningfully different from a chatbot.

## 60. Final operating model

CURIOUS (Product → Design → Engineering → Strategy → Monitoring → Iteration). *(Originally also listed a separate CURIOUS HQ and FOUNDER OS layer — HQ is retired as a build target; Founder OS remains a future, non-current idea.)*

## 61. The single most important principle

**"Curious is not trying to give people more information. Curious is trying to help people understand what they are curious about, in the least unnecessary time, while making the journey interesting enough that curiosity naturally continues when the user wants it to."**

For the process: **Product defines what and why. Design defines how the experience communicates it. Engineering makes it work. Strategy gets it into people's hands. Monitoring tells us whether it actually works.**

*Originally captured August 11, 2026. Annotated 2026-09-13 to reflect what's changed since — see `decisions-explained.md` for the full record of that session.*
