---
version: alpha
name: MacroMom
description: Warm, encouraging design system for a dining-hall macro-nutrition app that feels like a caring mom in your pocket.
colors:
  primary: '#E85440'
  on-primary: '#FFFFFF'
  primary-hover: '#CE4634'
  primary-bright: '#FF6F5E'
  accent: '#F2A65A'
  on-accent: '#2E2A26'
  accent-hover: '#E5924A'
  surface: '#FFF9F3'
  surface-raised: '#FFFFFF'
  surface-sunken: '#F7EEE4'
  on-surface: '#2E2A26'
  on-surface-muted: '#726A61'
  border: '#EADFD2'
  success: '#3E9E6E'
  on-success: '#FFFFFF'
  warning: '#E8A317'
  on-warning: '#2E2A26'
  error: '#B3261E'
  on-error: '#FFFFFF'
  info: '#3E86C4'
  on-info: '#FFFFFF'
typography:
  display:
    fontFamily: Nunito
    fontSize: 34px
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: -0.02em
  h1:
    fontFamily: Nunito
    fontSize: 28px
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: -0.01em
  h2:
    fontFamily: Nunito
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.25
  h3:
    fontFamily: Nunito
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.3
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.2
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.35
  numeric:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.1
    fontFeature: 'tnum'
rounded:
  sm: 8px
  md: 14px
  lg: 20px
  xl: 28px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label}'
    rounded: '{rounded.full}'
    padding: '{spacing.md}'
    height: 52px
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label}'
    rounded: '{rounded.full}'
    padding: '{spacing.md}'
    height: 52px
  button-primary-disabled:
    backgroundColor: '{colors.border}'
    textColor: '{colors.on-surface-muted}'
    typography: '{typography.label}'
    rounded: '{rounded.full}'
    padding: '{spacing.md}'
    height: 52px
  button-secondary:
    backgroundColor: '{colors.surface-sunken}'
    textColor: '{colors.primary}'
    typography: '{typography.label}'
    rounded: '{rounded.full}'
    padding: '{spacing.md}'
    height: 52px
  input-text:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.md}'
    padding: '{spacing.md}'
    height: 52px
  card:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.on-surface}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: '{spacing.lg}'
  rec-card:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.on-surface}'
    typography: '{typography.body}'
    rounded: '{rounded.xl}'
    padding: '{spacing.lg}'
  chip:
    backgroundColor: '{colors.surface-sunken}'
    textColor: '{colors.on-surface}'
    typography: '{typography.caption}'
    rounded: '{rounded.full}'
    padding: '{spacing.sm}'
  chip-selected:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.on-accent}'
    typography: '{typography.caption}'
    rounded: '{rounded.full}'
    padding: '{spacing.sm}'
  list-row:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.md}'
    padding: '{spacing.md}'
  segmented-control:
    backgroundColor: '{colors.surface-sunken}'
    textColor: '{colors.on-surface-muted}'
    typography: '{typography.label}'
    rounded: '{rounded.full}'
    padding: '{spacing.xs}'
    height: 40px
  badge-macro:
    backgroundColor: '{colors.surface-sunken}'
    textColor: '{colors.on-surface}'
    typography: '{typography.caption}'
    rounded: '{rounded.sm}'
    padding: '{spacing.xs}'
---

# MacroMom Design System

## Overview

MacroMom is a native iOS app that turns a college dining hall's daily menu into a personalized, goal-based meal plan, delivered in the voice of a warm, encouraging "macro-nutrition mom." The people using it are health-minded students — a sorority beachhead plus fitness-focused students and guys who lift — who open the app quickly, daily, at the point of eating. The system should feel warm, encouraging, and effortless: like a caring text from someone who's rooting for you, never like a clinical tracker or a spreadsheet. Two anti-patterns to guard against above all: it must never feel judgmental or shaming, and it must never bury the student in numbers. Warmth and clarity win over data density every time.

## Colors

The palette is built on warmth. `surface` is a soft cream (`#FFF9F3`) rather than stark white, so the whole app feels homey and low-glare; `surface-raised` (pure white) lifts cards above it, and `surface-sunken` gives inset controls a gentle recess. `primary` is a rich, accessible coral (`#E85440`) used for the main calls to action — it carries `on-primary` white text at WCAG AA. `primary-bright` (`#FF6F5E`) is the vivid coral reserved for decoration, illustration, and large non-text brand moments where contrast rules don't apply. `accent` is a warm amber (`#F2A65A`) for secondary emphasis and selected states, always paired with dark `on-accent` text. Body text is a soft espresso (`#2E2A26`) rather than pure black, which reads warmer on cream while still clearing AA comfortably; `on-surface-muted` handles secondary text. Semantic colors — `success` green for wins, `warning` amber, `error` a deep berry-red kept distinct from the coral brand color, and `info` blue — are used sparingly and only for meaning. All text pairings meet WCAG AA (4.5:1 for body, 3:1 for large text).

