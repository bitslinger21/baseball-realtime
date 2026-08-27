# Landing page (Today's games) — post-sync changes

**Design source:** `holistic/landing.jsx` + `holistic/scoring-widget.jsx` (in `Holistic.html`)
**Date:** Aug 25, 2026 · **Ungated** — no new API, no new data
**Scope:** `client/src/pages/DailyGamesPage.tsx` + `pages/dailyGames/*` only

This is the result of a design↔app reconciliation. The app was treated as source of
truth for implementation detail, and the design was updated to match it (filter
counts, section labels with counts, centered live flex-wrap, the fixed page shell,
card internals, and the widget's six slide bodies). **Those need no work — they
already agree.**

What follows is the remaining delta, where the app changes to match a signed-off
design decision.

Two cross-cutting changes are **deliberately NOT in this PR** — the two-line global
header and the 1240/28 content column. They touch `PageTitle`, `.page-container`
and every page, so they ship as one sweep after all screens are synced. Do not
start them here.

---

## 1. Remove the Late-game feature entirely

Decision: reverses migration decision #2 (which had kept it as a filter chip).
The label never said what it did, there was no count so pressing it could silently
empty the section, and it carried an emoji.

- Delete the `filter-strip__late` button from `FilterStrip.tsx`, its `lateFocus` /
  `onLateFocusToggle` props, and the `.filter-strip__late*` CSS.
- Remove the late-focus state and filtering logic from `DailyGamesPage.tsx`.
- `FilterStrip` keeps only the `Segmented` control (All / Live · N / Final · N /
  Upcoming · N), left-aligned.

## 2. One `Enter game →` verb on all three game slots

Decision (from the Team Page work): every game slot navigates to the same place,
so it carries the same verb. Today only the live card has one — and that card is
dead code (see §3).

- `GameCardFinal` and `GameCardUpcoming`: add `Enter game →` to the footer row,
  right-aligned, rust (`--color-accent`), 12.5px/700, `white-space: nowrap`.
  Final keeps its recap text to its left; Upcoming keeps the venue to its left.
- The **live widget** gets the verb in a wrapper **below** the 425×195 frame —
  not inside it (no room, and it would collide with the slide content). Right-
  aligned, 8px above, same type treatment. See `LiveWidget` in
  `holistic/scoring-widget.jsx`.
- The whole card / widget stays clickable; the verb is the visible affordance, not
  the only hit target.

## 3. Delete `GameCardLive.tsx` (+ `.css`) — dead code

`DailyGamesPage.tsx` imports `ScoringWidget` and never imports `GameCardLive`.
Live games are widgets. Confirmed by repo read, Aug 25 2026.

## 4. Remove the Matchup slide from the widget

Decision: it repeats what the Front slide already shows and doesn't earn a slide.

- Delete the `si === 2` branch in `ScoringWidget.tsx` and the
  `/* SLIDE 2 — Matchup detail */` CSS block (`.sw-info-*`).
- `CARD_COUNT` 7 → 6. `CLONE_ORDER` derives from it, so nothing else changes.
- Final slide order: **Front · Line score (R/H/E) · Win Prob · Pitch Mix · Field ·
  Weather.**

## 5. Replace the `SAMPLE_*` fallbacks with empty states

Today, when win prob / pitch mix / field / weather are missing, the widget renders
**fabricated** numbers (`SAMPLE_WIN_PROB`, `SAMPLE_PITCH_MIX`, `SAMPLE_FIELD_CARD`,
`SAMPLE_WEATHER`) with a `SAMPLE` badge as the only signal. The badge was a debug
aid; removing it alone would leave invented pitch mixes and win probabilities
looking real.

- Delete the four `SAMPLE_*` constants, the `effective*` coalescing, the
  `isSample*` flags, the `.sw-sample-badge` markup and CSS.
- Each slide renders its own empty state when its data is null — reuse the existing
  `.sw-wp-empty` treatment (centered, 12px, `--color-text-muted`): "No data yet"
  for win prob, "No pitch data yet" for pitch mix, "No park data" for field,
  "No weather yet" for weather.

## 6. Team-colour left border 3px → 4px

Migration decision #6. Applies to the score/team rows in `GameCardFinal` and
`GameCardUpcoming` (the design also adds the border to Upcoming's team rows,
which currently have none).

## 7. Type sizes up

- `.page-title-row__heading` 24px → **28px**
- `.dgp-section__label` 18px → **20px**

## 8. Fix the wind readout clipping (Weather slide)

Currently unreadable at 425px: `.sw-wx-wind-field` is a fixed `width: 150px` inside
a `flex: 1` column that only has ~195px after the 100px temp and 130px conditions
columns, so the wind speed / direction column collapses to a few px and is hidden
by `overflow: hidden`.

Fix as in the design:
- `.sw-wx-wind-field`: `flex: 1; min-width: 104px; overflow: hidden` (drop the
  fixed width).
- `.sw-wx-wind-info`: `min-width: 60px; flex-shrink: 0`.
- `.sw-wx-cond`: `flex: 0 0 118px` (was 130) with `padding: 12px 12px`.
- `.sw-wx-wind-streaks`: position it **relative to the field box** —
  `position: absolute; inset: 0; width: 100%; height: 100%` with
  `preserveAspectRatio="xMidYMid meet"` on the `viewBox="0 0 80 80"`, and drop
  `overflow: visible` plus the `top: 15px / left: 35px / width: 80px` offsets.
  Those offsets assumed the 150px field; with a flexible field they overflow into
  the readout.

---

## Not in scope / deferred

- **Two-line global header + slide-in nav drawer** — logo and hamburger move out of
  `PageTitle` into a global header row. One sweep, after all screens are synced.
- **1240/28 content column** (`.page-container` is 1200/16 today) — same sweep.
- **Styled date picker** — being designed next; the current controls stay as-is
  (`← Prev` / mono date / `Next →`, with `Today` shown only when the selected day
  isn't today).
- **Weather-slide condition emoji** (`conditionEmoji()`) — kept for now by decision;
  revisit after the full sync.

## Files

- `pages/DailyGamesPage.tsx`, `pages/DailyGamesPage.css`
- `pages/dailyGames/FilterStrip.tsx` + `.css`
- `pages/dailyGames/GameCardFinal.tsx` + `.css`
- `pages/dailyGames/GameCardUpcoming.tsx` + `.css`
- `pages/dailyGames/GameCardLive.tsx` + `.css` — **delete**
- `pages/dailyGames/ScoringWidget.tsx` + `.css`
- `components/primitives/PageTitle.css` (§7 heading size only)
