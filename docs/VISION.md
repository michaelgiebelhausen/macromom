# Vision — MacroMom

> Captured by the Product Planner skill. This file is the source of truth for
> generating product-vision.md, prd.md, and product-roadmap.md. Edit it directly
> and re-run the Product Planner to regenerate downstream documents.

**Created:** 2026-07-01
**Updated:** 2026-07-01

## Founder

- **Name:** Mike
- **Expertise:** Non-technical founder and product/vision driver, building apps with AI. His wife, Alyssa, is a certified macro-nutrition consultant and serves as the domain expert behind the app's methodology.
- **Background:** The idea was sparked when Mike's son started college at Clemson in fall 2026 — a real, personal user facing the exact problem MacroMom solves. Alyssa's credential as a certified macro-nutrition consultant gives the product genuine authority and a proven methodology, and inspired the "macro-nutrition mom" persona at its core.

## Purpose

- **Who you help:** Health-minded college students on residential meal plans who want to eat well and get fit but don't know much about nutrition. Beachhead: sorority women at Clemson; also fitness-minded students and guys who lift.
- **Problem you solve:** Students eating in campus dining halls don't know what to eat to hit their goals. They guess, chase trends (all-protein-everything), or overcorrect into under-eating (sad salads) — all without any real nutrition knowledge.
- **Desired transformation:** Before: overwhelmed and guessing at the dining hall, defaulting to comfort food or the wrong "healthy" choices. After: walks in knowing exactly what to grab, makes steady progress toward fitness goals, and picks up real nutrition knowledge as a byproduct.
- **Why you:** Mike's wife Alyssa is a certified macro-nutrition consultant — the product's methodology and credibility come straight from her. Mike's son heading to Clemson gives him a real design-partner user and a concrete deadline (fall move-in).

## Product

- **Name:** MacroMom
- **One-liner:** MacroMom turns your college dining hall menu into a personalized, goal-based meal plan.
- **How it works:** The student sets a goal during onboarding (lose fat / build muscle / maintain / eat healthier) and gets calculated macro targets based on Alyssa's methodology. MacroMom pulls today's live menu from their dining hall(s) and proactively messages a few ready-to-plate meal options that fit their goals. The student walks in, plates it, snaps a photo to check portion sizes, logs it, and tracks progress over time — all with near-zero effort.
- **Key capabilities:**
  - Goal-based onboarding with calculated macro targets (Alyssa's methodology)
  - Proactive daily dining-hall meal recommendations built from today's real menu (the magic moment)
  - Menu-aware macro matching with per-item macros
  - Portion-check camera — photograph your plate for portion-size feedback
  - Daily logging and progress tracking toward goals
- **Platform:** mobile
- **Market differentiation:** MacroMom is built from _your actual dining hall's live menu_ — not a generic food database — so it tells you what to eat from what's literally being served today. Paired with the emotional hook of a caring "mom" looking out for you, it delivers proactive, zero-effort guidance instead of the tedious manual logging every other tracker demands.
- **Magic moment:** MacroMom messages you with a few ready-to-plate meal options for today at your dining hall; you walk in, plate it, and snap a pic to check your portions — no thinking required.

## Audience

- **Primary user:** A health-minded college student (e.g. a Clemson sorority sophomore) who wants to eat well and stay fit but doesn't know nutrition. She's on a residential meal plan, cares about her body composition, and is tired of guessing. She buys and sets up the app herself.
- **Secondary users:**
  - Student athletes — already macro-aware, want their dining hall's data made usable
  - Fitness-minded students / guys who lift and want to eat right (not necessarily in Greek life)
  - Parents — seeking peace of mind that their kid is eating well; may discover, recommend, or gift the app
- **Current alternatives:** Guessing / eating on vibes and defaulting to comfort food, manually logging in MyFitnessPal (tedious, abandoned within a week), following generic TikTok/Instagram nutrition trends, or texting a parent "is this healthy?"
- **Frustrations:** Existing trackers rely on generic databases and tedious manual entry; nothing is campus- or dining-hall-specific; advice isn't grounded in real knowledge, so students guess wrong — under-eating, sad salads, or chasing trends that don't fit their goals.

## Business

- **Revenue model:** subscription
- **90-day goal:** Ship v1 to the App Store and get it live with Mike's son plus one sorority at Clemson — design-partner mode with real users and a tight feedback loop.
- **6-month vision:** Proven at Clemson (a few hundred users) with the dining-hall scraping generalized so 5–10 more campuses can be added.
- **Constraints:** No hard limits, but the target is roughly one month to launch — live before fall move-in (early August 2026). Non-technical founder building solo with an AI coding agent (Claude Code + Fable 5). Pricing target ~$6.99/month or $39.99/year with a free trial (tunable).
- **Go-to-market:** Beachhead through Clemson Greek life — word of mouth spreads fast in tightly-networked sorority communities, seeded by Mike's son. Expand outward to fitness-minded students and other large residential campuses.

## Brand Voice

- **Personality:** Warm, encouraging cheerleader mom who happens to be a certified nutrition consultant — genuinely proud of you and rooting for you. Judgment-free, supportive, and credible. Never nags, never overwhelms.
- **Tone of voice:** Cheerful, warm, and personal, but clean and restrained — no over-the-top emojis. The friendly mom voice shows up in greetings and nudges; the actual numbers (macros, portions) stay clear and precise. Example nudge: "Morning! The grilled chicken and roasted veggies are your best bet today — that'll get you right to your protein goal." Example encouragement: "You've hit your protein target three days running. So proud of you — keep it going."

> Visual identity (mood, anti-patterns, design tokens) is deliberately not
> captured here — it lives in docs/design.md, generated by the Design System
> skill from image references.

## Tech Stack

- **App type:** mobile
- **Frontend:** Expo / React Native — strongest AI-coding-tool fluency, ships iOS now and Android later from one codebase, and cloud builds via EAS mean no Mac is strictly required to ship
- **Backend:** Supabase — the founder already has a subscription; Postgres, auth, file storage, and scheduled edge functions cover the backend, the daily menu-scraping jobs, and photo storage in one platform
- **Database:** Supabase Postgres — a relational model fits the structured dining-hall menu data (halls → meals → stations → items → nutrition) cleanly
- **Auth:** Supabase Auth (Sign in with Apple + email) — bundled with the backend; Apple sign-in is expected on iOS
- **Payments:** RevenueCat (over Apple In-App Purchase) — Apple requires IAP for in-app digital subscriptions; RevenueCat handles free trials, receipts, and subscription state. Stripe is reserved for a future web signup flow.
- **AI:** OpenRouter (default model: Anthropic Claude) — a single server-side API for both meal recommendations and portion-photo vision analysis, with model swapping via config so there's no lock-in
- **Analytics:** PostHog — free tier covers early volume; product analytics and funnels to watch the magic-moment conversion
- **Email:** Resend — transactional email for account flows and receipts
- **Error tracking:** Sentry — catch crashes in production before users report them

## Tooling

- **Coding agent:** Claude Code (model: Fable 5)