## Typography

Two families create the personality-plus-clarity balance the brand needs. **Nunito** — a rounded, humanist sans — carries all display and heading levels; its soft terminals are what make headings feel warm and human, like the "mom" voice made visual. **Inter** handles body, labels, captions, and UI text for its excellent small-size legibility. The scale runs `display` (34px, for celebratory moments like the targets reveal) → `h1`/`h2`/`h3` for screen and section titles → `body-lg`/`body` for content, with `body-lg` preferred in primary reading contexts. `label` is the semibold button/UI text, `caption` handles metadata and chips, and `numeric` is a dedicated tabular-figures style (`tnum`) for macro numbers so digits align in rows and rings. Headings use slight negative letter-spacing to feel polished; body stays neutral.

## Layout

Spacing follows a strict 4px base scale (`xs` 4 → `sm` 8 → `md` 16 → `lg` 24 → `xl` 32 → `2xl` 48), which keeps rhythm consistent and gives an AI implementer unambiguous choices. Density is comfortable-to-generous: this is a glanceable, one-decision-at-a-time app, not a dashboard, so screens breathe. The default screen padding is `lg` (24px) on the horizontal edges; cards use `lg` internal padding, and stacked content separates by `md`. Content is single-column and mobile-first — one clear focal element (today's recommendation) should own each screen, with secondary actions below the fold or in the tab bar.

## Elevation & Depth

Depth is soft and warm, not sharp. Cards lift off the cream surface with a gentle, low-opacity shadow (a warm-tinted `rgba(46,42,38,0.06)` blur, not a hard gray drop shadow), reinforcing the friendly, tactile feel. Use at most two elevation levels: resting cards and a slightly stronger lift for modals/sheets and the active recommendation. Inset controls (segmented control, chips, inputs) use `surface-sunken` plus a hairline `border` instead of shadow, so recessed and raised elements read distinctly. Never stack heavy shadows or use dark, high-contrast drop shadows — they'd break the soft mood.

## Shapes

Roundness is core to the warmth. The `rounded` scale runs `sm` 8px → `md` 14px → `lg` 20px → `xl` 28px → `full` (pill). Primary and secondary buttons are fully rounded pills, which feel friendly and tappable. Cards use `lg`, and the hero recommendation card uses `xl` for extra softness and prominence. Chips, the segmented control, and avatars are pill/`full`. Inputs sit at `md` — rounded enough to feel soft, square enough to read as fields. Sharp 0px corners are never used; nothing in MacroMom should feel hard-edged or industrial.

## Components

`button-primary` is a coral pill with white `label` text and a 52px height for a confident, easy tap; `button-primary-hover` deepens to `primary-hover`, and `button-primary-disabled` drops to a muted `border` fill. `button-secondary` is a soft `surface-sunken` pill with coral text (add a 1px `border` in the primary color at low opacity for definition). `input-text` is a white field at `md` radius with generous padding. `card` and the hero `rec-card` are white, rounded (`lg`/`xl`), softly shadowed containers — the rec-card holds the plate items, a `badge-macro` row of tabular macro values, and the one-line "why." `chip` (unselected `surface-sunken`) and `chip-selected` (amber `accent`) drive goal and tag selection. `list-row` is used in Settings and Progress. `segmented-control` handles meal-period/hall switching on a sunken pill track with the active segment filled white and coral-texted. Macro numbers everywhere use the `numeric` (tabular) style. States: interactive elements get a clear hover/pressed shade, a visible focus ring in `primary` for accessibility, and a muted disabled treatment — never rely on color alone to signal state.

## Do's and Don'ts

**Do:**

- Lead with warmth and encouragement — copy and visuals should feel like a proud, caring mom.
- Keep one clear decision per screen; make today's recommendation the obvious focal point.
- Use the cream `surface` as the app background and reserve pure white for raised cards.
- Use `numeric` tabular figures for all macro/portion numbers so they align cleanly.
- Reserve `primary` coral for the single most important action on a screen.
- Meet WCAG AA on every text pairing; pair every colored surface with its `on-` token.

**Don't:**

- Don't shame, nag, or use red/error styling to punish a missed goal — misses are handled gently.
- Don't overwhelm with dense data tables, tiny stats, or dashboard-style charts.
- Don't use hard-edged corners, heavy dark shadows, or stark pure-white backgrounds.
- Don't use `primary-bright` for text or on small text backgrounds (decorative only — it fails contrast).
- Don't introduce cool grays or clinical blues as dominant colors; keep the palette warm.
- Don't stack multiple coral CTAs competing for attention in one view.
